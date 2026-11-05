// productosController.js
// -----------------------------------------------------
// CRUD de productos. Alimenta el catálogo público y el panel admin.
// Adaptado a bd_reposteria: tabla "productos" con id_producto.
// RF-07, RF-08, RF-09, RF-10
// -----------------------------------------------------

const { pool } = require('../config/db');

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

// POST /api/productos -> Crear un producto (solo admin) - RF-07
exports.crearProducto = async (req, res) => {
    const { nombre, descripcion, precio, categoria, imagen_url } = req.body;

    if (!nombre || !precio || !categoria) {
        return res.status(400).json({ mensaje: 'Nombre, precio y categoría son obligatorios' });
    }

    try {
        // Buscar o crear la categoría
        let id_categoria;
        const [cat] = await pool.query(
            'SELECT id_categoria FROM categorias WHERE nombre = ?',
            [categoria]
        );

        if (cat.length > 0) {
            id_categoria = cat[0].id_categoria;
        } else {
            const [nuevaCat] = await pool.query(
                'INSERT INTO categorias (nombre) VALUES (?)',
                [categoria]
            );
            id_categoria = nuevaCat.insertId;
        }

        // Insertar el producto
        const [result] = await pool.query(
            `INSERT INTO productos (nombre, descripcion, precio, id_categoria, imagen_url, estado)
             VALUES (?, ?, ?, ?, ?, 'activo')`,
            [nombre, descripcion || '', precio, id_categoria, imagen_url || '']
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

// PUT /api/productos/:id -> Editar un producto (solo admin) - RF-08
exports.editarProducto = async (req, res) => {
    const { nombre, descripcion, precio, categoria, imagen_url, estado } = req.body;
    const { id } = req.params;

    try {
        // Buscar o crear la categoría
        let id_categoria;
        const [cat] = await pool.query(
            'SELECT id_categoria FROM categorias WHERE nombre = ?',
            [categoria]
        );

        if (cat.length > 0) {
            id_categoria = cat[0].id_categoria;
        } else {
            const [nuevaCat] = await pool.query(
                'INSERT INTO categorias (nombre) VALUES (?)',
                [categoria]
            );
            id_categoria = nuevaCat.insertId;
        }

        // Actualizar el producto
        const [result] = await pool.query(
            `UPDATE productos
             SET nombre = ?, descripcion = ?, precio = ?, id_categoria = ?, imagen_url = ?, estado = ?
             WHERE id_producto = ?`,
            [nombre, descripcion, precio, id_categoria, imagen_url, estado || 'activo', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

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