import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { createSpeaker } from '../services/speaker.service';
import crypto from 'crypto';

const schema = z.object({
  firstName:   z.string(),
  lastName:    z.string(),
  email:       z.string().email(),
  phoneNumber: z.string().optional(),
  company:     z.string().optional(),
});

export const startSpeakerCreatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.speaker.created';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.speaker.created');

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

      const data    = await parseXml(xml, 'SpeakerCreated');
      const speaker = schema.parse(data);

      await createSpeaker({
        firstName:   speaker.firstName,
        lastName:    speaker.lastName,
        email:       speaker.email,
        phoneNumber: speaker.phoneNumber,
        company:     speaker.company,
      });

      await markAsProcessed(messageId);
      console.log('[Frontend] Spreker aangemaakt via consumer');
      channel.ack(msg);
    } catch (err) {
      console.error('[Frontend] Fout in frontend.speaker.created:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.speaker.created'
      );
      channel.ack(msg);
    }
  });
};