import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import routes from "../routes/index.js";
import driveRoutes from "../routes/driveRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "Einflix API funcionando en Vercel" });
});

// Exporta como función serverless para Vercel
export default app;
