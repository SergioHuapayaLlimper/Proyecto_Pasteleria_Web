// pedidosController.js
// -----------------------------------------------------
// Registra pedidos del cliente y permite al admin verlos/filtrarlos.
// Adaptado a bd_reposteria: tabla "pedidos" con id_pedido, codigo_pedido.
// HU07, HU08 / RF-19, RF-20, RF-21, RF-22 a RF-25
// -----------------------------------------------------

const { pool } = require('../config/db');
const { filtroRangoFechas, validarRangoFechas } = require('../utils/filtros');

// Valores permitidos (un solo lugar para validarlos)
const METODOS_PAGO = ['Efectivo', 'Yape'];
const ESTADOS_PEDIDO = ['Pendiente', 'Completado', 'Cancelado'];
const TIPOS_CONSULTA = ['whatsapp', 'contacto', 'pedido'];

// Genera un código único para el pedido tipo "PED-20241215-1234"
function generarCodigoPedido() {
    const fecha = new Date();
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `PED-${y}${m}${d}-${random}`;
}

// Subtotal de una línea del pedido: { precio, cantidad }
function calcularSubtotal(p) {
    return parseFloat(p.precio) * parseInt(p.cantidad);
}

// Valida los datos del pedido (RF-24, RF-25).
// Devuelve el mensaje de error o null si todo es correcto.
function validarPedido({ cliente_nombre, cliente_telefono, metodo_pago, productos }) {
    if (!cliente_nombre || !cliente_telefono || !metodo_pago || !productos || !productos.length) {
        return 'Todos los campos son obligatorios';
    }

    // Validar formato de teléfono
    const telefonoLimpio = cliente_telefono.replace(/\D/g, '');
    if (telefonoLimpio.length < 9) {
        return 'El teléfono debe tener al menos 9 dígitos';
    }

    // Validar método de pago (RF-24)
    if (!METODOS_PAGO.includes(metodo_pago)) {
        return 'Método de pago no válido';
    }

    return null;
}

// Busca el cliente por teléfono; si no existe, lo crea. Devuelve su id.
// Recibe la conexión para participar en la misma transacción.
async function obtenerOCrearCliente(conexion, nombre, telefono) {
    const [clienteExistente] = await conexion.query(
        'SELECT id_cliente FROM cliente WHERE telefono = ?',
        [telefono]
    );

    if (clienteExistente.length > 0) {
        return clienteExistente[0].id_cliente;
    }

    const [nuevoCliente] = await conexion.query(
        'INSERT INTO cliente (nombre, telefono, direccion, referencia) VALUES (?, ?, ?, ?)',
        [nombre, telefono, 'Por definir', 'Por definir']
    );
    return nuevoCliente.insertId;
}

