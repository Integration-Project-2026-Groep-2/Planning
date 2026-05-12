import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { query } from '../db';
import { registerParticipant } from '../services/registration.service';
import crypto from 'crypto';

const schema = z.object({
  sessionId: z.string().uuid(),
  firstName: z.string(),
  lastName:  z.string(),
  email:     z.string().email(),
  company:   z.string().optional(),
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

      // ── Controleer of participant al bestaat op email ──
      const existing = await query(
        `SELECT "participantId" FROM "Participant" WHERE "email" = $1 LIMIT 1`,
        [registration.email]
      );

      let participantId: string;

      if (existing.rows.length > 0) {
        participantId = existing.rows[0].participantId;
      } else {
        // ── Nieuwe participant aanmaken ──
        const result = await query(
          `INSERT INTO "Participant" ("firstName", "lastName", "email", "company")
           VALUES ($1, $2, $3, $4)
           RETURNING "participantId"`,
          [
            registration.firstName,
            registration.lastName,
            registration.email,
            registration.company || null,
          ]
        );
        participantId = result.rows[0].participantId;
      }

      // ── Registratie aanmaken ──
      await registerParticipant(registration.sessionId, { participantId });

      await markAsProcessed(messageId);
      console.log('[Frontend] Registratie aangemaakt voor:', registration.email);
      channel.ack(msg);
    } catch (err) {
      console.error('[Frontend] Fout in frontend.registration.created:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'frontend.registration.created'
      );
      channel.ack(msg);
    }
  });
};
