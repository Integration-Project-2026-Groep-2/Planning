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
  sendSessionUpdated,
} from '../producers';
import { getLocationById } from './location.service';
import { createLog } from './changelog.service';

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

// ── Hulpfunctie: datum formatteren ──
const formatDate = (date: Date | string): string => {
  return date instanceof Date
    ? date.toISOString().split('T')[0]
    : String(date).split('T')[0];
};

// ── Hulpfunctie: status mappen naar contractwaarden ──
const mapSessionStatus = (
  status: string
): 'active' | 'cancelled' | 'full' | 'concept' => {
  switch (status) {
    case 'actief':
      return 'active';
    case 'geannuleerd':
      return 'cancelled';
    case 'volzet':
      return 'full';
    case 'concept':
    default:
      return 'concept';
  }
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

  let locationName = 'Onbekend';
  if (createdSession.locationId) {
    const location = await getLocationById(createdSession.locationId);
    locationName = location?.roomName || 'Onbekend';
  }

  await sendSessionCreated({
    sessionId: createdSession.sessionId,
    title: createdSession.title,
    date: formatDate(createdSession.date),
    startTime: createdSession.startTime,
    endTime: createdSession.endTime,
    location: locationName,
    capacity: createdSession.capacity,
    status: mapSessionStatus(createdSession.status),
  });

  return createdSession;
};

// ── Sessie wijzigen ──
export const updateSession = async (
  sessionId: string,
  data: UpdateSessionDTO
) => {
  // Huidige sessie ophalen zodat we de oude waarden kunnen bewaren in de log
  const current = await getSessionById(sessionId);
  if (!current) return null;

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
    const currentDate = formatDate(current.date);
    const updatedDate = formatDate(updatedSession.date);

    // ── Log de wijziging in SessionChangeLog ──
    await createLog({
      sessionId,
      oldStartTime: `${currentDate} ${current.startTime}`,
      newStartTime: `${updatedDate} ${updatedSession.startTime}`,
      oldEndTime: `${currentDate} ${current.endTime}`,
      newEndTime: `${updatedDate} ${updatedSession.endTime}`,
      reason: 'Sessie gewijzigd via PUT',
    });

    let newLocation = 'Onbekend';
    if (updatedSession.locationId) {
      const location = await getLocationById(updatedSession.locationId);
      newLocation = location?.roomName || 'Onbekend';
    }

    await sendSessionUpdateToCrm({
      sessionId: updatedSession.sessionId,
      sessionName: updatedSession.title,
      newTime: `${updatedDate}T${updatedSession.startTime}`,
      newLocation,
      changeType: 'updated',
    });

    await sendSessionUpdated({
      sessionId: updatedSession.sessionId,
      changeType: 'CAPACITY_CHANGED',
      newTime: `${updatedDate}T${updatedSession.startTime}`,
      newLocation,
      newTitle: updatedSession.title,
      newCapacity: updatedSession.capacity,
    });
  }

  return updatedSession;
};

// ── Sessie annuleren ──
export const cancelSession = async (sessionId: string) => {
  // Huidige sessie ophalen voor de log
  const current = await getSessionById(sessionId);
  if (!current) return null;

  const result = await query(
    `UPDATE "Session"
     SET "status" = 'geannuleerd'
     WHERE "sessionId" = $1
     RETURNING *`,
    [sessionId]
  );

  const cancelledSession = result.rows[0] || null;

  if (cancelledSession) {
    const currentDate = formatDate(current.date);

    // ── Log de annulering in SessionChangeLog ──
    await createLog({
      sessionId,
      oldStartTime: `${currentDate} ${current.startTime}`,
      newStartTime: null,
      oldEndTime: `${currentDate} ${current.endTime}`,
      newEndTime: null,
      reason: 'Sessie geannuleerd',
    });

    let newLocation = 'Onbekend';
    if (cancelledSession.locationId) {
      const location = await getLocationById(cancelledSession.locationId);
      newLocation = location?.roomName || 'Onbekend';
    }

    const formattedDate = formatDate(cancelledSession.date);

    await sendSessionCancelled({
      sessionId: cancelledSession.sessionId,
      status: 'cancelled',
      reason: 'Session cancelled',
    });

    await sendSessionUpdateToCrm({
      sessionId: cancelledSession.sessionId,
      sessionName: cancelledSession.title,
      newTime: `${formattedDate}T${cancelledSession.startTime}`,
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
  const current = await getSessionById(sessionId);
  if (!current) return null;

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

  const updated = await query(
    `UPDATE "Session" SET
      "date"      = $1,
      "startTime" = $2,
      "endTime"   = $3
     WHERE "sessionId" = $4
     RETURNING *`,
    [data.date, data.startTime, data.endTime, sessionId]
  );

  const currentDate = formatDate(current.date);

  // ── Log het verzetten via de changelog service ──
  await createLog({
    sessionId,
    oldStartTime: `${currentDate} ${current.startTime}`,
    newStartTime: `${data.date} ${data.startTime}`,
    oldEndTime: `${currentDate} ${current.endTime}`,
    newEndTime: `${data.date} ${data.endTime}`,
    reason: data.reason,
  });

  const rescheduledSession = updated.rows[0];

  let newLocation = 'Onbekend';
 if (current.locationId) {
    const location = await getLocationById(current.locationId);
    newLocation = location?.roomName || 'Onbekend';
  }

  await sendSessionRescheduled({
    sessionId,
    oldDate: currentDate,
    oldStartTime: current.startTime,
    oldEndTime: current.endTime,
    newDate: data.date,
    newStartTime: data.startTime,
    newEndTime: data.endTime,
    newLocation,
    reason: data.reason,
  });

  await sendSessionUpdateToCrm({
    sessionId,
    sessionName: current.title,
    newTime: `${data.date}T${data.startTime}`,
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