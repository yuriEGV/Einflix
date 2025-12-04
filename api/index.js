import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "../config/db.js";
import routes from "../routes/index.js";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Conectar Mongo
connectDB();

// Rutas principales
app.use("/api", routes);

// Ruta de prueba raíz
app.get("/", (req, res) => {
  res.json({ message: "Einflix API funcionando desde Vercel" });
});

export default app;
