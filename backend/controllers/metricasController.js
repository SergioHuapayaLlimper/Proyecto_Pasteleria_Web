// metricasController.js
// -----------------------------------------------------
// Métricas para el panel administrativo (HU02).
// Adaptado a bd_reposteria: tabla "pedidos" con id_pedido y estado.
// RF-04, RF-05, RF-06
// -----------------------------------------------------

const { pool } = require('../config/db');

// GET /api/metricas/resumen -> Totales generales del dashboard
exports.resumenGeneral = async (req, res) => {
    try {
        // Total de pedidos
        const [[{ totalPedidos }]] = await pool.query(
            'SELECT COUNT(*) AS totalPedidos FROM pedidos'
        );

        // Pedidos por estado
        const [porEstado] = await pool.query(
            `SELECT estado, COUNT(*) AS cantidad 
             FROM pedidos GROUP BY estado`
        );

        // Ventas totales (solo pedidos completados)
        const [[{ ventasTotales }]] = await pool.query(
            `SELECT IFNULL(SUM(total), 0) AS ventasTotales 
             FROM pedidos WHERE estado = 'Completado'`
        );

        // Consultas por tipo
        const [consultas] = await pool.query(
            `SELECT tipo, COUNT(*) AS cantidad 
             FROM consultas GROUP BY tipo`
        );

        // Productos activos
        const [[{ totalProductos }]] = await pool.query(
            `SELECT COUNT(*) AS totalProductos 
             FROM productos WHERE estado = 'activo'`
        );

        res.json({
            totalPedidos,
            ventasTotales,
            totalProductos,
            porEstado,
            consultas
        });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ mensaje: 'Error al obtener métricas' });
    }
};

// GET /api/metricas/por-fecha?desde=...&hasta=... -> Filtro por fecha (RF-05)
exports.metricasPorFecha = async (req, res) => {
    const { desde, hasta } = req.query;

    let sql = `
        SELECT DATE(creado_en) AS fecha,
               COUNT(*) AS pedidos,
               IFNULL(SUM(total), 0) AS monto
        FROM pedidos
        WHERE 1=1
    `;
    const params = [];

    if (desde) { sql += ' AND DATE(creado_en) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(creado_en) <= ?'; params.push(hasta); }

    sql += ' GROUP BY DATE(creado_en) ORDER BY fecha DESC';

    try {
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener métricas por fecha:', error);
        res.status(500).json({ mensaje: 'Error al obtener métricas' });
    }
};

// GET /api/metricas/exportar -> Datos para exportar a Excel (RF-06)
exports.exportarMetricas = async (req, res) => {
    const { desde, hasta } = req.query;

    let sql = `
        SELECT codigo_pedido, cliente_nombre AS cliente, metodo_pago, 
               estado, total AS monto_total, creado_en
        FROM pedidos 
        WHERE 1=1
    `;
    const params = [];

    if (desde) { sql += ' AND DATE(creado_en) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(creado_en) <= ?'; params.push(hasta); }

    sql += ' ORDER BY creado_en DESC';

    try {
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al exportar métricas:', error);
        res.status(500).json({ mensaje: 'Error al exportar' });
    }
};