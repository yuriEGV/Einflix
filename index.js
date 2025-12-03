import dotenv from 'dotenv';
dotenv.config(); // Debe ir primero

import connectDB from './config/db.js';
import app from './app.js';

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    console.log("✅ MongoDB conectado");
    app.listen(PORT, () => console.log(`🚀 Servidor levantado en el puerto ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB:", err);
    process.exit(1);
  });
