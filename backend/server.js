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
const authRoutes = require('./routes/authRoutes');
const productosRoutes = require('./routes/productosRoutes');
const configRoutes = require('./routes/configRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const metricasRoutes = require('./routes/metricasRoutes');

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await probarConexion();
});