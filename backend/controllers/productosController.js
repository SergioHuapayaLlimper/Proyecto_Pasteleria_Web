// productosController.js
// -----------------------------------------------------
// CRUD de productos. Alimenta el catálogo público y el panel admin.
// Adaptado a bd_reposteria: tabla "productos" con id_producto.
// RF-07, RF-08, RF-09, RF-10
// -----------------------------------------------------

const { pool } = require('../config/db');

const { validarProducto } = require('../utils/validarCatalogo');

// Acepta id_categoria (combo del panel). Por compatibilidad también acepta
// "categoria" con el nombre, pero SOLO si esa categoría ya está registrada.
async function resolverIdCategoria(body) {
    if (body.id_categoria) return Number(body.id_categoria);
    if (body.categoria) {
        const [[cat]] = await pool.query(
            'SELECT id_categoria FROM categorias WHERE nombre = ?', [String(body.categoria).trim()]
        );
        return cat ? cat.id_categoria : null;
    }
    return null;
}

// Verifica que la categoría exista y esté activa.
// Al editar, se permite conservar la categoría actual aunque esté inactiva.
async function verificarCategoria(idCategoria, idCategoriaActual = null) {
    const [[cat]] = await pool.query(
        'SELECT activo FROM categorias WHERE id_categoria = ?', [idCategoria]
    );
    if (!cat) return 'La categoría seleccionada no existe.';
    if (!cat.activo && idCategoria !== idCategoriaActual) {
        return 'La categoría seleccionada está desactivada.';
    }
    return null;
}

// GET /api/productos -> Lista todos los productos activos (público)
exports.listarProductos = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.id_producto AS id, p.nombre, p.descripcion, p.precio,
                    c.nombre AS categoria, p.imagen_url, p.estado
             FROM productos p
             JOIN categorias c ON c.id_categoria = p.id_categoria
             WHERE p.estado = 'activo'
             ORDER BY p.creado_en DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al listar productos:', error);
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
};

// GET /api/productos/todos -> Lista TODOS (activos e inactivos) solo para admin
exports.listarTodos = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.id_producto AS id, p.nombre, p.descripcion, p.precio,
                    p.id_categoria, c.nombre AS categoria, p.imagen_url, p.estado,
                    p.creado_en
             FROM productos p
             JOIN categorias c ON c.id_categoria = p.id_categoria
             ORDER BY p.creado_en DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al listar todos los productos:', error);
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
};

// GET /api/productos/:id -> Obtiene un producto por ID
exports.obtenerProducto = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.id_producto AS id, p.nombre, p.descripcion, p.precio,
                    p.id_categoria, c.nombre AS categoria, p.imagen_url, p.estado
             FROM productos p
             JOIN categorias c ON c.id_categoria = p.id_categoria
             WHERE p.id_producto = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ mensaje: 'Error al obtener producto' });
    }
};

// POST /api/productos -> Crear un producto - RF-07
exports.crearProducto = async (req, res) => {
    try {
        const { datos, errores } = validarProducto({ ...req.body, id_categoria: await resolverIdCategoria(req.body) });
        if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

        const errorCategoria = await verificarCategoria(datos.id_categoria);
        if (errorCategoria) return res.status(400).json({ mensaje: errorCategoria });

        const [result] = await pool.query(
            `INSERT INTO productos (nombre, descripcion, precio, id_categoria, imagen_url, estado)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [datos.nombre, datos.descripcion, datos.precio, datos.id_categoria, datos.imagen_url, datos.estado]
        );

        res.status(201).json({
            mensaje: 'Producto creado correctamente',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ mensaje: 'Error al crear producto' });
    }
};

// PUT /api/productos/:id -> Editar un producto - RF-08
exports.editarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [[actual]] = await pool.query(
            'SELECT id_categoria FROM productos WHERE id_producto = ?', [id]
        );
        if (!actual) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        const { datos, errores } = validarProducto({ ...req.body, id_categoria: await resolverIdCategoria(req.body) });
        if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

        const errorCategoria = await verificarCategoria(datos.id_categoria, actual.id_categoria);
        if (errorCategoria) return res.status(400).json({ mensaje: errorCategoria });

        await pool.query(
            `UPDATE productos
             SET nombre = ?, descripcion = ?, precio = ?, id_categoria = ?, imagen_url = ?, estado = ?
             WHERE id_producto = ?`,
            [datos.nombre, datos.descripcion, datos.precio, datos.id_categoria, datos.imagen_url, datos.estado, id]
        );

        res.json({ mensaje: 'Producto actualizado correctamente' });
    } catch (error) {
        console.error('Error al editar producto:', error);
        res.status(500).json({ mensaje: 'Error al editar producto' });
    }
};

// DELETE /api/productos/:id -> Desactivar un producto (solo admin) - RF-09
exports.desactivarProducto = async (req, res) => {
    try {
        const [result] = await pool.query(
            `UPDATE productos SET estado = 'inactivo' WHERE id_producto = ?`,
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
        res.json({ mensaje: 'Producto desactivado correctamente' });
    } catch (error) {
        console.error('Error al desactivar producto:', error);
        res.status(500).json({ mensaje: 'Error al desactivar producto' });
    }
};