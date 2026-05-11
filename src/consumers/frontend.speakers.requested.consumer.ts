import { getChannel } from '../rabbitmq';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { getAllSpeakers } from '../services/speaker.service';
import { buildXml } from '../utils/xml.builder';
import crypto from 'crypto';

export const startSpeakersRequestedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.speakers.requested';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.speakers.requested');

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

      const speakers = await getAllSpeakers();

      //Stuur alle sprekers terug naar de frontend exchange 
      const replyExchange = 'frontend.topic';
      const replyKey      = 'planning.speakers.response';

      await channel.assertExchange(replyExchange, 'topic', { durable: true });

      const responseXml = buildXml('SpeakersResponse', {
        speakers: speakers.map((spk: any) => ({
          speakerId:   spk.speakerId,
          firstName:   spk.firstName,
          lastName:    spk.lastName,
          email:       spk.email,
          phoneNumber: spk.phoneNumber,
          company:     spk.company,
          isActive:    spk.isActive,
        })),
      });

      channel.publish(replyExchange, replyKey, Buffer.from(responseXml), {
        contentType: 'application/xml',
        persistent:  true,
      });

      await markAsProcessed(messageId);
      console.log('[Frontend] Sprekers teruggestuurd via consumer');
      channel.ack(msg);
    } catch (err) {
      console.error('[Frontend] Fout in frontend.speakers.requested:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.speakers.requested'
      );
      channel.ack(msg);
    }
  });
};