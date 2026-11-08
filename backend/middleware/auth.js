// middleware/auth.js
// -----------------------------------------------------
// Protege las rutas del panel administrativo.
// - verificarToken: valida el JWT y carga el usuario con su rol y permisos
//   desde la BD (así, si se desactiva una cuenta o se cambia su rol,
//   el cambio aplica de inmediato sin esperar a que expire el token).
// - requierePermiso: deja pasar solo si el rol tiene alguno de los permisos.
// RF-03, RF-21
// -----------------------------------------------------

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { CLAVES_PERMISOS } = require('../utils/validarPersonal');
require('dotenv').config();

// Obtiene el usuario activo con su rol. Devuelve null si no existe o está inactivo.
async function cargarUsuarioConRol(idUsuario) {
    const [rows] = await pool.query(
        `SELECT u.id_usuario, u.nombre, u.email, u.activo,
                r.id_rol, r.nombre AS rol, r.permisos, r.es_sistema
         FROM usuario u
         JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = ?`,
        [idUsuario]
    );
    const u = rows[0];
    if (!u || !u.activo) return null;

    let permisos = typeof u.permisos === 'string' ? JSON.parse(u.permisos) : (u.permisos || []);
    if (u.es_sistema) permisos = [...CLAVES_PERMISOS]; // el rol Administrador siempre tiene todo

    return {
        id: u.id_usuario,
        nombre: u.nombre,
        email: u.email,
        idRol: u.id_rol,
        rol: u.rol,
        esAdmin: Boolean(u.es_sistema),
        permisos
    };
}

// Verifica que exista un token válido y que la cuenta siga activa.
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // formato: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ mensaje: 'No se envió un token de acceso.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (error, payload) => {
        if (error) {
            return res.status(401).json({ mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
        }
        try {
            const usuario = await cargarUsuarioConRol(payload.id);
            if (!usuario) {
                return res.status(401).json({ mensaje: 'Tu cuenta fue desactivada o eliminada.' });
            }
            req.usuario = usuario;
            next();
        } catch (err) {
            console.error('Error al verificar usuario:', err);
            res.status(500).json({ mensaje: 'Error del servidor' });
        }
    });
}

// Genera un middleware que exige al menos uno de los permisos indicados.
function requierePermiso(...permisos) {
    return [verificarToken, (req, res, next) => {
        if (!permisos.some(p => req.usuario.permisos.includes(p))) {
            return res.status(403).json({ mensaje: 'Tu rol no tiene permiso para realizar esta acción.' });
        }
        next();
    }];
}

module.exports = { verificarToken, requierePermiso, cargarUsuarioConRol };
