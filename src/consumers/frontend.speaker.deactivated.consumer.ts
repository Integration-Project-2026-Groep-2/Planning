import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { log } from '../utils/logger';
import { deactivateSpeaker } from '../services/speaker.service';
import crypto from 'crypto';

const schema = z.object({
  speakerId: z.string().uuid(),
});

export const startSpeakerDeactivatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.speaker.deactivated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.speaker.deactivated');

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

      const data    = await parseXml(xml, 'SpeakerDeactivated');
      const speaker = schema.parse(data);

      await deactivateSpeaker(speaker.speakerId);

      await markAsProcessed(messageId);
      log.info('[Frontend] Spreker gedeactiveerd via consumer');
      channel.ack(msg);
    } catch (err) {
      log.error('[Frontend] Fout in frontend.speaker.deactivated:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.speaker.deactivated'
      );
      channel.ack(msg);
    }
  });
};