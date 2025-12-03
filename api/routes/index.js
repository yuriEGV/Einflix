import express from 'express';
import authRoutes from "./authRoutes.js";
import userRoutes from './userRoutes.js';
import mediaRoutes from './mediaRoutes.js';
import adminRoutes from './adminRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';
import uploadRoutes from './uploadRoutes.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: "Einflix API funcionando 🚀" });
});

// Montar todas las rutas
router.use("/users", authRoutes);
router.use('/users', userRoutes);
router.use('/media', mediaRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/upload', uploadRoutes);

export default router;
