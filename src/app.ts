import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectRabbitMQ } from "./rabbitmq";
import { startHeartbeatProducer } from "./producers";
import { migrate } from "./utils/db/migrate";
import routes from "./routes";
import {
    startUserConfirmedConsumer,
    startUserUpdatedConsumer,
    startUserDeactivatedConsumer,
    startFrontendSessionCreatedConsumer,
    startFrontendSessionUpdatedConsumer,
    startFrontendSessionCancelledConsumer,
    startLocationCreatedConsumer,
    startLocationUpdatedConsumer,
    startLocationDeletedConsumer,
    startSpeakerCreatedConsumer,
    startSpeakerUpdatedConsumer,
    startSpeakerDeactivatedConsumer,
    startRegistrationCreatedConsumer,
    startFrontendSessionRescheduledConsumer,
} from "./consumers";

import { setupRabbitMQ } from "./rabbitmq/setup";
import { waitForDatabase } from "./utils/db/wait-for-db";
import { log } from "./utils/logger";
import { startStatusCheckProducer } from "./producers/statuscheck.producer";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "planning" });
});

app.use("/api", routes);

const start = async () => {
    try {
        // 1. Wacht tot database bereikbaar is
        await waitForDatabase();
        
        // 2. Voer migraties uit
        await migrate();

        // 3. Verbind met RabbitMQ
        await connectRabbitMQ();
        
        // 4. Configureer exchanges en queues centraal
        await setupRabbitMQ();

        startHeartbeatProducer();
        startStatusCheckProducer();

        await startUserConfirmedConsumer();
        await startUserUpdatedConsumer();
        await startUserDeactivatedConsumer();

        await startLocationCreatedConsumer();
        await startLocationUpdatedConsumer();
        await startLocationDeletedConsumer();

        await startFrontendSessionCreatedConsumer();
        await startFrontendSessionUpdatedConsumer();
        await startFrontendSessionCancelledConsumer();
        await startFrontendSessionRescheduledConsumer();

        await startSpeakerCreatedConsumer();
        await startSpeakerUpdatedConsumer();
        await startSpeakerDeactivatedConsumer();

        await startRegistrationCreatedConsumer();
    } catch (err: any) {
        console.error("[FATAL] Kritieke fout tijdens opstarten:", err.message);
        process.exit(1); // Stop de service zodat Docker/PM2 kan herstarten
    }

    app.listen(PORT, () => {
        log.info(`Planning service running on port ${PORT}`);
    });
};

start();

export default app;
