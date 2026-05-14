import { getChannel } from "../rabbitmq";
import { parseXml } from "../utils/xml.parser";
import { z } from "zod";
import { isAlreadyProcessed, markAsProcessed } from "../utils/idempotency";
import { sendToDlq } from "../utils/dlq";
import { log } from "../utils/logger";
import { updateSession } from "../services/session.service";
import crypto from "crypto";

const schema = z.object({
    sessionId: z.string().uuid(),
    sessionName: z.string().optional(),
    title: z.string().optional(),
    newDescription: z.string().optional(),
    date: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    capacity: z.preprocess(
        (v) => (v ? Number(v) : undefined),
        z.number().optional(),
    ),
    locationId: z.string().optional(),
    newTime: z.string().optional(),
    newStartTime: z.string().optional(),
    newEndTime: z.string().optional(),
    newLocation: z.string().optional(),
    newLocationId: z.string().optional(),
    newCapacity: z.preprocess(
        (v) => (v ? Number(v) : undefined),
        z.number().optional(),
    ),
    newStatus: z.string().optional(),
});

export const startFrontendSessionUpdatedConsumer = async () => {
    const channel = getChannel();

    const exchange = "frontend.topic";
    const queue = "planning.session.updated";

    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, "frontend.session.updated");

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

            const data = await parseXml(xml, "SessionUpdated");
            const session = schema.parse(data);

            // Map SessionUpdated fields to UpdateSessionDTO
            const updatePayload: any = {};

            if (session.sessionName) updatePayload.title = session.sessionName;
            if (session.newDescription !== undefined)
                updatePayload.description = session.newDescription;
            if (session.newTime)
                updatePayload.date = session.newTime.split("T")[0]; // Extract date from newTime
            if (session.newStartTime)
                updatePayload.startTime = session.newStartTime;
            if (session.newEndTime) updatePayload.endTime = session.newEndTime;
            if (session.newStatus) updatePayload.status = session.newStatus;
            if (session.newLocationId)
                updatePayload.locationId = session.newLocationId;
            if (session.newCapacity)
                updatePayload.capacity = session.newCapacity;

            await updateSession(session.sessionId, updatePayload);

            await markAsProcessed(messageId);
            log.info("[FRONTEND] Sessie bijgewerkt");
            channel.ack(msg);
        } catch (err) {
            log.error("[FRONTEND] Fout in frontend.session.updated:", err);

            await sendToDlq(
                xml,
                err instanceof Error ? err.message : "Unknown error",
                "frontend.session.updated",
            );
            channel.ack(msg);
        }
    });
};
