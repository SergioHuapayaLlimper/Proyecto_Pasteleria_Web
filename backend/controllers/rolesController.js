// rolesController.js
// -----------------------------------------------------
// CRUD de roles del personal. El rol "Administrador" (es_sistema = 1)
// no se puede editar ni eliminar, y un rol con usuarios asignados
// no se puede eliminar.
// -----------------------------------------------------

const { pool } = require('../config/db');
const { PERMISOS, validarRol } = require('../utils/validarPersonal');

function parsearPermisos(valor) {
    if (Array.isArray(valor)) return valor;
    try { return JSON.parse(valor || '[]'); } catch { return []; }
}

// GET /api/personal/roles/permisos -> catálogo de permisos disponibles
exports.listarPermisos = (req, res) => {
    res.json(PERMISOS);
};

// GET /api/personal/roles
exports.listarRoles = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.id_rol AS id, r.nombre, r.descripcion, r.permisos, r.es_sistema,
                    r.creado_en, COUNT(u.id_usuario) AS total_usuarios
             FROM roles r
             LEFT JOIN usuario u ON u.id_rol = r.id_rol
             GROUP BY r.id_rol
             ORDER BY r.es_sistema DESC, r.nombre`
        );
        res.json(rows.map(r => ({
            ...r,
            es_sistema: Boolean(r.es_sistema),
            permisos: r.es_sistema ? PERMISOS.map(p => p.clave) : parsearPermisos(r.permisos),
            total_usuarios: Number(r.total_usuarios)
        })));
    } catch (error) {
        console.error('Error al listar roles:', error);
        res.status(500).json({ mensaje: 'Error al obtener los roles' });
    }
};

// POST /api/personal/roles
exports.crearRol = async (req, res) => {
    const { datos, errores } = validarRol(req.body);
    if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

    try {
        const [resultado] = await pool.query(
            'INSERT INTO roles (nombre, descripcion, permisos) VALUES (?, ?, ?)',
            [datos.nombre, datos.descripcion, JSON.stringify(datos.permisos)]
        );
        res.status(201).json({ mensaje: 'Rol creado correctamente', id: resultado.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe un rol con ese nombre.' });
        }
        console.error('Error al crear rol:', error);
        res.status(500).json({ mensaje: 'Error al crear el rol' });
    }
};

// PUT /api/personal/roles/:id
exports.editarRol = async (req, res) => {
    const id = Number(req.params.id);

    try {
        const [[rol]] = await pool.query('SELECT es_sistema FROM roles WHERE id_rol = ?', [id]);
        if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado' });
        if (rol.es_sistema) {
            return res.status(403).json({ mensaje: 'El rol Administrador es del sistema y no se puede modificar.' });
        }

        const { datos, errores } = validarRol(req.body);
        if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

        await pool.query(
            'UPDATE roles SET nombre = ?, descripcion = ?, permisos = ? WHERE id_rol = ?',
            [datos.nombre, datos.descripcion, JSON.stringify(datos.permisos), id]
        );
        res.json({ mensaje: 'Rol actualizado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe un rol con ese nombre.' });
        }
        console.error('Error al editar rol:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el rol' });
    }
};

// DELETE /api/personal/roles/:id
exports.eliminarRol = async (req, res) => {
    const id = Number(req.params.id);
    try {
        const [[rol]] = await pool.query('SELECT es_sistema FROM roles WHERE id_rol = ?', [id]);
        if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado' });
        if (rol.es_sistema) {
            return res.status(403).json({ mensaje: 'El rol Administrador es del sistema y no se puede eliminar.' });
        }

        const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM usuario WHERE id_rol = ?', [id]);
        if (total > 0) {
            return res.status(409).json({
                mensaje: `No se puede eliminar: hay ${total} usuario(s) con este rol. Asígnales otro rol primero.`
            });
        }

        await pool.query('DELETE FROM roles WHERE id_rol = ?', [id]);
        res.json({ mensaje: 'Rol eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar rol:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el rol' });
    }
};
