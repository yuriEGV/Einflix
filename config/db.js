import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || "einflix"
    });

    console.log("MongoDB conectado 🚀");
  } catch (err) {
    console.error("Error conectando a MongoDB:", err);
  }
};

export default connectDB;
