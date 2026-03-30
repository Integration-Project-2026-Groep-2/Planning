import { query } from '../db';
import { CreateLocationDTO, UpdateLocationDTO } from '../models/location.model';

// ── Alle locaties ophalen ──
export const getAllLocations = async () => {
  const result = await query(
    `SELECT * FROM "Location" ORDER BY "roomName"`
  );
  return result.rows;
};

// ── Één locatie ophalen op ID ──
export const getLocationById = async (locationId: string) => {
  const result = await query(
    `SELECT * FROM "Location" WHERE "locationId" = $1`,
    [locationId]
  );
  return result.rows[0] || null;
};

// ── Nieuwe locatie aanmaken ──
export const createLocation = async (data: CreateLocationDTO) => {
  const result = await query(
    `INSERT INTO "Location"
      ("roomName", "address", "capacity", "status")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.roomName,
      data.address || null,
      data.capacity,
      data.status || 'beschikbaar',
    ]
  );
  return result.rows[0];
};

// ── Locatie wijzigen ──
export const updateLocation = async (locationId: string, data: UpdateLocationDTO) => {
  const result = await query(
    `UPDATE "Location" SET
      "roomName" = COALESCE($1, "roomName"),
      "address"  = COALESCE($2, "address"),
      "capacity" = COALESCE($3, "capacity"),
      "status"   = COALESCE($4, "status")
     WHERE "locationId" = $5
     RETURNING *`,
    [
      data.roomName,
      data.address,
      data.capacity,
      data.status,
      locationId,
    ]
  );
  return result.rows[0] || null;
};

// ── Locatie verwijderen ──
export const deleteLocation = async (locationId: string) => {
  const result = await query(
    `DELETE FROM "Location" WHERE "locationId" = $1 RETURNING *`,
    [locationId]
  );
  return result.rows[0] || null;
};
