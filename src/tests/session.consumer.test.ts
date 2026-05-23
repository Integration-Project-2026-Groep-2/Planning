import { startFrontendSessionUpdatedConsumer } from "../consumers/frontend.session.updated.consumer";
import { startFrontendSessionCancelledConsumer } from "../consumers/frontend.session.cancelled.consumer";
import { startFrontendSessionRescheduledConsumer } from "../consumers/frontend.session.rescheduled.consumer";
import { startFrontendSessionCreatedConsumer } from "../consumers/frontend.session.created.consumer";
import { query } from "../db";
import { getChannel } from "../rabbitmq";
import {
    sendSessionCreated,
    sendSessionCancelled,
    sendSessionRescheduled,
    sendSessionUpdated,
} from "../producers";

// ── Mock: database ──
jest.mock("../db", () => ({ query: jest.fn() }));

// ── Mock: RabbitMQ connectie ──
jest.mock("../rabbitmq", () => ({
    connectRabbitMQ: jest.fn(),
    getChannel: jest.fn(),
}));

jest.mock("../producers", () => ({
    sendSessionCreated: jest.fn().mockResolvedValue(undefined),
    sendSessionCancelled: jest.fn().mockResolvedValue(undefined),
    sendSessionRescheduled: jest.fn().mockResolvedValue(undefined),
    sendSessionUpdated: jest.fn().mockResolvedValue(undefined),
    startHeartbeatProducer: jest.fn(),
}));

jest.mock("../utils/ics.generator", () => ({
    generateIcsBase64: jest.fn().mockReturnValue("base64mockics=="),
}));

jest.mock("../services/changelog.service", () => ({
    createLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../services/location.service", () => ({
    getLocationById: jest.fn().mockResolvedValue({ roomName: "Zaal A" }),
}));

const mockQuery = query as jest.Mock;
const mockGetChannel = getChannel as jest.Mock;

const SESSION_ID = "4e61b896-8ad9-4235-bbba-8ae31d91ba56";
const SPEAKER_CRM_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const PARTICIPANT_CRM_ID_1 = "c1b2c3d4-e5f6-7890-abcd-ef1234567892";
const PARTICIPANT_CRM_ID_2 = "c1b2c3d4-e5f6-7890-abcd-ef1234567893";

const mockSession = {
    sessionId: SESSION_ID,
    title: "Workshop TypeScript",
    description: "Introductie tot TypeScript",
    date: "2026-05-15",
    startTime: "09:00:00",
    endTime: "10:30:00",
    status: "concept",
    locationId: "b1b2c3d4-e5f6-7890-abcd-ef1234567891",
    capacity: 30,
    syncStatus: "pending",
};