// POST /api/pedidos -> Crear un pedido desde la landing (público) - HU08
exports.crearPedido = async (req, res) => {
    const {
        cliente_nombre,
        cliente_telefono,
        metodo_pago,
        productos // Array de { id, nombre, precio, cantidad }
    } = req.body;

    // ---- VALIDACIONES (RF-24, RF-25) ----
    const errorValidacion = validarPedido({ cliente_nombre, cliente_telefono, metodo_pago, productos });
    if (errorValidacion) {
        return res.status(400).json({ mensaje: errorValidacion });
    }

    // Calcular monto total
    const total = productos.reduce((suma, p) => suma + calcularSubtotal(p), 0);

    const codigo_pedido = generarCodigoPedido();
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        // 1. Buscar o crear el cliente (por teléfono)
        const id_cliente = await obtenerOCrearCliente(conexion, cliente_nombre, cliente_telefono);

        // 2. Insertar el pedido
        const [resultPedido] = await conexion.query(
            `INSERT INTO pedidos 
             (codigo_pedido, id_cliente, cliente_nombre, cliente_telefono, total, metodo_pago, estado, fecha_pedido)
             VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', NOW())`,
            [codigo_pedido, id_cliente, cliente_nombre, cliente_telefono, total, metodo_pago]
        );

        const id_pedido = resultPedido.insertId;

        // 3. Insertar cada detalle del pedido
        for (const p of productos) {
            const subtotal = calcularSubtotal(p);
            await conexion.query(
                `INSERT INTO detalle_pedidos 
                 (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [id_pedido, p.id, p.cantidad, p.precio, subtotal]
            );
        }

        // 4. Registrar la consulta tipo 'pedido' (para métricas - HU02)
        await conexion.query(
            `INSERT INTO consultas (tipo) VALUES ('pedido')`
        );

        await conexion.commit();

        res.status(201).json({
            mensaje: 'Pedido registrado correctamente',
            codigo_pedido,
            monto_total: total
        });

    } catch (error) {
        await conexion.rollback();
        console.error('Error al crear pedido:', error);
        res.status(500).json({ mensaje: 'Error al registrar el pedido' });
    } finally {
        conexion.release();
    }
};

// GET /api/pedidos -> Listar pedidos (solo admin, con filtros) - RF-19, RF-20
exports.listarPedidos = async (req, res) => {
    const { desde, hasta, estado } = req.query;
    const errorFechas = validarRangoFechas(desde, hasta);
    if (errorFechas) return res.status(400).json({ mensaje: errorFechas });

    let sql = `
        SELECT id_pedido AS id, codigo_pedido, cliente_nombre, cliente_telefono,
               metodo_pago, estado, total AS monto_total, creado_en
        FROM pedidos
        WHERE 1=1
    `;
    const filtroFechas = filtroRangoFechas(desde, hasta);
    sql += filtroFechas.sql;
    const params = [...filtroFechas.params];

    if (estado) { sql += ' AND estado = ?'; params.push(estado); }

    sql += ' ORDER BY creado_en DESC';

    try {
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al listar pedidos:', error);
        res.status(500).json({ mensaje: 'Error al obtener pedidos' });
    }
};

// GET /api/pedidos/:id -> Detalle completo de un pedido
exports.obtenerPedido = async (req, res) => {
    try {
        const [pedido] = await pool.query(
            `SELECT id_pedido AS id, codigo_pedido, cliente_nombre, cliente_telefono,
                    metodo_pago, estado, total AS monto_total, creado_en
             FROM pedidos WHERE id_pedido = ?`,
            [req.params.id]
        );

        if (pedido.length === 0) {
            return res.status(404).json({ mensaje: 'Pedido no encontrado' });
        }

        const [detalle] = await pool.query(
            `SELECT d.id_detalle AS id, d.cantidad, d.precio_unitario, d.subtotal,
                    p.nombre AS producto_nombre 
             FROM detalle_pedidos d
             JOIN productos p ON p.id_producto = d.id_producto
             WHERE d.id_pedido = ?`,
            [req.params.id]
        );

        res.json({ ...pedido[0], detalle });
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({ mensaje: 'Error al obtener pedido' });
    }
};

// PUT /api/pedidos/:id/estado -> Cambiar estado (solo admin) - RF-20
exports.cambiarEstado = async (req, res) => {
    const { estado } = req.body;

    if (!ESTADOS_PEDIDO.includes(estado)) {
        return res.status(400).json({ mensaje: 'Estado no válido' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE pedidos SET estado = ? WHERE id_pedido = ?',
            [estado, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Pedido no encontrado' });
        }

        res.json({ mensaje: 'Estado actualizado correctamente' });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ mensaje: 'Error al actualizar estado' });
    }
};

// POST /api/consultas -> Registrar consulta (whatsapp, contacto) - HU02
exports.registrarConsulta = async (req, res) => {
    const { tipo } = req.body;

    if (!TIPOS_CONSULTA.includes(tipo)) {
        return res.status(400).json({ mensaje: 'Tipo de consulta no válido' });
    }

    try {
        await pool.query('INSERT INTO consultas (tipo) VALUES (?)', [tipo]);
        res.status(201).json({ mensaje: 'Consulta registrada' });
    } catch (error) {
        console.error('Error al registrar consulta:', error);
        res.status(500).json({ mensaje: 'Error al registrar consulta' });
    }
};