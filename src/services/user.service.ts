import { query } from '../db';
import { CreateUserDTO, UpdateUserDTO } from '../models/user.model';
import { sendPlanningUserCreated }     from '../producers/planning.user.created.producer';
import { sendPlanningUserUpdated }     from '../producers/planning.user.updated.producer';
import { sendPlanningUserDeactivated } from '../producers/planning.user.deactivated.producer';

export const getAllUsers = async () => {
  const result = await query(
    `SELECT * FROM "User" ORDER BY "lastName", "firstName"`
  );
  return result.rows;
};

export const getUserById = async (userId: string) => {
  const result = await query(
    `SELECT * FROM "User" WHERE "userId" = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

export const createUser = async (data: CreateUserDTO) => {
  const result = await query(
    `INSERT INTO "User"
     ("firstName", "lastName", "email", "role", "company")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.role,
      data.company || null,
    ]
  );
  const user = result.rows[0];

  await sendPlanningUserCreated({
    id:        user.userId,
    email:     user.email,
    firstName: user.firstName,
    lastName:  user.lastName,
    role:      user.role,
    company:   user.company ?? undefined,
  });

  return user;
};

export const updateUser = async (userId: string, data: UpdateUserDTO) => {
  const result = await query(
    `UPDATE "User"
     SET "firstName" = COALESCE($1, "firstName"),
         "lastName"  = COALESCE($2, "lastName"),
         "email"     = COALESCE($3, "email"),
         "role"      = COALESCE($4, "role"),
         "company"   = COALESCE($5, "company")
     WHERE "userId" = $6
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.role,
      data.company,
      userId,
    ]
  );
  const updated = result.rows[0] || null;

  if (updated) {
    await sendPlanningUserUpdated({
      id:        updated.userId,
      email:     updated.email,
      firstName: updated.firstName,
      lastName:  updated.lastName,
      role:      updated.role,
      company:   updated.company ?? undefined,
    });
  }

  return updated;
};

export const deactivateUser = async (userId: string) => {
  const result = await query(
    `UPDATE "User" SET "isActive" = false WHERE "userId" = $1 RETURNING *`,
    [userId]
  );
  const deactivated = result.rows[0] || null;

  if (deactivated) {
    await sendPlanningUserDeactivated({
      id:    deactivated.userId,
      email: deactivated.email,
    });
  }

  return deactivated;
};