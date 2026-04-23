import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getAllSpeakers,
  getSpeakerById,
  createSpeaker,
  updateSpeaker,
  deactivateSpeaker,
} from '../services/speaker.service';

const router = Router();

// ── Zod schemas (validatieregels) ──

const CreateSpeakerSchema = z.object({
  firstName:   z.string().min(1, 'Voornaam is verplicht'),
  lastName:    z.string().min(1, 'Achternaam is verplicht'),
  email:       z.string().email('Ongeldig e-mailadres'),
  phoneNumber: z.string().optional(),
  company:     z.string().optional(),
});

const UpdateSpeakerSchema = z.object({
  firstName:   z.string().min(1).optional(),
  lastName:    z.string().min(1).optional(),
  email:       z.string().email('Ongeldig e-mailadres').optional(),
  phoneNumber: z.string().optional(),
  company:     z.string().optional(),
});

// ── GET /speakers ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const speakers = await getAllSpeakers();
    res.json(speakers);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen sprekers' });
  }
});

// ── GET /speakers/:id ──
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const speaker = await getSpeakerById(req.params.id as string);
    if (!speaker) {
      res.status(404).json({ error: 'Spreker niet gevonden' });
      return;
    }
    res.json(speaker);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen spreker' });
  }
});

// ── POST /speakers ──
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSpeakerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const speaker = await createSpeaker(parsed.data);
    res.status(201).json(speaker);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'E-mailadres is al in gebruik' });
      return;
    }
    res.status(500).json({ error: 'Fout bij aanmaken spreker' });
  }
});

// ── PUT /speakers/:id ──
router.put('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateSpeakerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const speaker = await updateSpeaker(req.params.id as string, parsed.data);
    if (!speaker) {
      res.status(404).json({ error: 'Spreker niet gevonden' });
      return;
    }
    res.json(speaker);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij wijzigen spreker' });
  }
});

// ── PATCH /speakers/:id/deactivate ──
router.patch('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const speaker = await deactivateSpeaker(req.params.id as string);
    if (!speaker) {
      res.status(404).json({ error: 'Spreker niet gevonden' });
      return;
    }
    res.json({ message: 'Spreker gedeactiveerd', speaker });
  } catch (err) {
    res.status(500).json({ error: 'Fout bij deactiveren spreker' });
  }
});

export default router;
