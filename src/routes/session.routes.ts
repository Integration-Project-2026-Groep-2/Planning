import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  cancelSession,
  rescheduleSession,
  deleteSession,
} from '../services/session.service';

const router = Router();

// ── Zod schemas (validatieregels) ──

const CreateSessionSchema = z.object({
  title:       z.string().min(1, 'Titel is verplicht'),
  description: z.string().optional(),
  date:        z.string().min(1, 'Datum is verplicht'),
  startTime:   z.string().min(1, 'Starttijd is verplicht'),
  endTime:     z.string().min(1, 'Eindtijd is verplicht'),
  status:      z.enum(['actief', 'geannuleerd', 'volzet', 'concept']).optional(),
  locationId:  z.string().uuid('locationId moet een geldig UUID zijn').optional(),
  capacity:    z.number().int().positive('Capaciteit moet groter zijn dan 0'),
}).refine(
  (data) => data.endTime > data.startTime,
  { message: 'Eindtijd moet na starttijd liggen', path: ['endTime'] }
);

const UpdateSessionSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  date:        z.string().optional(),
  startTime:   z.string().optional(),
  endTime:     z.string().optional(),
  status:      z.enum(['actief', 'geannuleerd', 'volzet', 'concept']).optional(),
  locationId:  z.string().uuid().optional(),
  capacity:    z.number().int().positive().optional(),
});

const RescheduleSessionSchema = z.object({
  date:      z.string().min(1, 'Datum is verplicht'),
  startTime: z.string().min(1, 'Starttijd is verplicht'),
  endTime:   z.string().min(1, 'Eindtijd is verplicht'),
  reason:    z.string().min(1, 'Reden is verplicht'),
}).refine(
  (data) => data.endTime > data.startTime,
  { message: 'Eindtijd moet na starttijd liggen', path: ['endTime'] }
);

// ── GET /sessions ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await getAllSessions();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen sessies' });
  }
});

// ── GET /sessions/:id ──
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSessionById(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen sessie' });
  }
});

// ── POST /sessions ──
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const session = await createSession(parsed.data);
    res.status(201).json(session);
  } catch (err: any) {
    if (err.message === 'LOCATION_CONFLICT') {
      res.status(409).json({ error: 'Locatie is al bezet op dit tijdslot' });
      return;
    }
    res.status(500).json({ error: 'Fout bij aanmaken sessie' });
  }
});

// ── PUT /sessions/:id ──
router.put('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
res.status(400).json({ error: parsed.error.flatten() });    return;
  }
  try {
    const session = await updateSession(req.params.id as string, parsed.data);
    if (!session) {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }
    res.json(session);
  } catch (err: any) {
    if (err.message === 'LOCATION_CONFLICT') {
      res.status(409).json({ error: 'Locatie is al bezet op dit tijdslot' });
      return;
    }
    res.status(500).json({ error: 'Fout bij wijzigen sessie' });
  }
});

// ── DELETE /sessions/:id ──
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const session = await deleteSession(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }
    res.json({ message: 'Sessie verwijderd', session });
  } catch (err) {
    res.status(500).json({ error: 'Fout bij verwijderen sessie' });
  }
});

// ── PATCH /sessions/:id/cancel ──
router.patch('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const session = await cancelSession(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }
    res.json({ message: 'Sessie geannuleerd', session });
  } catch (err) {
    res.status(500).json({ error: 'Fout bij annuleren sessie' });
  }
});

// ── PATCH /sessions/:id/reschedule ──
router.patch('/:id/reschedule', async (req: Request, res: Response) => {
  const parsed = RescheduleSessionSchema.safeParse(req.body);
  if (!parsed.success) {
res.status(400).json({ error: parsed.error.flatten() });    return;
  }
  try {
    const session = await rescheduleSession(req.params.id as string, parsed.data);
    if (!session) {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }
    res.json({ message: 'Sessie verzet', session });
  } catch (err: any) {
    if (err.message === 'LOCATION_CONFLICT') {
      res.status(409).json({ error: 'Locatie is al bezet op dit tijdslot' });
      return;
    }
    res.status(500).json({ error: 'Fout bij verzetten sessie' });
  }
});

export default router;
