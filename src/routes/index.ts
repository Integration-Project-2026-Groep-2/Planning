import { Router } from 'express';
import sessionRoutes from './session.routes';

const router = Router();

router.use('/sessions', sessionRoutes);

export default router;