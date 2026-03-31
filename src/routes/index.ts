import { Router } from 'express';
import sessionRoutes from './session.routes';
import locationRoutes from './location.routes';
import speakerRoutes from './speaker.routes';
import registrationRoutes from './registration.routes';

const router = Router();

router.use('/sessions', sessionRoutes);
router.use('/sessions/:id/register', registrationRoutes);
router.use('/locations', locationRoutes);
router.use('/speakers', speakerRoutes);

export default router;