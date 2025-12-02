// config/db.js
const mongoose = require("mongoose");

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) throw new Error("❌ Falta MONGO_URI en el archivo .env");

  if (global.mongoose.conn) return global.mongoose.conn;

  if (!global.mongoose.promise) {
    mongoose.set("strictQuery", true);

    global.mongoose.promise = mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      bufferCommands: false,
    }).then((m) => m);
  }

  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}

module.exports = connectDB;
