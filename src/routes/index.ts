import { Router } from 'express';
import sessionRoutes from './session.routes';
import locationRoutes from './location.routes';
import speakerRoutes from './speaker.routes';
import registrationRoutes from './registration.routes';
import changelogRoutes from './changelog.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/sessions', sessionRoutes);
router.use('/sessions/:id/register', registrationRoutes);
router.use('/sessions/:id/logs', changelogRoutes);
router.use('/locations', locationRoutes);
router.use('/speakers', speakerRoutes);
router.use('/users', userRoutes);

export default router;