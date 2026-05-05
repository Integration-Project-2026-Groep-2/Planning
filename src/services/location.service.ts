import { query } from '../db';
import { CreateLocationDTO, UpdateLocationDTO } from '../models/location.model';
import { sendLocationCreated }  from '../producers/planning.location.created.producer';
import { sendLocationUpdated }  from '../producers/planning.location.updated.producer';
import { sendLocationDeleted }  from '../producers/planning.location.deleted.producer';

export const getAllLocations = async () => {
  const result = await query(
    `SELECT * FROM "Location" ORDER BY "roomName"`
  );
  return result.rows;
};

export const getLocationById = async (locationId: string) => {
  const result = await query(
    `SELECT * FROM "Location" WHERE "locationId" = $1`,
    [locationId]
  );
  return result.rows[0] || null;
};

export const createLocation = async (data: CreateLocationDTO) => {
  // Duplicate check
  const existing = await query(
    `SELECT 1 FROM "Location" WHERE "roomName" = $1`,
    [data.roomName]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    const err: any = new Error('Zaal bestaat al');
    err.code = '23505';
    throw err;
  }

  const result = await query(
    `INSERT INTO "Location"
      ("roomName", "address", "capacity", "status")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.roomName, data.address || null, data.capacity, data.status || 'beschikbaar']
  );

  const created = result.rows[0];

  await sendLocationCreated({
    locationId: created.locationId,
    roomName:   created.roomName,
    capacity:   created.capacity,
    address:    created.address,
    status:     created.status,
  });

  return created;
};

export const updateLocation = async (locationId: string, data: UpdateLocationDTO) => {
  const result = await query(
    `UPDATE "Location" SET
      "roomName" = COALESCE($1, "roomName"),
      "address"  = COALESCE($2, "address"),
      "capacity" = COALESCE($3, "capacity"),
      "status"   = COALESCE($4, "status")
     WHERE "locationId" = $5
     RETURNING *`,
    [data.roomName, data.address, data.capacity, data.status, locationId]
  );

  const updated = result.rows[0] || null;

  if (updated) {
    await sendLocationUpdated({
      locationId: updated.locationId,
      roomName:   updated.roomName,
      capacity:   updated.capacity,
      address:    updated.address,
      status:     updated.status,
    });
  }

  return updated;
};

export const deleteLocation = async (locationId: string) => {
  const result = await query(
    `DELETE FROM "Location" WHERE "locationId" = $1 RETURNING *`,
    [locationId]
  );

  const deleted = result.rows[0] || null;

  if (deleted) {
    await sendLocationDeleted({
      locationId: deleted.locationId,
    });
  }

  return deleted;
};