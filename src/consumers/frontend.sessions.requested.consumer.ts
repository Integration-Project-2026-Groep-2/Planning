import { getChannel } from '../rabbitmq';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { log } from '../utils/logger';
import { getAllSessions } from '../services/session.service';
import crypto from 'crypto';

export const startFrontendSessionsRequestedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'session.topic';
  const queue = 'planning.sessions.requested';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.sessions.requested');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const messageId = msg.properties.messageId || crypto.randomUUID();
    const replyTo = msg.properties.replyTo;
    const correlationId = msg.properties.correlationId;

    try {
      const alreadyProcessed = await isAlreadyProcessed(messageId);
      if (alreadyProcessed) {
        channel.ack(msg);
        return;
      }

      const sessions = await getAllSessions();

      if (replyTo) {
        const payload = Buffer.from(JSON.stringify(sessions));
        channel.sendToQueue(replyTo, payload, {
          correlationId,
          persistent: true,
        });
      }

      await markAsProcessed(messageId);
      log.info('[FRONTEND] Sessies teruggestuurd');
      channel.ack(msg);
    } catch (err) {
      log.error('[FRONTEND] Fout in frontend.sessions.requested:', err);

      await sendToDlq(
        '',
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.sessions.requested'
      );
      channel.ack(msg);
    }
  });
};