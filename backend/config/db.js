// config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MONGO_URI no está definida en process.env");
    }

    await mongoose.connect(uri);
    console.log("MongoDB conectado correctamente");
  } catch (error) {
    console.error("CRITICAL ERROR: No se pudo conectar a MongoDB. Verifique su MONGO_URI y el whitelist de IP en Atlas.");
    console.error("Detalle del error:", error.message);
  }
};

export default connectDB;
