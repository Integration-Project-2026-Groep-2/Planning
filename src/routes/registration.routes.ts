import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  registerParticipant,
  cancelRegistration,
} from '../services/registration.service';

const router = Router({ mergeParams: true });

// ── Zod schema ──
const RegisterSchema = z.object({
  participantId: z.string().uuid('participantId moet een geldig UUID zijn'),
  crmMasterId:   z.string().uuid('crmMasterId moet een geldig UUID zijn').optional(),
});

const CancelSchema = z.object({
  participantId: z.string().uuid('participantId moet een geldig UUID zijn'),
});

// ── POST /sessions/:id/register ──
router.post('/', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const registration = await registerParticipant(
      req.params.id as string,
      parsed.data
    );
    res.status(201).json(registration);
  } catch (err: any) {
    if (err.message === 'SESSION_NOT_FOUND') {
      res.status(404).json({ error: 'Sessie niet gevonden' });
      return;
    }
    if (err.message === 'SESSION_CANCELLED') {
      res.status(400).json({ error: 'Sessie is geannuleerd' });
      return;
    }
    if (err.message === 'ALREADY_REGISTERED') {
      res.status(409).json({ error: 'Deelnemer is al ingeschreven voor deze sessie' });
      return;
    }
    if (err.message === 'SESSION_FULL') {
      res.status(409).json({ error: 'Sessie is volzet' });
      return;
    }
    res.status(500).json({ error: 'Fout bij inschrijven' });
  }
});

// ── DELETE /sessions/:id/register ──
router.delete('/', async (req: Request, res: Response) => {
  const parsed = CancelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const registration = await cancelRegistration(
      req.params.id as string,
      parsed.data.participantId
    );
    res.status(200).json({ message: 'Inschrijving geannuleerd', registration });
  } catch (err: any) {
    if (err.message === 'REGISTRATION_NOT_FOUND') {
      res.status(404).json({ error: 'Inschrijving niet gevonden' });
      return;
    }
    res.status(500).json({ error: 'Fout bij annuleren inschrijving' });
  }
});

export default router;