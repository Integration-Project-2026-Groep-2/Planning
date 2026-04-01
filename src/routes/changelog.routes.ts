import { Router, Request, Response } from 'express';
import { getSessionById } from '../services/session.service';
import { getLogsForSession } from '../services/changelog.service';

const router = Router({ mergeParams: true });

// ── GET /sessions/:id/logs ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const session = await getSessionById(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }

    const logs = await getLogsForSession(req.params.id as string);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen changelog' });
  }
});

export default router;
