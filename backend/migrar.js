// migrar.js
// -----------------------------------------------------
// Ejecuta las migraciones pendientes de la carpeta /migraciones.
// Una migración es un archivo .js que modifica la estructura de la BD
// SIN borrar datos (agregar tablas, columnas, índices, etc.).
//
// - Se ejecuta automáticamente al iniciar el servidor (server.js).
// - También se puede ejecutar a mano:  npm run migrar
// - Cada migración se registra en la tabla "migraciones" y no se repite.
// - Las migraciones están escritas para ser seguras de repetir
//   (verifican si el cambio ya existe antes de aplicarlo).
// -----------------------------------------------------

const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

const CARPETA = path.join(__dirname, 'migraciones');

// ---- Utilidades para escribir migraciones idempotentes ----
async function existeTabla(con, tabla) {
    const [rows] = await con.query(
        `SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [tabla]);
    return rows.length > 0;
}

async function existeColumna(con, tabla, columna) {
    const [rows] = await con.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [tabla, columna]);
    return rows.length > 0;
}

async function existeRestriccion(con, tabla, nombre) {
    const [rows] = await con.query(
        `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`, [tabla, nombre]);
    return rows.length > 0;
}

const utilidades = { existeTabla, existeColumna, existeRestriccion };

async function ejecutarMigraciones({ silencioso = false } = {}) {
    const log = (...m) => { if (!silencioso) console.log(...m); };
    const con = await pool.getConnection();

    try {
        await con.query(`
            CREATE TABLE IF NOT EXISTS migraciones (
                nombre      VARCHAR(150) PRIMARY KEY,
                aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

        const [aplicadas] = await con.query('SELECT nombre FROM migraciones');
        const yaAplicadas = new Set(aplicadas.map(m => m.nombre));

        const archivos = fs.existsSync(CARPETA)
            ? fs.readdirSync(CARPETA).filter(f => f.endsWith('.js')).sort()
            : [];
        const pendientes = archivos.filter(f => !yaAplicadas.has(f));

        if (!pendientes.length) {
            log('🗄️  Base de datos al día (sin migraciones pendientes).');
            return [];
        }

        for (const archivo of pendientes) {
            const migracion = require(path.join(CARPETA, archivo));
            log(`🗄️  Aplicando migración: ${archivo} — ${migracion.descripcion || ''}`);
            await migracion.up(con, utilidades);
            await con.query('INSERT INTO migraciones (nombre) VALUES (?)', [archivo]);
        }
        log(`✅ ${pendientes.length} migración(es) aplicada(s).`);
        return pendientes;
    } finally {
        con.release();
    }
}

module.exports = { ejecutarMigraciones, utilidades };

// Ejecución manual: node migrar.js
if (require.main === module) {
    ejecutarMigraciones()
        .then(() => process.exit(0))
        .catch(err => { console.error('❌ Error en migraciones:', err.message); process.exit(1); });
}
