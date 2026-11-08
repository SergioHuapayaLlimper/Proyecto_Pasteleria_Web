// usuariosController.js
// -----------------------------------------------------
// CRUD de las cuentas del personal de la pastelería.
// Reglas de seguridad:
// - Un usuario no puede eliminarse, desactivarse ni cambiarse el rol a sí mismo.
// - Siempre debe quedar al menos un Administrador activo.
// -----------------------------------------------------

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { validarUsuario } = require('../utils/validarPersonal');

const ID_ROL_ADMIN = 1;

async function contarAdminsActivos(excluirId) {
    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM usuario u JOIN roles r ON r.id_rol = u.id_rol
         WHERE r.es_sistema = 1 AND u.activo = 1 AND u.id_usuario <> ?`,
        [excluirId || 0]
    );
    return Number(total);
}

async function existeRol(idRol) {
    const [[rol]] = await pool.query('SELECT id_rol FROM roles WHERE id_rol = ?', [idRol]);
    return Boolean(rol);
}

// GET /api/personal/usuarios
exports.listarUsuarios = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id_usuario AS id, u.nombre, u.email, u.telefono, u.activo,
                    u.bloqueado_hasta, u.creado_en, u.actualizado_en,
                    r.id_rol, r.nombre AS rol, r.es_sistema AS rol_sistema
             FROM usuario u
             JOIN roles r ON r.id_rol = u.id_rol
             ORDER BY u.creado_en DESC`
        );
        const ahora = new Date();
        res.json(rows.map(u => ({
            ...u,
            activo: Boolean(u.activo),
            rol_sistema: Boolean(u.rol_sistema),
            bloqueado: Boolean(u.bloqueado_hasta && new Date(u.bloqueado_hasta) > ahora),
            es_yo: u.id === req.usuario.id
        })));
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ mensaje: 'Error al obtener el personal' });
    }
};

// POST /api/personal/usuarios
exports.crearUsuario = async (req, res) => {
    const { datos, errores } = validarUsuario(req.body, { esNuevo: true });
    if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

    try {
        if (!(await existeRol(datos.id_rol))) {
            return res.status(400).json({ mensaje: 'El rol seleccionado no existe.' });
        }

        const hash = await bcrypt.hash(datos.password, 10);
        const [resultado] = await pool.query(
            `INSERT INTO usuario (nombre, email, password_hash, telefono, id_rol, activo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [datos.nombre, datos.email, hash, datos.telefono, datos.id_rol, datos.activo ? 1 : 0]
        );
        res.status(201).json({ mensaje: 'Usuario creado correctamente', id: resultado.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una cuenta con ese correo.' });
        }
        console.error('Error al crear usuario:', error);
        res.status(500).json({ mensaje: 'Error al crear el usuario' });
    }
};

// PUT /api/personal/usuarios/:id
exports.editarUsuario = async (req, res) => {
    const id = Number(req.params.id);
    const { datos, errores } = validarUsuario(req.body, { esNuevo: false });
    if (errores.length) return res.status(400).json({ mensaje: errores.join(' '), errores });

    try {
        const [[actual]] = await pool.query(
            `SELECT u.id_usuario, u.id_rol, u.activo, r.es_sistema
             FROM usuario u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?`,
            [id]
        );
        if (!actual) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        if (!(await existeRol(datos.id_rol))) {
            return res.status(400).json({ mensaje: 'El rol seleccionado no existe.' });
        }

        const esYo = id === req.usuario.id;
        if (esYo && (datos.id_rol !== actual.id_rol || !datos.activo)) {
            return res.status(403).json({ mensaje: 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta.' });
        }

        // Si deja de ser Administrador activo, debe quedar otro
        const dejaDeSerAdmin = actual.es_sistema && actual.activo && (datos.id_rol !== ID_ROL_ADMIN || !datos.activo);
        if (dejaDeSerAdmin && (await contarAdminsActivos(id)) === 0) {
            return res.status(409).json({ mensaje: 'Debe quedar al menos un Administrador activo.' });
        }

        const campos = ['nombre = ?', 'email = ?', 'telefono = ?', 'id_rol = ?', 'activo = ?'];
        const valores = [datos.nombre, datos.email, datos.telefono, datos.id_rol, datos.activo ? 1 : 0];

        if (datos.password) {
            campos.push('password_hash = ?', 'intentos_fallidos = 0', 'bloqueado_hasta = NULL');
            valores.push(await bcrypt.hash(datos.password, 10));
        }
        if (req.body.desbloquear) {
            campos.push('intentos_fallidos = 0', 'bloqueado_hasta = NULL');
        }

        valores.push(id);
        await pool.query(`UPDATE usuario SET ${[...new Set(campos)].join(', ')} WHERE id_usuario = ?`, valores);
        res.json({ mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una cuenta con ese correo.' });
        }
        console.error('Error al editar usuario:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el usuario' });
    }
};

// DELETE /api/personal/usuarios/:id
exports.eliminarUsuario = async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.usuario.id) {
        return res.status(403).json({ mensaje: 'No puedes eliminar tu propia cuenta.' });
    }

    try {
        const [[usuario]] = await pool.query(
            `SELECT u.activo, r.es_sistema FROM usuario u JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = ?`,
            [id]
        );
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        if (usuario.es_sistema && usuario.activo && (await contarAdminsActivos(id)) === 0) {
            return res.status(409).json({ mensaje: 'Debe quedar al menos un Administrador activo.' });
        }

        await pool.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el usuario' });
    }
};
