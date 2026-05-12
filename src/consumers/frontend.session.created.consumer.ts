import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { log } from '../utils/logger';
import { createSession } from '../services/session.service';
import crypto from 'crypto';

const schema = z.object({
  sessionId:  z.string().uuid().optional(),
  title:      z.string(),
  date:       z.string(),
  startTime:  z.string(),
  endTime:    z.string(),
  capacity:   z.preprocess((v) => Number(v), z.number().int().positive()),
  locationId: z.string().optional(),
});

export const startFrontendSessionCreatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.session.created';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.session.created');

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

      const data    = await parseXml(xml, 'SessionCreated');
      const session = schema.parse(data);

      await createSession({
        title:      session.title,
        date:       session.date,
        startTime:  session.startTime,
        endTime:    session.endTime,
        capacity:   session.capacity,
        locationId: session.locationId,
      });

      await markAsProcessed(messageId);
      log.info('[FRONTEND] Sessie aangemaakt');
      channel.ack(msg);
    } catch (err) {
      log.error('[FRONTEND] Fout in frontend.session.created:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.session.created'
      );
      channel.ack(msg);
    }
  });
};