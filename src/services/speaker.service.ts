import { query } from '../db';
import { CreateSpeakerDTO, UpdateSpeakerDTO } from '../models/speaker.model';
import { sendPlanningUserCreated }     from '../producers/planning.user.created.producer';
import { sendPlanningUserUpdated }     from '../producers/planning.user.updated.producer';
import { sendPlanningUserDeactivated } from '../producers/planning.user.deactivated.producer';
import { sendSpeakerCreated }          from '../producers/planning.speaker.created.producer';
import { sendSpeakerUpdated }          from '../producers/planning.speaker.updated.producer';
import { sendSpeakerDeactivated }      from '../producers/planning.speaker.deactivated.producer';

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
      ("firstName", "lastName", "email", "phoneNumber", "companyId")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phoneNumber || null,
      data.companyId   || null,
    ]
  );

  const created = result.rows[0];

  // ── Stuur planning.user.created naar exchange user.topic (CRM) ──
  await sendPlanningUserCreated({
    id:          created.speakerId,
    email:       created.email,
    firstName:   created.firstName,
    lastName:    created.lastName,
    role:        'SPEAKER',
    phoneNumber: created.phoneNumber,
    companyId:   created.companyId,
  });

  // ── Stuur planning.speaker.created naar exchange planning.topic (Frontend) ──
  await sendSpeakerCreated({
    speakerId:   created.speakerId,
    firstName:   created.firstName,
    lastName:    created.lastName,
    email:       created.email,
    phoneNumber: created.phoneNumber,
    companyId:   created.companyId,
    isActive:    true,
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
      "companyId"   = COALESCE($5, "companyId")
     WHERE "speakerId" = $6
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phoneNumber,
      data.companyId,
      speakerId,
    ]
  );

  const updated = result.rows[0] || null;

  if (updated) {
    // ── Stuur planning.user.updated naar exchange user.topic (CRM) ──
    await sendPlanningUserUpdated({
      id:          updated.speakerId,
      email:       updated.email,
      firstName:   updated.firstName,
      lastName:    updated.lastName,
      role:        'SPEAKER',
      phoneNumber: updated.phoneNumber,
      companyId:   updated.companyId,
    });

    // ── Stuur planning.speaker.updated naar exchange planning.topic (Frontend) ──
    await sendSpeakerUpdated({
      speakerId:   updated.speakerId,
      firstName:   updated.firstName,
      lastName:    updated.lastName,
      email:       updated.email,
      phoneNumber: updated.phoneNumber,
      companyId:   updated.companyId,
      isActive:    updated.isActive,
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
    // ── Stuur planning.user.deactivated naar exchange user.topic (CRM) ──
    await sendPlanningUserDeactivated({
      id:    deactivated.speakerId,
      email: deactivated.email,
    });

    // ── Stuur planning.speaker.deactivated naar exchange planning.topic (Frontend) ──
    await sendSpeakerDeactivated({
      speakerId:     deactivated.speakerId,
      email:         deactivated.email,
      deactivatedAt: new Date().toISOString(),
    });
  }

  return deactivated;
};