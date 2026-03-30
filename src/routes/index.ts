import { Router } from 'express';
import sessionRoutes from './session.routes';
import locationRoutes from './location.routes';
import speakerRoutes from './speaker.routes';

const router = Router();

router.use('/sessions', sessionRoutes);
router.use('/locations', locationRoutes);
router.use('/speakers', speakerRoutes);

export default router;