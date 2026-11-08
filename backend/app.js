// app.js
// -----------------------------------------------------
// Define la aplicación Express (middlewares y rutas de la API).
// Se exporta para usarla en dos entornos:
//   - Docker / local: server.js la arranca con app.listen
//   - Vercel: index.js (raíz del repo) la exporta como función
// -----------------------------------------------------

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool } = require('./config/db');
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

// Sirve el frontend en Docker/local. En Vercel se ignora: allí los archivos
// estáticos se publican desde la carpeta public/ (ver scripts/preparar-vercel.js).
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// ---- Estado del sistema (RNF03): confirma que la API y la BD responden ----
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ estado: 'ok', baseDeDatos: 'ok', fecha: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ estado: 'error', baseDeDatos: 'sin conexión' });
    }
});

// ---- Rutas de la API ----
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/config', configRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/categorias', categoriasRoutes);

// Ruta de API inexistente
app.use('/api', (req, res) => {
    res.status(404).json({ mensaje: 'Recurso no encontrado' });
});

// Manejo centralizado de errores no controlados (JSON mal formado, etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo de la petición no es un JSON válido.' });
    }
    console.error('Error no controlado:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
});

module.exports = app;
