import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Necesario para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (videos, imágenes, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'api/uploads')));

// Importar rutas
import routes from './api/routes/index.js';
import paymentRoutes from './api/routes/paymentRoutes.js';
import streamRoutes from './api/routes/streamRoutes.js';
import userRoutes from './api/routes/authRoutes.js';   // ⬅️ AGREGADO

// Usar rutas
app.use('/api', routes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/users', userRoutes);                    // ⬅️ AGREGADO

export default app;
