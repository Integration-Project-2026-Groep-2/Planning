import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { deleteLocation } from '../services/location.service';
import crypto from 'crypto';

const schema = z.object({
  locationId: z.string().uuid(),
});

export const startLocationDeletedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.frontend.location.deleted';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.location.deleted');

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

      const data     = await parseXml(xml, 'LocationDeleted');
      const location = schema.parse(data);

      await deleteLocation(location.locationId);

      await markAsProcessed(messageId);
      console.log('[Frontend] Locatie verwijderd via consumer');
      channel.ack(msg);
    } catch (err) {
      console.error('[Frontend] Fout in frontend.location.deleted:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.location.deleted'
      );
      channel.ack(msg);
    }
  });
};