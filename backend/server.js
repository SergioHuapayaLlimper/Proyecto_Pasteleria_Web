// server.js
// -----------------------------------------------------
// Arranque en Docker / local: aplica las migraciones pendientes
// y levanta el servidor. (En Vercel se usa index.js de la raíz.)
// -----------------------------------------------------

const app = require('./app');
const { probarConexion } = require('./config/db');
const { ejecutarMigraciones } = require('./migrar');

const PORT = process.env.PORT || 3000;

// Aplica las migraciones pendientes (cambios de estructura sin borrar datos)
// antes de empezar a atender peticiones.
async function iniciar() {
  try {
    await ejecutarMigraciones();
  } catch (error) {
    console.error('❌ No se pudieron aplicar las migraciones:', error.message);
    process.exit(1);
  }

  app.listen(PORT, async () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    await probarConexion();
  });
}

iniciar();
