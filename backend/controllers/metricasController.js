// metricasController.js
// -----------------------------------------------------
// Métricas para el panel administrativo (HU02).
// Adaptado a bd_reposteria: tabla "pedidos" con id_pedido y estado.
// RF-04, RF-05, RF-06
// -----------------------------------------------------

const { pool } = require('../config/db');
const { filtroRangoFechas, validarRangoFechas } = require('../utils/filtros');

// GET /api/metricas/resumen?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
// Totales del dashboard. Si se envían fechas, pedidos, ventas y consultas
// se calculan solo dentro de ese rango (RF-05).
exports.resumenGeneral = async (req, res) => {
    const { desde, hasta } = req.query;
    const errorFechas = validarRangoFechas(desde, hasta);
    if (errorFechas) return res.status(400).json({ mensaje: errorFechas });

    const f = filtroRangoFechas(desde, hasta);

    try {
        const [[{ totalPedidos }]] = await pool.query(
            `SELECT COUNT(*) AS totalPedidos FROM pedidos WHERE 1=1 ${f.sql}`, f.params
        );

        const [porEstado] = await pool.query(
            `SELECT estado, COUNT(*) AS cantidad
             FROM pedidos WHERE 1=1 ${f.sql} GROUP BY estado`, f.params
        );

        // Ventas: solo pedidos completados
        const [[{ ventasTotales }]] = await pool.query(
            `SELECT IFNULL(SUM(total), 0) AS ventasTotales
             FROM pedidos WHERE estado = 'Completado' ${f.sql}`, f.params
        );

        const [consultas] = await pool.query(
            `SELECT tipo, COUNT(*) AS cantidad
             FROM consultas WHERE 1=1 ${f.sql} GROUP BY tipo`, f.params
        );

        // Productos activos: no depende de las fechas
        const [[{ totalProductos }]] = await pool.query(
            `SELECT COUNT(*) AS totalProductos FROM productos WHERE estado = 'activo'`
        );

        res.json({
            totalPedidos: Number(totalPedidos),
            ventasTotales: Number(ventasTotales),
            totalProductos: Number(totalProductos),
            porEstado: porEstado.map(e => ({ ...e, cantidad: Number(e.cantidad) })),
            consultas: consultas.map(c => ({ ...c, cantidad: Number(c.cantidad) })),
            rango: { desde: desde || null, hasta: hasta || null }
        });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ mensaje: 'Error al obtener métricas' });
    }
};

// GET /api/metricas/por-fecha?desde=...&hasta=... -> Filtro por fecha (RF-05)
exports.metricasPorFecha = async (req, res) => {
    const { desde, hasta } = req.query;
    const errorFechas = validarRangoFechas(desde, hasta);
    if (errorFechas) return res.status(400).json({ mensaje: errorFechas });

    let sql = `
        SELECT DATE(creado_en) AS fecha,
               COUNT(*) AS pedidos,
               IFNULL(SUM(total), 0) AS monto
        FROM pedidos
        WHERE 1=1
    `;
    const filtro = filtroRangoFechas(desde, hasta);
    sql += filtro.sql + ' GROUP BY DATE(creado_en) ORDER BY fecha DESC';
    const params = filtro.params;

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
    const errorFechas = validarRangoFechas(desde, hasta);
    if (errorFechas) return res.status(400).json({ mensaje: errorFechas });

    let sql = `
        SELECT codigo_pedido, cliente_nombre AS cliente, metodo_pago, 
               estado, total AS monto_total, creado_en,
               modo_entrega, DATE_FORMAT(fecha_entrega, '%Y-%m-%d') AS fecha_entrega,
               direccionEntrega AS direccion_entrega
        FROM pedidos 
        WHERE 1=1
    `;
    const filtro = filtroRangoFechas(desde, hasta);
    sql += filtro.sql + ' ORDER BY creado_en DESC';
    const params = filtro.params;

    try {
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al exportar métricas:', error);
        res.status(500).json({ mensaje: 'Error al exportar' });
    }
};