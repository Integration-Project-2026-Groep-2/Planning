import { getChannel } from "../rabbitmq";
import { parseXml } from "../utils/xml.parser";
import { z } from "zod";
import { isAlreadyProcessed, markAsProcessed } from "../utils/idempotency";
import { sendToDlq } from "../utils/dlq";
import { log } from "../utils/logger";
import { query } from "../db";
import { registerParticipant } from "../services/registration.service";
import crypto from "crypto";

const schema = z.object({
    registrationId: z.string().uuid(),
    sessionId: z.string().uuid(),
    participantId: z.string().uuid(),
    crmMasterId: z.string().uuid(),
    timestamp: z.string().optional(),
});

export const startRegistrationCreatedConsumer = async () => {
    const channel = getChannel();

    const exchange = "frontend.topic";
    const queue = "planning.registration.created";

    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, "frontend.registration.created");

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

            const data = await parseXml(xml, "RegistrationCreated");
            const registration = schema.parse(data);

            // ── Verifieer dat deelnemer bestaat ──
            const existing = await query(
                `SELECT "participantId" FROM "Participant" WHERE "participantId" = $1 LIMIT 1`,
                [registration.participantId],
            );

            if (existing.rows.length === 0) {
                throw new Error(
                    `Participant niet gevonden voor participantId: ${registration.participantId}`,
                );
            }

            // ── Registratie aanmaken en persist naar DB via service ──
            const result = await registerParticipant(registration.sessionId, {
                participantId: registration.participantId,
                crmMasterId: registration.crmMasterId,
            });

            await markAsProcessed(messageId);
            log.info(
                "[Frontend] Registratie aangemaakt voor participantId:",
                registration.participantId,
            );
            channel.ack(msg);
        } catch (err) {
            log.error("[Frontend] Fout in frontend.registration.created:", err);
            await sendToDlq(
                xml,
                err instanceof Error ? err.message : "Unknown error",
                "frontend.registration.created",
            );
            channel.ack(msg);
        }
    });
};
