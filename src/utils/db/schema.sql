CREATE TABLE IF NOT EXISTS "Location" (
    "locationId"  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomName"    VARCHAR(100) NOT NULL,
    "address"     VARCHAR(255),
    "capacity"    INT          NOT NULL,
    "status"      VARCHAR(50)  NOT NULL DEFAULT 'beschikbaar'
);

CREATE TABLE IF NOT EXISTS "Speaker" (
    "speakerId"   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "crmMasterId" UUID,
    "firstName"   VARCHAR(100) NOT NULL,
    "lastName"    VARCHAR(100) NOT NULL,
    "email"       VARCHAR(255) NOT NULL,
    "phoneNumber" VARCHAR(20),
    "company"     VARCHAR(255),
    "isActive"    BOOLEAN      NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "Session" (
    "sessionId"      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "title"          VARCHAR(255) NOT NULL,
    "description"    TEXT,
    "date"           DATE         NOT NULL,
    "startTime"      TIME         NOT NULL,
    "endTime"        TIME         NOT NULL,
    "status"         VARCHAR(50)  NOT NULL DEFAULT 'concept',
    "locationId"     UUID         REFERENCES "Location"("locationId"),
    "capacity"       INT          NOT NULL,
    "syncStatus"     VARCHAR(50)  NOT NULL DEFAULT 'pending',
    "outlookEventId" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "SessionSpeaker" (
    "sessionSpeakerId" UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId"        UUID        NOT NULL REFERENCES "Session"("sessionId") ON DELETE CASCADE,
    "speakerId"        UUID        NOT NULL REFERENCES "Speaker"("speakerId") ON DELETE CASCADE,
    "role"             VARCHAR(100),
    "confirmed"        BOOLEAN     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "Participant" (
    "participantId" UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "firstName"     VARCHAR(100) NOT NULL,
    "lastName"      VARCHAR(100) NOT NULL,
    "email"         VARCHAR(255) NOT NULL,
    "company"       VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "Registration" (
    "registrationId"   UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId"        UUID      NOT NULL REFERENCES "Session"("sessionId") ON DELETE CASCADE,
    "participantId"    UUID      NOT NULL REFERENCES "Participant"("participantId"),
    "crmMasterId"      UUID,
    "registrationTime" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SessionChangeLog" (
    "logId"        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId"    UUID         NOT NULL REFERENCES "Session"("sessionId") ON DELETE CASCADE,
    "oldStartTime" TIMESTAMP,
    "newStartTime" TIMESTAMP,
    "oldEndTime"   TIMESTAMP,
    "newEndTime"   TIMESTAMP,
    "reason"       TEXT,
    "changedAt"    TIMESTAMP    NOT NULL DEFAULT NOW(),
    "changedBy"    VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "ProcessedMessages" (
  "messageId"   VARCHAR(255) PRIMARY KEY,
  "processedAt" TIMESTAMP    NOT NULL DEFAULT NOW()
);

ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "crmMasterId" UUID;
ALTER TABLE "Speaker" ADD COLUMN IF NOT EXISTS "gdprConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Participant" ADD COLUMN IF NOT EXISTS "gdprConsent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "User" (
    "userId"    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firstName" VARCHAR(100) NOT NULL,
    "lastName"  VARCHAR(100) NOT NULL,
    "email"     VARCHAR(255) NOT NULL UNIQUE,
    "role"      VARCHAR(50)  NOT NULL,
    "company"   VARCHAR(255)
);