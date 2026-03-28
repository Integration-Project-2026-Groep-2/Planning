import { query } from '../db';
import {
  CreateSessionDTO,
  UpdateSessionDTO,
  RescheduleSessionDTO,
} from '../models/session.model';
import {
  sendSessionCreated,
  sendSessionCancelled,
  sendSessionRescheduled,
  sendSessionUpdateToCrm,
} from '../producers';
import { getLocationById } from './location.service';

// ── Hulpfunctie: controleer of locatie al bezet is op dat tijdslot ──
const checkLocationConflict = async (
  locationId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<boolean> => {
  const result = await query(
    `SELECT "sessionId" FROM "Session"
     WHERE "locationId" = $1
       AND "date" = $2
       AND "status" != 'geannuleerd'
       AND "startTime" < $4
       AND "endTime" > $3
       AND ($5::uuid IS NULL OR "sessionId" != $5)`,
    [locationId, date, startTime, endTime, excludeSessionId || null]
  );

  return result.rows.length > 0;
};

// ── Alle sessies ophalen ──
export const getAllSessions = async () => {
  const result = await query(
    `SELECT * FROM "Session" ORDER BY "date", "startTime"`
  );
  return result.rows;
};

// ── Één sessie ophalen op ID ──
export const getSessionById = async (sessionId: string) => {
  const result = await query(
    `SELECT * FROM "Session" WHERE "sessionId" = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
};

// ── Nieuwe sessie aanmaken ──
export const createSession = async (data: CreateSessionDTO) => {
  // Conflictdetectie: is de locatie al bezet op dit tijdslot?
  if (data.locationId) {
    const conflict = await checkLocationConflict(
      data.locationId,
      data.date,
      data.startTime,
      data.endTime
    );

    if (conflict) {
      throw new Error('LOCATION_CONFLICT');
    }
  }

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

  const createdSession = result.rows[0];

  await sendSessionCreated({
    sessionId: createdSession.sessionId,
    title: createdSession.title,
    date: createdSession.date,
    startTime: createdSession.startTime,
    endTime: createdSession.endTime,
    locationId: createdSession.locationId,
    capacity: createdSession.capacity,
    status: createdSession.status,
  });

  return createdSession;
};

// ── Sessie wijzigen ──
export const updateSession = async (
  sessionId: string,
  data: UpdateSessionDTO
) => {
  // Conflictdetectie bij locatiewijziging
  if (data.locationId && data.date && data.startTime && data.endTime) {
    const conflict = await checkLocationConflict(
      data.locationId,
      data.date,
      data.startTime,
      data.endTime,
      sessionId
    );

    if (conflict) {
      throw new Error('LOCATION_CONFLICT');
    }
  }

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

  const updatedSession = result.rows[0] || null;

  if (updatedSession) {
    let newLocation = 'Onbekend';

    if (updatedSession.locationId) {
      const location = await getLocationById(updatedSession.locationId);
      newLocation = location?.roomName || 'Onbekend';
    }

    await sendSessionUpdateToCrm({
      sessionId: updatedSession.sessionId,
      sessionName: updatedSession.title,
      newTime: `${updatedSession.date} ${updatedSession.startTime} - ${updatedSession.endTime}`,
      newLocation,
      changeType: 'updated',
    });
  }

  return updatedSession;
};

// ── Sessie annuleren ──
export const cancelSession = async (sessionId: string) => {
  const result = await query(
    `UPDATE "Session"
     SET "status" = 'geannuleerd'
     WHERE "sessionId" = $1
     RETURNING *`,
    [sessionId]
  );

  const cancelledSession = result.rows[0] || null;

  if (cancelledSession) {
    await sendSessionCancelled({
      sessionId: cancelledSession.sessionId,
      title: cancelledSession.title,
      date: cancelledSession.date,
      startTime: cancelledSession.startTime,
      endTime: cancelledSession.endTime,
      reason: 'Session cancelled',
    });

    let newLocation = 'Onbekend';

    if (cancelledSession.locationId) {
      const location = await getLocationById(cancelledSession.locationId);
      newLocation = location?.roomName || 'Onbekend';
    }

    await sendSessionUpdateToCrm({
      sessionId: cancelledSession.sessionId,
      sessionName: cancelledSession.title,
      newTime: `${cancelledSession.date} ${cancelledSession.startTime} - ${cancelledSession.endTime}`,
      newLocation,
      changeType: 'cancelled',
    });
  }

  return cancelledSession;
};

// ── Sessie verzetten (reschedule) ──
export const rescheduleSession = async (
  sessionId: string,
  data: RescheduleSessionDTO
) => {
  // Huidige sessie ophalen voor auditlog en producer
  const current = await getSessionById(sessionId);
  if (!current) return null;

  // Conflictdetectie
  if (current.locationId) {
    const conflict = await checkLocationConflict(
      current.locationId,
      data.date,
      data.startTime,
      data.endTime,
      sessionId
    );

    if (conflict) {
      throw new Error('LOCATION_CONFLICT');
    }
  }

  // Sessie updaten
  const updated = await query(
    `UPDATE "Session" SET
      "date"      = $1,
      "startTime" = $2,
      "endTime"   = $3
     WHERE "sessionId" = $4
     RETURNING *`,
    [data.date, data.startTime, data.endTime, sessionId]
  );

  // Datum proper formatteren voor auditlog / XML
  const currentDate =
    current.date instanceof Date
      ? current.date.toISOString().split('T')[0]
      : String(current.date).split('T')[0];

  // Wijziging opslaan in auditlog
  await query(
    `INSERT INTO "SessionChangeLog"
      ("sessionId", "oldStartTime", "newStartTime", "oldEndTime", "newEndTime", "reason")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      sessionId,
      `${currentDate} ${current.startTime}`,
      `${data.date} ${data.startTime}`,
      `${currentDate} ${current.endTime}`,
      `${data.date} ${data.endTime}`,
      data.reason,
    ]
  );

  const rescheduledSession = updated.rows[0];

  await sendSessionRescheduled({
    sessionId,
    title: current.title,
    oldDate: currentDate,
    oldStartTime: current.startTime,
    oldEndTime: current.endTime,
    newDate: data.date,
    newStartTime: data.startTime,
    newEndTime: data.endTime,
    reason: data.reason,
  });

  let newLocation = 'Onbekend';

  if (current.locationId) {
    const location = await getLocationById(current.locationId);
    newLocation = location?.roomName || 'Onbekend';
  }

  await sendSessionUpdateToCrm({
    sessionId,
    sessionName: current.title,
    newTime: `${data.date} ${data.startTime} - ${data.endTime}`,
    newLocation,
    changeType: 'rescheduled',
  });

  return rescheduledSession;
};

// ── Sessie verwijderen ──
export const deleteSession = async (sessionId: string) => {
  const result = await query(
    `DELETE FROM "Session" WHERE "sessionId" = $1 RETURNING *`,
    [sessionId]
  );
  return result.rows[0] || null;
};