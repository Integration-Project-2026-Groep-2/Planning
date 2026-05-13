import { getChannel } from "../rabbitmq";
import { parseXml } from "../utils/xml.parser";
import { z } from "zod";
import { isAlreadyProcessed, markAsProcessed } from "../utils/idempotency";
import { sendToDlq } from "../utils/dlq";
import { rescheduleSession } from "../services/session.service";
import crypto from "crypto";

const schema = z.object({
    sessionId: z.string().uuid(),
    newDate: z.string(),
    newStartTime: z.string(),
    newEndTime: z.string(),
    newLocation: z.string().optional(),
    reason: z.string(),
});

export const startFrontendSessionRescheduledConsumer = async () => {
    const channel = getChannel();

    const exchange = "frontend.topic";
    const queue = "planning.session.rescheduled";

    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, "frontend.session.rescheduled");

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

            const data = await parseXml(xml, "SessionRescheduled");
            const session = schema.parse(data);

            await rescheduleSession(session.sessionId, {
                date: session.newDate,
                startTime: session.newStartTime,
                endTime: session.newEndTime,
                reason: session.reason,
            });

            await markAsProcessed(messageId);
            console.log(
                "[Frontend] Sessie verzet via consumer:",
                session.sessionId,
            );
            channel.ack(msg);
        } catch (err) {
            console.error(
                "[Frontend] Fout in frontend.session.rescheduled:",
                err,
            );
            await sendToDlq(
                xml,
                err instanceof Error ? err.message : "Unknown error",
                "frontend.session.rescheduled",
            );
            channel.ack(msg);
        }
    });
};
