// -----------------------------------------------------
// -----------------------------------------------------
// Punto de entrada del backend. Levanta el servidor Express,
// conecta con MySQL y registra las rutas de la API.
// -----------------------------------------------------

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { probarConexion } = require('./config/db');
const { ejecutarMigraciones } = require('./migrar');
const authRoutes = require('./routes/authRoutes');
const productosRoutes = require('./routes/productosRoutes');
const configRoutes = require('./routes/configRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const metricasRoutes = require('./routes/metricasRoutes');
const personalRoutes = require('./routes/personalRoutes');
const categoriasRoutes = require('./routes/categoriasRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Sirve el frontend (carpeta frontend/public) como sitio estatico.
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// ---- Rutas de la API ----
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/config', configRoutes); 
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/categorias', categoriasRoutes);

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
