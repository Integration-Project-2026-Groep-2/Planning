import { getChannel } from "../rabbitmq";
import { parseXml } from "../utils/xml.parser";
import { z } from "zod";
import { isAlreadyProcessed, markAsProcessed } from "../utils/idempotency";
import { sendToDlq } from "../utils/dlq";
import { log } from "../utils/logger";
import { query } from "../db";
import { registerParticipant, cancelRegistration } from "../services/registration.service";
import crypto from "crypto";

const schema = z.object({
    registrationId: z.string().uuid(),
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    isActive: z.preprocess((val) => {
        if (typeof val === "string") {
            const v = val.toLowerCase();
            if (v === "true") return true;
            if (v === "false") return false;
        }
        return val;
    }, z.boolean()),
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

            // ── Verifieer dat gebruiker bestaat ──
            const existing = await query(
                `SELECT "crmMasterId" FROM "User" WHERE "crmMasterId" = $1 LIMIT 1`,
                [registration.userId],
            );

            if (existing.rows.length === 0) {
                throw new Error(
                    `Gebruiker niet gevonden voor crmMasterId: ${registration.userId}`,
                );
            }

            // ── Registratie aanmaken of annuleren ──
            if (registration.isActive) {
                await registerParticipant(registration.sessionId, {
                    userId: registration.userId,
                    isActive: registration.isActive,
                });
                log.info(
                    "[Frontend] Registratie aangemaakt voor crmMasterId:",
                    registration.userId,
                );
            } else {
                await cancelRegistration(
                    registration.sessionId,
                    registration.userId,
                );
                log.info(
                    "[Frontend] Registratie geannuleerd voor crmMasterId:",
                    registration.userId,
                );
            }

            await markAsProcessed(messageId);
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
