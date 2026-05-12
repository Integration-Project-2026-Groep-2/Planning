import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { log } from '../utils/logger';
import { query } from '../db';
import { registerParticipant } from '../services/registration.service';
import { sendRegistrationConfirmed } from '../producers/planning.registration.confirmed.producer';
import crypto from 'crypto';

const schema = z.object({
  sessionId:   z.string().uuid(),
  crmMasterId: z.string().uuid(),
});

export const startRegistrationCreatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'frontend.topic';
  const queue    = 'planning.registration.created';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'frontend.registration.created');

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

      const data         = await parseXml(xml, 'RegistrationCreated');
      const registration = schema.parse(data);

      // ── Zoek participant op via crmMasterId ──
      const existing = await query(
        `SELECT "participantId" FROM "Participant" WHERE "crmMasterId" = $1 LIMIT 1`,
        [registration.crmMasterId]
      );

      if (existing.rows.length === 0) {
        throw new Error(`Participant niet gevonden voor crmMasterId: ${registration.crmMasterId}`);
      }

      const participantId = existing.rows[0].participantId;

      // ── Registratie aanmaken ──
      const result = await registerParticipant(registration.sessionId, {
        participantId,
        crmMasterId: registration.crmMasterId,
      });

      // ── Bevestiging sturen naar Frontend ──
      await sendRegistrationConfirmed({
        registrationId: result.registrationId,
        sessionId:      registration.sessionId,
        crmMasterId:    registration.crmMasterId,
      });

      await markAsProcessed(messageId);
      log.info('[Frontend] Registratie aangemaakt voor crmMasterId:', registration.crmMasterId);
      channel.ack(msg);
    } catch (err) {
      log.error('[Frontend] Fout in frontend.registration.created:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.registration.created'
      );
      channel.ack(msg);
    }
  });
};
