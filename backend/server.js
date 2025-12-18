// server.js
import dotenv from "dotenv";
import app from "./api/index.js";

dotenv.config();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});