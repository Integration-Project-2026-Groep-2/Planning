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
    startFrontendSessionsRequestedConsumer,
    startLocationCreatedConsumer,
    startLocationUpdatedConsumer,
    startLocationDeletedConsumer,
    startLocationsRequestedConsumer,
    startSpeakerCreatedConsumer,
    startSpeakerUpdatedConsumer,
    startSpeakerDeactivatedConsumer,
    startSpeakersRequestedConsumer,
    startRegistrationCreatedConsumer,
} from "./consumers";

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
        await migrate();
        await connectRabbitMQ();
        startHeartbeatProducer();

        await startUserConfirmedConsumer();
        await startUserUpdatedConsumer();
        await startUserDeactivatedConsumer();

        await startLocationCreatedConsumer();
        await startLocationUpdatedConsumer();
        await startLocationDeletedConsumer();
        await startLocationsRequestedConsumer();

        await startFrontendSessionCreatedConsumer();
        await startFrontendSessionUpdatedConsumer();
        await startFrontendSessionCancelledConsumer();
        await startFrontendSessionsRequestedConsumer();

        await startSpeakerCreatedConsumer();
        await startSpeakerUpdatedConsumer();
        await startSpeakerDeactivatedConsumer();
        await startSpeakersRequestedConsumer();

        await startRegistrationCreatedConsumer();
    } catch (err) {
        console.warn(
            "RabbitMQ niet bereikbaar — service start zonder RabbitMQ",
        );
    }

    app.listen(PORT, () => {
        console.log(`Planning service running on port ${PORT}`);
    });
};

start();

export default app;
