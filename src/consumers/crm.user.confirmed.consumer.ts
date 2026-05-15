import { getChannel } from '../rabbitmq';
import { parseXml } from '../utils/xml.parser';
import { z } from 'zod';
import { query } from '../db';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import { log } from '../utils/logger';
import crypto from 'crypto';

const toBoolean = (value: unknown) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const schema = z.object({
  id:          z.string().uuid(),
  email:       z.string().email(),
  firstName:   z.string(),
  lastName:    z.string(),
  phone:       z.string().optional(),
  role:        z.string(),
  companyId:   z.string().uuid().optional(),
  isActive:    z.preprocess(toBoolean, z.boolean()),
  gdprConsent: z.preprocess(toBoolean, z.boolean()),
  confirmedAt: z.string().optional(),
});

export const startUserConfirmedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue    = 'planning.user.confirmed';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'crm.user.confirmed');

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

      const data = await parseXml(xml, 'UserConfirmed');
      const user = schema.parse(data);

      if (user.role === 'SPEAKER') {
        // ── Speaker afhandelen ──
        const existingSpeaker = await query(
          `SELECT "speakerId" FROM "Speaker" WHERE "crmMasterId" = $1 LIMIT 1`,
          [user.id]
        );

        if (!existingSpeaker.rowCount || existingSpeaker.rowCount === 0) {
          await query(
            `INSERT INTO "Speaker"
              ("crmMasterId", "firstName", "lastName", "email", "phoneNumber", "isActive", "companyId")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [user.id, user.firstName, user.lastName, user.email, user.phone || null, user.isActive, user.companyId || null]
          );
          log.info('[CRM] Speaker aangemaakt');
        }
      } else {
        // ── User (EVENT_MANAGER / VISITOR) afhandelen ──
        const existingUser = await query(
          `SELECT "userId" FROM "User" WHERE "crmMasterId" = $1 OR "email" = $2 LIMIT 1`,
          [user.id, user.email]
        );

        if (existingUser.rowCount && existingUser.rowCount > 0) {
          await query(
            `UPDATE "User"
             SET "crmMasterId" = $1, "firstName" = $2, "lastName" = $3, "role" = $4, "isActive" = $5, "company" = $6
             WHERE "userId" = $7`,
            [user.id, user.firstName, user.lastName, user.role, user.isActive, user.companyId || null, existingUser.rows[0].userId]
          );
          log.info('[CRM] User bijgewerkt met CRM data');
        } else {
          await query(
            `INSERT INTO "User"
              ("crmMasterId", "firstName", "lastName", "email", "role", "isActive", "company")
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [user.id, user.firstName, user.lastName, user.email, user.role, user.isActive, user.companyId || null]
          );
          log.info('[CRM] Nieuwe user aangemaakt vanuit CRM');
        }
      }

      await markAsProcessed(messageId);
      channel.ack(msg);
    } catch (err) {
      log.error('[CRM] Fout in crm.user.confirmed:', err);
      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error',
        'crm.user.confirmed'
      );
      channel.ack(msg);
    }
  });
};