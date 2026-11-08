// categoriasController.js
// -----------------------------------------------------
// CRUD de categorías de productos (panel administrativo).
// - Solo las categorías activas aparecen al registrar un producto.
// - Una categoría con productos no se elimina: se puede desactivar.
// RF-07
// -----------------------------------------------------

const { pool } = require('../config/db');
const { validarCategoria } = require('../utils/validarCatalogo');

// GET /api/categorias?activas=1
exports.listarCategorias = async (req, res) => {
    const soloActivas = req.query.activas === '1' || req.query.activas === 'true';
    try {
        const [rows] = await pool.query(
            `SELECT c.id_categoria AS id, c.nombre, c.descripcion, c.activo, c.creado_en,
                    COUNT(p.id_producto) AS total_productos,
                    SUM(p.estado = 'activo') AS productos_activos
             FROM categorias c
             LEFT JOIN productos p ON p.id_categoria = c.id_categoria
             ${soloActivas ? 'WHERE c.activo = 1' : ''}
             GROUP BY c.id_categoria
             ORDER BY c.nombre`
        );
        res.json(rows.map(c => ({
            ...c,
            activo: Boolean(c.activo),
            total_productos: Number(c.total_productos),
            productos_activos: Number(c.productos_activos || 0)
        })));
    } catch (error) {
        console.error('Error al listar categorías:', error);
        res.status(500).json({ mensaje: 'Error al obtener las categorías' });
    }
};

// POST /api/categorias
exports.crearCategoria = async (req, res) => {
    const { datos, errores } = validarCategoria(req.body);
    if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

    try {
        const [resultado] = await pool.query(
            'INSERT INTO categorias (nombre, descripcion, activo) VALUES (?, ?, ?)',
            [datos.nombre, datos.descripcion, datos.activo ? 1 : 0]
        );
        res.status(201).json({ mensaje: 'Categoría creada correctamente', id: resultado.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre.' });
        }
        console.error('Error al crear categoría:', error);
        res.status(500).json({ mensaje: 'Error al crear la categoría' });
    }
};

// PUT /api/categorias/:id
exports.editarCategoria = async (req, res) => {
    const { datos, errores } = validarCategoria(req.body);
    if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

    try {
        const [resultado] = await pool.query(
            'UPDATE categorias SET nombre = ?, descripcion = ?, activo = ? WHERE id_categoria = ?',
            [datos.nombre, datos.descripcion, datos.activo ? 1 : 0, Number(req.params.id)]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }
        res.json({ mensaje: 'Categoría actualizada correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre.' });
        }
        console.error('Error al editar categoría:', error);
        res.status(500).json({ mensaje: 'Error al actualizar la categoría' });
    }
};

// DELETE /api/categorias/:id
exports.eliminarCategoria = async (req, res) => {
    const id = Number(req.params.id);
    try {
        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) AS total FROM productos WHERE id_categoria = ?', [id]
        );
        if (Number(total) > 0) {
            return res.status(409).json({
                mensaje: `No se puede eliminar: tiene ${total} producto(s). Muévelos a otra categoría o desactívala.`
            });
        }

        const [resultado] = await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }
        res.json({ mensaje: 'Categoría eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ mensaje: 'Error al eliminar la categoría' });
    }
};
