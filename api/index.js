import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import connectDB from "../config/db.js"; // 🔥 CORREGIDO

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Conectar Mongo
connectDB();

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "Einflix API funcionando desde Vercel" });
});

export default app;
