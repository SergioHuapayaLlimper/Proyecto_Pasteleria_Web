// configController.js
// -----------------------------------------------------
// Obtiene y edita la configuración del negocio (clave-valor).
// RF-11 a RF-15
// -----------------------------------------------------

const { pool } = require('../config/db');

// GET /api/config -> Devuelve toda la configuración como objeto
exports.obtenerConfig = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT clave, valor FROM configuracion_negocio');
        const config = {};
        rows.forEach(r => { config[r.clave] = r.valor; });
        res.json(config);
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ mensaje: 'Error al obtener configuración' });
    }
};

// PUT /api/config -> Actualiza varios valores a la vez (solo admin)
exports.actualizarConfig = async (req, res) => {
    const datos = req.body;
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