import { query } from '../db';
import { CreateUserDTO } from '../models/user.model';
import { sendPlanningUserCreated } from '../producers/planning.user.created.producer';

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