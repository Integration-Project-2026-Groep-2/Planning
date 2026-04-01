import { query } from '../db';
import { RegisterParticipantDTO } from '../models/registration.model';
import { sendParticipantRegistered } from '../producers/participant.registered.producer';
import { sendSessionFull } from '../producers/session.full.producer';

// ── Deelnemer inschrijven voor een sessie ──
export const registerParticipant = async (
  sessionId: string,
  data: RegisterParticipantDTO
) => {
  // Sessie ophalen om capaciteit te controleren
  const sessionResult = await query(
    `SELECT * FROM "Session" WHERE "sessionId" = $1`,
    [sessionId]
  );
  const session = sessionResult.rows[0];
  if (!session) throw new Error('SESSION_NOT_FOUND');

  // Sessie mag niet geannuleerd zijn
  if (session.status === 'geannuleerd') {
    throw new Error('SESSION_CANCELLED');
  }

  // Controleer of deelnemer al ingeschreven is
  const existing = await query(
    `SELECT * FROM "Registration"
     WHERE "sessionId" = $1 AND "participantId" = $2`,
    [sessionId, data.participantId]
  );
  if (existing.rows.length > 0) {
    throw new Error('ALREADY_REGISTERED');
  }

  // Huidig aantal inschrijvingen tellen
  const countResult = await query(
    `SELECT COUNT(*) FROM "Registration" WHERE "sessionId" = $1`,
    [sessionId]
  );
  const currentCount = parseInt(countResult.rows[0].count);

  // Capaciteit controleren
  if (currentCount >= session.capacity) {
    throw new Error('SESSION_FULL');
  }

  // Inschrijving opslaan
  const result = await query(
    `INSERT INTO "Registration"
      ("sessionId", "participantId", "crmMasterId")
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sessionId, data.participantId, data.crmMasterId || null]
  );
  const registration = result.rows[0];

  const newCount = currentCount + 1;

  // RabbitMQ: ParticipantRegistered event versturen
  await sendParticipantRegistered({
    sessionId,
    crmMasterId: data.crmMasterId || data.participantId,
    currentRegistrations: newCount,
    capacity: session.capacity,
    registrationTime: registration.registrationTime,
  });

  // RabbitMQ: SessionFull event versturen als sessie nu vol is
  if (newCount >= session.capacity) {
    await query(
      `UPDATE "Session" SET "status" = 'volzet' WHERE "sessionId" = $1`,
      [sessionId]
    );
    await sendSessionFull({
      sessionId,
      currentRegistrations: newCount,
      capacity: session.capacity,
      crmMasterId: data.crmMasterId,
    });
  }

  return registration;
};

// ── Inschrijving annuleren ──
export const cancelRegistration = async (
  sessionId: string,
  participantId: string
) => {
  // Controleer of inschrijving bestaat
  const existing = await query(
    `SELECT * FROM "Registration"
     WHERE "sessionId" = $1 AND "participantId" = $2`,
    [sessionId, participantId]
  );
  if (existing.rows.length === 0) {
    throw new Error('REGISTRATION_NOT_FOUND');
  }

  // Inschrijving verwijderen
  const result = await query(
    `DELETE FROM "Registration"
     WHERE "sessionId" = $1 AND "participantId" = $2
     RETURNING *`,
    [sessionId, participantId]
  );

  // Als sessie volzet was → terug op actief zetten
  const sessionResult = await query(
    `SELECT * FROM "Session" WHERE "sessionId" = $1`,
    [sessionId]
  );
  const session = sessionResult.rows[0];
  if (session && session.status === 'volzet') {
    await query(
      `UPDATE "Session" SET "status" = 'actief' WHERE "sessionId" = $1`,
      [sessionId]
    );
  }

  return result.rows[0];
};
