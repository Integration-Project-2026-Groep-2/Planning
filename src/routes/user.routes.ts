import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
} from '../services/user.service';

const router = Router();

const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName:  z.string().min(1).optional(),
  email:     z.string().email('Ongeldig e-mailadres').optional(),
  role:      z.enum(['EVENT_MANAGER', 'VISITOR']).optional(),
  company:   z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, role, company } = req.body;
    if (!firstName || !lastName || !email || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (!['EVENT_MANAGER', 'VISITOR'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    const user = await createUser({ firstName, lastName, email, role, company });
    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    res.status(500).json({ error: 'Error creating user' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen users' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id as string);
    if (!user) {
      res.status(404).json({ error: 'User niet gevonden' });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen user' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const user = await updateUser(req.params.id as string, parsed.data);
    if (!user) {
      res.status(404).json({ error: 'User niet gevonden' });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij wijzigen user' });
  }
});

router.patch('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const user = await deactivateUser(req.params.id as string);
    if (!user) {
      res.status(404).json({ error: 'User niet gevonden' });
      return;
    }
    res.json({ message: 'User gedeactiveerd', user });
  } catch (err) {
    res.status(500).json({ error: 'Fout bij deactiveren user' });
  }
});

export default router;