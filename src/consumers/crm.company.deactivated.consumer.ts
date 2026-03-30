import { getChannel } from '../rabbitmq';
import { parseStringPromise } from 'xml2js';
import { z } from 'zod';
import { query } from '../db';
import { validateXml } from '../utils/xml.validator';

const CompanyDeactivatedSchema = z.object({
  companyName: z.string().min(1),
});

export const startCompanyDeactivatedConsumer = async () => {
  const channel = getChannel();
  const queue = 'crm.company.deactivated';
  const dlq = 'crm.company.deactivated.dlq';

  await channel.assertQueue(queue, { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const xml = msg.content.toString();

      if (!validateXml(xml, 'CompanyDeactivated')) {
        console.error('[CRM] Ongeldige XML in crm.company.deactivated');
        channel.sendToQueue(dlq, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });
        channel.ack(msg);
        return;
      }

      const parsed = await parseStringPromise(xml);
      const data = parsed.CompanyDeactivated;

      const payload = {
        companyName: data.companyName?.[0] ?? data.name?.[0].trim(),
      };

      const validated = CompanyDeactivatedSchema.safeParse(payload);
      if (!validated.success) {
        console.error(
          '[CRM] Zod validatie mislukt in crm.company.deactivated:',
          validated.error.flatten()
        );
        channel.sendToQueue(dlq, Buffer.from(xml), {
          contentType: 'application/xml',
          persistent: true,
        });
        channel.ack(msg);
        return;
      }

      const futureSessions = await query(
        `SELECT s."sessionId", s."title", s."date", s."startTime"
         FROM "Speaker" sp
         INNER JOIN "SessionSpeaker" ss ON sp."speakerId" = ss."speakerId"
         INNER JOIN "Session" s ON ss."sessionId" = s."sessionId"
         WHERE sp."company" = $1
           AND sp."isActive" = true
           AND s."status" != 'geannuleerd'
           AND s."date" >= CURRENT_DATE
         ORDER BY s."date", s."startTime"`,
        [validated.data.companyName]
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
        [validated.data.companyName]
      );

      console.warn('[CRM] Company gedeactiveerd → gekoppelde speakers uitgeschakeld');

      channel.ack(msg);
    } catch (error) {
      console.error('[CRM] Error company deactivated:', error);
      channel.nack(msg, false, false);
    }
  });
};