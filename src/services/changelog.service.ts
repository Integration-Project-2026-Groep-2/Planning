import { query } from '../db';
import { CreateLogDTO } from '../models/changelog.model';

// ── Nieuwe log entry aanmaken ──
export const createLog = async (data: CreateLogDTO) => {
  const result = await query(
    `INSERT INTO "SessionChangeLog"
      ("sessionId", "oldStartTime", "newStartTime", "oldEndTime", "newEndTime", "reason", "changedBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.sessionId,
      data.oldStartTime,
      data.newStartTime,
      data.oldEndTime,
      data.newEndTime,
      data.reason,
      data.changedBy || null,
    ]
  );
  return result.rows[0];
};

// ── Alle logs van één sessie ophalen ──
export const getLogsForSession = async (sessionId: string) => {
  const result = await query(
    `SELECT * FROM "SessionChangeLog"
     WHERE "sessionId" = $1
     ORDER BY "changedAt" DESC`,
    [sessionId]
  );
  return result.rows;
};
