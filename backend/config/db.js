const mysql = require('mysql2/promise');
require('dotenv').config();

// Zona horaria del negocio (Perú = -05:00). Se usa para que los filtros
// por día ("hoy", "este mes") coincidan con la hora local y no con UTC.
const ZONA_HORARIA = /^[+-]\d{2}:\d{2}$/.test(process.env.DB_TIMEZONE || '')
  ? process.env.DB_TIMEZONE
  : '-05:00';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: ZONA_HORARIA
});

// Cada conexión nueva trabaja en la zona horaria del negocio
pool.pool.on('connection', (conexion) => {
  conexion.query(`SET time_zone = '${ZONA_HORARIA}'`);
});

// Pequeña funcion para probar la conexion al iniciar el servidor.
async function probarConexion() {
  try {
    const conexion = await pool.getConnection();
    console.log('✅ Conectado a MySQL correctamente (base: ' + process.env.DB_NAME + ')');
    conexion.release();
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
  }
}

module.exports = { pool, probarConexion };