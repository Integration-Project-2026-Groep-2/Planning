import { query } from '../db';
import { UpdateSpeakerDTO } from '../models/speaker.model';

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
  return result.rows[0] || null;
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
  return result.rows[0] || null;
};
