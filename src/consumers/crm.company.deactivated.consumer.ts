import { getChannel } from '../rabbitmq';
import { z } from 'zod';
import { query } from '../db';
import { parseXml } from '../utils/xml.parser';

const schema = z.object({
  id: z.string().uuid(),
  vatNumber: z.string().regex(/^BE[0-9]{10}$/),
  deactivatedAt: z.string(),
});

export const startCompanyDeactivatedConsumer = async () => {
  const channel = getChannel();

  const exchange = 'contact.topic';
  const queue = 'crm.company.deactivated';
  const dlq = 'crm.company.deactivated.dlq';

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  await channel.bindQueue(queue, exchange, 'crm.company.deactivated');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();
      const data = await parseXml(xml, 'CompanyDeactivated');

      const parsed = schema.safeParse(data);

      if (!parsed.success) {
        console.error(
          '[CRM] Zod validatie mislukt in crm.company.deactivated:',
          parsed.error.flatten()
        );
        channel.sendToQueue(dlq, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });
        channel.ack(msg);
        return;
      }

      const company = parsed.data;

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

      console.log(
        '[CRM] Company gedeactiveerd → gekoppelde speakers uitgeschakeld'
      );
      channel.ack(msg);
    } catch (err) {
      console.error('[CRM] Fout in crm.company.deactivated:', err);
      channel.nack(msg, false, false);
    }
  });
};