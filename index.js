const app = require('./app'); // Corregido: ahora busca app.js en la misma carpeta

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});