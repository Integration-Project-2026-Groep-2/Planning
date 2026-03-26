import { query } from '../db';
import { CreateSessionDTO, UpdateSessionDTO } from '../models/session.model';

// Alle sessies ophalen
export const getAllSessions = async () => {
  const result = await query(
    `SELECT * FROM "Session" ORDER BY "date", "startTime"`
  );
  return result.rows;
};

// Één sessie ophalen op ID
export const getSessionById = async (sessionId: string) => {
  const result = await query(
    `SELECT * FROM "Session" WHERE "sessionId" = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
};

// Nieuwe sessie aanmaken
export const createSession = async (data: CreateSessionDTO) => {
  const result = await query(
    `INSERT INTO "Session" 
      ("title", "description", "date", "startTime", "endTime", "status", "locationId", "capacity")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.date,
      data.startTime,
      data.endTime,
      data.status || 'concept',
      data.locationId || null,
      data.capacity,
    ]
  );
  return result.rows[0];
};

// Sessie wijzigen
export const updateSession = async (sessionId: string, data: UpdateSessionDTO) => {
  const result = await query(
    `UPDATE "Session" SET
      "title"       = COALESCE($1, "title"),
      "description" = COALESCE($2, "description"),
      "date"        = COALESCE($3, "date"),
      "startTime"   = COALESCE($4, "startTime"),
      "endTime"     = COALESCE($5, "endTime"),
      "status"      = COALESCE($6, "status"),
      "locationId"  = COALESCE($7, "locationId"),
      "capacity"    = COALESCE($8, "capacity")
     WHERE "sessionId" = $9
     RETURNING *`,
    [
      data.title,
      data.description,
      data.date,
      data.startTime,
      data.endTime,
      data.status,
      data.locationId,
      data.capacity,
      sessionId,
    ]
  );
  return result.rows[0] || null;
};

// Sessie verwijderen
export const deleteSession = async (sessionId: string) => {
  const result = await query(
    `DELETE FROM "Session" WHERE "sessionId" = $1 RETURNING *`,
    [sessionId]
  );
  return result.rows[0] || null;
};