describe("Frontend Session Consumers", () => {
    let mockChannel: any;
    let consumeCallback: any;

    beforeEach(() => {
        jest.resetAllMocks();
        consumeCallback = null;

        mockChannel = {
            assertExchange: jest.fn().mockResolvedValue(undefined),
            assertQueue: jest.fn().mockResolvedValue(undefined),
            bindQueue: jest.fn().mockResolvedValue(undefined),
            consume: jest.fn().mockImplementation((queue, callback) => {
                consumeCallback = callback;
            }),
            ack: jest.fn(),
        };

        mockGetChannel.mockReturnValue(mockChannel);
    });

    it("startFrontendSessionUpdatedConsumer - verwerkt session updated", async () => {
        await startFrontendSessionUpdatedConsumer();

        expect(mockChannel.assertExchange).toHaveBeenCalledWith("frontend.topic", "topic", { durable: true });
        expect(mockChannel.assertQueue).toHaveBeenCalledWith("planning.session.updated", { durable: true });
        expect(mockChannel.bindQueue).toHaveBeenCalledWith("planning.session.updated", "frontend.topic", "frontend.session.updated");
        expect(mockChannel.consume).toHaveBeenCalled();

        // Simulatie van database responses tijdens updateSession
        mockQuery
            // 1. isAlreadyProcessed (idempotency check)
            .mockResolvedValueOnce({ rowCount: 0 })
            // 2. getSessionById
            .mockResolvedValueOnce({ rows: [mockSession] })
            // 3. Location conflict check
            .mockResolvedValueOnce({ rows: [] })
            // 4. Update query
            .mockResolvedValueOnce({ rows: [{ ...mockSession, title: "Sessie Gewijzigd" }] })
            // 5. Delete SessionSpeaker
            .mockResolvedValueOnce({ rows: [] })
            // 6. Insert SessionSpeaker
            .mockResolvedValueOnce({ rows: [] })
            // 7. getSessionSpeakerCrmId helper query
            .mockResolvedValueOnce({ rows: [{ crmMasterId: SPEAKER_CRM_ID }] })
            // 8. getSessionParticipantCrmIds helper query
            .mockResolvedValueOnce({ rows: [{ userId: PARTICIPANT_CRM_ID_1 }, { userId: PARTICIPANT_CRM_ID_2 }] })
            // 9. markAsProcessed insert
            .mockResolvedValueOnce({ rows: [] });

        const incomingXml = `
<SessionUpdated>
    <sessionId>${SESSION_ID}</sessionId>
    <sessionName>Sessie Gewijzigd</sessionName>
    <newDescription>Nieuwe beschrijving</newDescription>
    <changeType>updated</changeType>
    <newTime>2026-05-15T09:00:00</newTime>
    <newStartTime>09:00:00</newStartTime>
    <newEndTime>10:30:00</newEndTime>
    <newLocationId>b1b2c3d4-e5f6-7890-abcd-ef1234567891</newLocationId>
    <newCapacity>30</newCapacity>
    <newStatus>actief</newStatus>
    <speakerId>${SPEAKER_CRM_ID}</speakerId>
</SessionUpdated>
        `;

        const mockMsg = {
            content: Buffer.from(incomingXml),
            properties: {
                messageId: "msg-12345",
            },
        };

        await consumeCallback(mockMsg);

        expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
        expect(sendSessionUpdated).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: SESSION_ID,
                sessionName: "Sessie Gewijzigd",
                speakerId: SPEAKER_CRM_ID,
                participantIds: [PARTICIPANT_CRM_ID_1, PARTICIPANT_CRM_ID_2],
            }),
        );
    });

    it("startFrontendSessionCancelledConsumer - verwerkt session cancelled", async () => {
        await startFrontendSessionCancelledConsumer();

        // Simulatie van database responses tijdens cancelSession
        mockQuery
            // 1. isAlreadyProcessed (idempotency check)
            .mockResolvedValueOnce({ rowCount: 0 })
            // 2. getSessionById
            .mockResolvedValueOnce({ rows: [mockSession] })
            // 3. Update query (cancel status)
            .mockResolvedValueOnce({ rows: [{ ...mockSession, status: "geannuleerd" }] })
            // 4. getSessionSpeakerCrmId
            .mockResolvedValueOnce({ rows: [{ crmMasterId: SPEAKER_CRM_ID }] })
            // 5. getSessionParticipantCrmIds
            .mockResolvedValueOnce({ rows: [{ userId: PARTICIPANT_CRM_ID_1 }] })
            // 6. markAsProcessed insert
            .mockResolvedValueOnce({ rows: [] });

        const incomingXml = `
<SessionCancelled>
    <sessionId>${SESSION_ID}</sessionId>
    <sessionName>Workshop TypeScript</sessionName>
    <reason>Spreker is ziek</reason>
</SessionCancelled>
        `;

        const mockMsg = {
            content: Buffer.from(incomingXml),
            properties: {
                messageId: "msg-12346",
            },
        };

        await consumeCallback(mockMsg);

        expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
        expect(sendSessionCancelled).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: SESSION_ID,
                participantIds: [PARTICIPANT_CRM_ID_1],
            }),
        );
        expect(sendSessionUpdated).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: SESSION_ID,
                speakerId: SPEAKER_CRM_ID,
                participantIds: [PARTICIPANT_CRM_ID_1],
                newStatus: "geannuleerd",
            }),
        );
    });

    it("startFrontendSessionRescheduledConsumer - verwerkt session rescheduled", async () => {
        await startFrontendSessionRescheduledConsumer();

        // Simulatie van database responses tijdens rescheduleSession
        mockQuery
            // 1. isAlreadyProcessed (idempotency check)
            .mockResolvedValueOnce({ rowCount: 0 })
            // 2. getSessionById
            .mockResolvedValueOnce({ rows: [mockSession] })
            // 3. Location conflict check
            .mockResolvedValueOnce({ rows: [] })
            // 4. Update query (reschedule dates)
            .mockResolvedValueOnce({ rows: [{ ...mockSession, date: "2026-06-01", startTime: "10:00:00", endTime: "11:30:00" }] })
            // 5. getSessionSpeakerCrmId
            .mockResolvedValueOnce({ rows: [{ crmMasterId: SPEAKER_CRM_ID }] })
            // 6. getSessionParticipantCrmIds
            .mockResolvedValueOnce({ rows: [{ userId: PARTICIPANT_CRM_ID_2 }] })
            // 7. markAsProcessed insert
            .mockResolvedValueOnce({ rows: [] });

        const incomingXml = `
<SessionRescheduled>
    <sessionId>${SESSION_ID}</sessionId>
    <sessionName>Workshop TypeScript</sessionName>
    <oldDate>2026-05-15</oldDate>
    <oldStartTime>09:00:00</oldStartTime>
    <newDate>2026-06-01</newDate>
    <newStartTime>10:00:00</newStartTime>
    <newEndTime>11:30:00</newEndTime>
    <reason>Zaalwijziging</reason>
</SessionRescheduled>
        `;

        const mockMsg = {
            content: Buffer.from(incomingXml),
            properties: {
                messageId: "msg-12347",
            },
        };

        await consumeCallback(mockMsg);

        expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
        expect(sendSessionRescheduled).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: SESSION_ID,
                newDate: "2026-06-01",
                newStartTime: "10:00:00",
                newEndTime: "11:30:00",
                participantIds: [PARTICIPANT_CRM_ID_2],
            }),
        );
    });
});
