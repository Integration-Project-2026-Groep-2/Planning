import { Router, Request, Response } from 'express';
import { createUser } from '../services/user.service';

const router = Router();

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

    const user = await createUser({
      firstName,
      lastName,
      email,
      role,
      company,
    });

    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    res.status(500).json({ error: 'Error creating user' });
  }
});

export default router;