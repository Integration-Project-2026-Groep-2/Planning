import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../services/location.service';

const router = Router();

const CreateLocationSchema = z.object({
  roomName: z.string().min(1, 'Naam van de zaal is verplicht'),
  address:  z.string().optional(),
  capacity: z.number().int().positive('Capaciteit moet groter zijn dan 0'),
  status:   z.enum(['beschikbaar', 'gereserveerd', 'niet beschikbaar']).optional(),
});

const UpdateLocationSchema = z.object({
  roomName: z.string().min(1).optional(),
  address:  z.string().optional(),
  capacity: z.number().int().positive().optional(),
  status:   z.enum(['beschikbaar', 'gereserveerd', 'niet beschikbaar']).optional(),
});

// ── GET /locations ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const locations = await getAllLocations();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen locaties' });
  }
});

// ── GET /locations/:id ──
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const location = await getLocationById(req.params.id as string);
    if (!location) {
      res.status(404).json({ error: 'Locatie niet gevonden' });
      return;
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen locatie' });
  }
});

// ── POST /locations ──
router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const location = await createLocation(parsed.data);
    res.status(201).json(location);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Zaal met deze naam bestaat al' });
      return;
    }
    res.status(500).json({ error: 'Fout bij aanmaken locatie' });
  }
});
// ── PUT /locations/:id ──
router.put('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const location = await updateLocation(req.params.id as string, parsed.data);
    if (!location) {
      res.status(404).json({ error: 'Locatie niet gevonden' });
      return;
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij wijzigen locatie' });
  }
});

// ── DELETE /locations/:id ──
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const location = await deleteLocation(req.params.id as string);
    if (!location) {
      res.status(404).json({ error: 'Locatie niet gevonden' });
      return;
    }
    res.json({ message: 'Locatie verwijderd', location });
  } catch (err: any) {
    if (err.code === '23503') {
      res.status(409).json({ error: 'Locatie is nog gelinkt aan een sessie — verwijder eerst de sessie' });
      return;
    }
    res.status(500).json({ error: 'Fout bij verwijderen locatie' });
  }
});

export default router;
