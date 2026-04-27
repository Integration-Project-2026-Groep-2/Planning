import { query } from '../db';
import { CreateSpeakerDTO, UpdateSpeakerDTO } from '../models/speaker.model';
import { sendPlanningUserCreated }     from '../producers/planning.user.created.producer';
import { sendPlanningUserUpdated }     from '../producers/planning.user.updated.producer';
import { sendPlanningUserDeactivated } from '../producers/planning.user.deactivated.producer';

// ── Alle sprekers ophalen ──
export const getAllSpeakers = async () => {
  const result = await query(
    `SELECT * FROM "Speaker" ORDER BY "lastName", "firstName"`
  );
  return result.rows;
};

// ── Één spreker ophalen op ID ──
export const getSpeakerById = async (speakerId: string) => {
  const result = await query(
    `SELECT * FROM "Speaker" WHERE "speakerId" = $1`,
    [speakerId]
  );
  return result.rows[0] || null;
};

// ── Nieuwe spreker aanmaken ──
export const createSpeaker = async (data: CreateSpeakerDTO) => {
  const result = await query(
    `INSERT INTO "Speaker"
      ("firstName", "lastName", "email", "phoneNumber", "company")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phoneNumber || null,
      data.company     || null,
    ]
  );

  const created = result.rows[0];

  // ── Stuur planning.user.created naar exchange user.topic ──
  await sendPlanningUserCreated({
    id:          created.speakerId,
    email:       created.email,
    firstName:   created.firstName,
    lastName:    created.lastName,
     role:        'SPEAKER',
    phoneNumber: created.phoneNumber,
    company:     created.company,
  });

  return created;
};

// ── Spreker wijzigen ──
export const updateSpeaker = async (speakerId: string, data: UpdateSpeakerDTO) => {
  const result = await query(
    `UPDATE "Speaker" SET
      "firstName"   = COALESCE($1, "firstName"),
      "lastName"    = COALESCE($2, "lastName"),
      "email"       = COALESCE($3, "email"),
      "phoneNumber" = COALESCE($4, "phoneNumber"),
      "company"     = COALESCE($5, "company")
     WHERE "speakerId" = $6
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phoneNumber,
      data.company,
      speakerId,
    ]
  );

  const updated = result.rows[0] || null;

  if (updated) {
    // ── Stuur planning.user.updated naar exchange user.topic ──
await sendPlanningUserUpdated({
  id:          updated.speakerId,
  email:       updated.email,
  firstName:   updated.firstName,
  lastName:    updated.lastName,
  role:        'SPEAKER',
  phoneNumber: updated.phoneNumber,
  company:     updated.company,
});
  }
  return updated;
};

// ── Spreker deactiveren (soft delete) ──
export const deactivateSpeaker = async (speakerId: string) => {
  const result = await query(
    `UPDATE "Speaker"
     SET "isActive" = false
     WHERE "speakerId" = $1
     RETURNING *`,
    [speakerId]
  );

  const deactivated = result.rows[0] || null;

  if (deactivated) {
    // ── Stuur planning.user.deactivated naar exchange user.topic ──
    await sendPlanningUserDeactivated({
      id:    deactivated.speakerId,
      email: deactivated.email,
    });
  }

  return deactivated;
};
