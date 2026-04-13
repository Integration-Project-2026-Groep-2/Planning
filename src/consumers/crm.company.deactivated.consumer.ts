import { getChannel } from '../rabbitmq';
import { z } from 'zod';
import { query } from '../db';
import { parseXml } from '../utils/xml.parser';
import { isAlreadyProcessed, markAsProcessed } from '../utils/idempotency';
import { sendToDlq } from '../utils/dlq';
import crypto from 'crypto';

const schema = z.object({
  id: z.string().uuid(),
  vatNumber: z.string().regex(/^BE[0-9]{10}$/),
  deactivatedAt: z.string(),
});

export const startCompanyDeactivatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'crm.company.deactivated';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.company.deactivated');

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

      const data = await parseXml(xml, 'CompanyDeactivated');
      const company = schema.parse(data);

      const speakerResult = await query(
        `SELECT "company"
         FROM "Speaker"
         WHERE "crmMasterId" = $1
         LIMIT 1`,
        [company.id]
      );

      const companyName = speakerResult.rows[0]?.company;

      if (companyName) {
        const futureSessions = await query(
          `SELECT s."sessionId", s."title", s."date", s."startTime"
           FROM "Speaker" sp
           INNER JOIN "SessionSpeaker" ss ON sp."speakerId" = ss."speakerId"
           INNER JOIN "Session" s ON ss."sessionId" = s."sessionId"
           WHERE sp."company" = $1
             AND s."status" != 'geannuleerd'
             AND s."date" >= CURRENT_DATE`,
          [companyName]
        );

        if (futureSessions.rows.length > 0) {
          console.warn(
            '[CRM] Company gedeactiveerd maar nog gekoppeld aan toekomstige sessies:',
            futureSessions.rows
          );
        }

        await query(
          `UPDATE "Speaker"
           SET "isActive" = false
           WHERE "company" = $1`,
          [companyName]
        );
      } else {
        await query(
          `UPDATE "Speaker"
           SET "isActive" = false
           WHERE "crmMasterId" = $1`,
          [company.id]
        );
      }

      await markAsProcessed(messageId);
      console.log(
        '[CRM] Company gedeactiveerd → gekoppelde speakers uitgeschakeld'
      );
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout in crm.company.deactivated:', err);

      await sendToDlq(
        xml,
        err instanceof Error ? err.message : 'Unknown error'
      );

      channel.ack(msg);
    }
  });
};