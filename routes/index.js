import { Router } from 'express';

import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import mediaRoutes from './mediaRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import streamRoutes from './streamRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import adminRoutes from './adminRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/media', mediaRoutes);
router.use('/payments', paymentRoutes);
router.use('/stream', streamRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);
router.use('/recommendations', recommendationRoutes);

export default router;


