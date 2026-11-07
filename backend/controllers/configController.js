// configController.js
// -----------------------------------------------------
// Obtiene y edita la configuración del negocio (clave-valor).
// RF-11 a RF-15
// -----------------------------------------------------

const { pool } = require('../config/db');
const { validarConfig } = require('../utils/validarConfig');

// GET /api/config -> Devuelve toda la configuración como objeto
exports.obtenerConfig = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT clave, valor FROM configuracion_negocio');
        const config = {};
        rows.forEach(r => { config[r.clave] = r.valor; });
        // Evita que el navegador muestre datos antiguos tras un cambio del admin
        res.set('Cache-Control', 'no-store');
        res.json(config);
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ mensaje: 'Error al obtener configuración' });
    }
};

// PUT /api/config -> Actualiza varios valores a la vez (solo admin)
exports.actualizarConfig = async (req, res) => {
    const { datos, errores } = validarConfig(req.body);

    if (errores.length) {
        return res.status(400).json({ mensaje: errores.join(' '), errores });
    }
    if (!Object.keys(datos).length) {
        return res.status(400).json({ mensaje: 'No se envió ningún dato de configuración válido.' });
    }

    try {
        const promesas = Object.entries(datos).map(([clave, valor]) =>
            pool.query(
                `INSERT INTO configuracion_negocio (clave, valor) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE valor = ?`,
                [clave, valor, valor]
            )
        );
        await Promise.all(promesas);
        res.json({ mensaje: 'Configuración actualizada correctamente' });
    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        res.status(500).json({ mensaje: 'Error al actualizar configuración' });
    }
};