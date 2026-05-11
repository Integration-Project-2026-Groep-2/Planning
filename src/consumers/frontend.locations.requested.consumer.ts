import { getChannel } from '../rabbitmq';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { getAllLocations } from '../services/location.service';
import { buildXml } from '../utils/xml.builder';
import crypto from 'crypto';

export const startLocationsRequestedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.locations.requested';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.locations.requested');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const xml       = msg.content.toString();
    const messageId = msg.properties.messageId || crypto.randomUUID();

    try {
      const alreadyProcessed = await isAlreadyProcessed(messageId);
      if (alreadyProcessed) {
        channel.ack(msg);
        return;
      }

      const locations = await getAllLocations();

      // Stuur alle locaties terug naar de frontend exchange
      const replyExchange = 'frontend.topic';
      const replyKey      = 'planning.locations.response';

      await channel.assertExchange(replyExchange, 'topic', { durable: true });

      const responseXml = buildXml('LocationsResponse', {
        locations: locations.map((loc: any) => ({
          locationId: loc.locationId,
          roomName:   loc.roomName,
          address:    loc.address,
          capacity:   loc.capacity,
          status:     loc.status,
        })),
      });

      channel.publish(replyExchange, replyKey, Buffer.from(responseXml), {
        contentType: 'application/xml',
        persistent:  true,
      });

      await markAsProcessed(messageId);
      console.log('[Frontend] Locaties teruggestuurd via consumer');
      channel.ack(msg);
    } catch (err) {
      console.error('[Frontend] Fout in frontend.locations.requested:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.locations.requested'
      );
      channel.ack(msg);
    }
  });
};