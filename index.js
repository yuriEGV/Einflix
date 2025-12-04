import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import app from './app.js';

// Necesario para evitar múltiples conexiones en Vercel
let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
    console.log("MongoDB conectado en Vercel");
  }

  return app(req, res);
}
