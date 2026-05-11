import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { updateSpeaker } from '../services/speaker.service';
import crypto from 'crypto';

const schema = z.object({
  speakerId:   z.string().uuid(),
  firstName:   z.string().optional(),
  lastName:    z.string().optional(),
  email:       z.string().email().optional(),
  phoneNumber: z.string().optional(),
  company:     z.string().optional(),
});

export const startSpeakerUpdatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.speaker.updated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.speaker.updated');

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

      const data    = await parseXml(xml, 'SpeakerUpdated');
      const speaker = schema.parse(data);

      await updateSpeaker(speaker.speakerId, {
        firstName:   speaker.firstName,
        lastName:    speaker.lastName,
        email:       speaker.email,
        phoneNumber: speaker.phoneNumber,
        company:     speaker.company,
      });

      await markAsProcessed(messageId);
      console.log('[Frontend] Spreker gewijzigd via consumer');
      channel.ack(msg);
    } catch (err) {
      console.error('[Frontend] Fout in frontend.speaker.updated:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.speaker.updated'
      );
      channel.ack(msg);
    }
  });
};