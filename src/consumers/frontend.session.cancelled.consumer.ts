import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { cancelSession } from '../services/session.service';
import crypto from 'crypto';

const schema = z.object({
  sessionId: z.string().uuid(),
});

export const startFrontendSessionCancelledConsumer = async () => {
  const channel = getChannel();

  const exchange = 'session.topic';
  const queue = 'planning.session.cancelled';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.session.cancelled');

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

      const data = await parseXml(xml, 'SessionCancelled');
      const session = schema.parse(data);

      await cancelSession(session.sessionId);

      await markAsProcessed(messageId);
      console.log('[FRONTEND] Sessie geannuleerd');
      channel.ack(msg);
    } catch (err) {
      console.error('[FRONTEND] Fout in frontend.session.cancelled:', err);

      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.session.cancelled'
      );
      channel.ack(msg);
    }
  });
};