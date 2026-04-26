import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';

const router = Router({ mergeParams: true });

const AddSpeakerSchema = z.object({
  speakerId: z.string().uuid('speakerId moet een geldig UUID zijn'),
  role: z.string().optional(),
});

// ── GET /sessions/:id/speakers ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT ss.*, s."firstName", s."lastName", s."email", s."company"
       FROM "SessionSpeaker" ss
       JOIN "Speaker" s ON ss."speakerId" = s."speakerId"
       WHERE ss."sessionId" = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen sprekers van sessie' });
  }
});

// ── POST /sessions/:id/speakers ──
router.post('/', async (req: Request, res: Response) => {
  const parsed = AddSpeakerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = await query(
      `INSERT INTO "SessionSpeaker" ("sessionId", "speakerId", "role")
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, parsed.data.speakerId, parsed.data.role || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Spreker is al gelinkt aan deze sessie' });
      return;
    }
    res.status(500).json({ error: 'Fout bij linken spreker aan sessie' });
  }
});

// ── DELETE /sessions/:id/speakers/:speakerId ──
router.delete('/:speakerId', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `DELETE FROM "SessionSpeaker"
       WHERE "sessionId" = $1 AND "speakerId" = $2
       RETURNING *`,
      [req.params.id, req.params.speakerId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Koppeling niet gevonden' });
      return;
    }
    res.json({ message: 'Spreker verwijderd van sessie' });
  } catch (err) {
    res.status(500).json({ error: 'Fout bij verwijderen spreker van sessie' });
  }
});

export default router;