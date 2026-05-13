import { getChannel } from "../rabbitmq";
import { parseXml } from "../utils/xml.parser";
import { z } from "zod";
import { isAlreadyProcessed, markAsProcessed } from "../utils/idempotency";
import { sendToDlq } from "../utils/dlq";
import { log } from "../utils/logger";
import { createLocation } from "../services/location.service";
import crypto from "crypto";

const schema = z.object({
    roomName: z.string(),
    address: z.string().optional(),
    capacity: z.preprocess((v) => Number(v), z.number().int().positive()),
    status: z
        .enum(["beschikbaar", "gereserveerd", "niet beschikbaar"])
        .optional(),
});

export const startLocationCreatedConsumer = async () => {
    const channel = getChannel();

    const exchange = "frontend.topic";
    const queue = "planning.location.created";

    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, "frontend.location.created");

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

            const data = await parseXml(xml, "LocationCreated");
            const location = schema.parse(data);

            await createLocation({
                roomName: location.roomName,
                address: location.address,
                capacity: location.capacity,
                status: location.status ?? "beschikbaar",
            });

            await markAsProcessed(messageId);
            log.info("[Frontend] Locatie aangemaakt via consumer");
            channel.ack(msg);
        } catch (err) {
            log.error("[Frontend] Fout in frontend.location.created:", err);
            await sendToDlq(
                xml,
                err instanceof Error ? err.message : "Unknown error",
                "frontend.location.created",
            );
            channel.ack(msg);
        }
    });
};
