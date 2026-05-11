import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { updateSession } from '../services/session.service';
import crypto from 'crypto';

const schema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  capacity: z.number().optional(),
  locationId: z.string().optional(),
});

export const startFrontendSessionUpdatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'session.topic';
  const queue = 'planning.session.updated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.session.updated');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const xml = msg.content.toString();
    const messageId = msg.properties.messageId || crypto.randomUUID();

    try {
      const alreadyProcessed = await isAlreadyProcessed(messageId);
      if (alreadyProcessed) {
        channel.ack(msg);
        return;
      }

      const data = await parseXml(xml, 'SessionUpdated');
      const session = schema.parse(data);

      await updateSession(session.sessionId, session);

      await markAsProcessed(messageId);
      console.log('[FRONTEND] Sessie bijgewerkt');
      channel.ack(msg);
    } catch (err) {
      console.error('[FRONTEND] Fout in frontend.session.updated:', err);

      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.session.updated'
      );
      channel.ack(msg);
    }
  });
};