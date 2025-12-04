// api/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import routes from "../routes/index.js";

// Cargar variables de entorno desde .env en la raíz del proyecto
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
connectDB();

// Rutas principales
app.use("/api", routes);

// Ruta básica de prueba
app.get("/", (req, res) => {
  res.json({ message: "Einflix API funcionando" });
});

export default app;
