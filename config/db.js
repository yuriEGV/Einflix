// config/db.js
import mongoose from 'mongoose';

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("❌ No se encontró MONGO_URI en el entorno");
    process.exit(1);
  }

  if (global.mongoose.conn) return global.mongoose.conn;

  if (!global.mongoose.promise) {
    mongoose.set('strictQuery', true);

    global.mongoose.promise = mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      bufferCommands: false,
    }).then((m) => {
      console.log("✅ Conectado a MongoDB");
      return m;
    });
  }

  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}

export default connectDB;
