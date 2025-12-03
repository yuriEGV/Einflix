import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import app from './app.js';

// Conectar a MongoDB SOLO cuando la función serverless se ejecute
await connectDB();

// Exportar la app para Vercel
export default app;
