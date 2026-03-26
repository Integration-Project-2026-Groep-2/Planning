import { Router, Request, Response } from 'express';
import {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
} from '../services/session.service';

const router = Router();

// GET /sessions — alle sessies ophalen
router.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await getAllSessions();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen sessies' });
  }
});

// GET /sessions/:id — één sessie ophalen
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

// POST /sessions — nieuwe sessie aanmaken
router.post('/', async (req: Request, res: Response) => {
  try {
    const session = await createSession(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij aanmaken sessie' });
  }
});

// PUT /sessions/:id — sessie wijzigen
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const session = await updateSession(req.params.id as string, req.body);
    if (!session) {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij wijzigen sessie' });
  }
});

// DELETE /sessions/:id — sessie verwijderen
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

export default router;