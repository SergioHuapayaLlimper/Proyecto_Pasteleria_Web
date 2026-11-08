// authController.js
// -----------------------------------------------------
// Login del personal (cualquier rol con al menos un permiso).
// Adaptado a la base de datos bd_reposteria (tabla "usuario").
// RF-01, RF-02, RF-03
// -----------------------------------------------------

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { cargarUsuarioConRol } = require('../middleware/auth');

// RF-03: bloqueo de cuenta tras varios intentos fallidos
const MAX_INTENTOS_FALLIDOS = 5;
const MINUTOS_BLOQUEO = 5;

// Segundos que faltan para que termine el bloqueo (0 si no está bloqueada)
function segundosRestantesBloqueo(bloqueadoHasta, ahora = new Date()) {
    if (!bloqueadoHasta) return 0;
    return Math.max(0, Math.ceil((new Date(bloqueadoHasta) - ahora) / 1000));
}

// "200" -> "3 min 20 s"
function formatearTiempo(segundos) {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    if (!min) return `${seg} s`;
    return seg ? `${min} min ${seg} s` : `${min} min`;
}

function responderBloqueo(res, segundos) {
    return res.status(423).json({
        mensaje: `Cuenta bloqueada por superar los ${MAX_INTENTOS_FALLIDOS} intentos permitidos. Inténtalo en ${formatearTiempo(segundos)}.`,
        segundosRestantes: segundos,
        bloqueado: true
    });
}

// Suma un intento fallido al usuario y, si llega al máximo, bloquea la cuenta.
// Devuelve el total de intentos fallidos acumulados.
async function registrarIntentoFallido(user) {
    const intentos = user.intentos_fallidos + 1;
    let bloqueadoHasta = null;

    if (intentos >= MAX_INTENTOS_FALLIDOS) {
        bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
    }

    await pool.query(
        'UPDATE usuario SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id_usuario = ?',
        [intentos, bloqueadoHasta, user.id_usuario]
    );

    return intentos;
}

// POST /api/auth/login
exports.login = async (req, res) => {
    const { usuario, password } = req.body;

    // RF-02: validar campos obligatorios
    if (!usuario || !password) {
        return res.status(400).json({ mensaje: 'Usuario y contraseña son obligatorios' });
    }

    try {
        // Buscar por email (usamos "usuario" en el frontend, pero es email)
        const [rows] = await pool.query(
            'SELECT * FROM usuario WHERE email = ?',
            [String(usuario).trim().toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        const user = rows[0];

        // Verificar si la cuenta está bloqueada (RF-03): se informa el tiempo restante
        const segundosBloqueo = segundosRestantesBloqueo(user.bloqueado_hasta);
        if (segundosBloqueo > 0) {
            return responderBloqueo(res, segundosBloqueo);
        }

        // Verificar contraseña
        const passwordValido = await bcrypt.compare(password, user.password_hash);

        if (!passwordValido) {
            // Incrementar intentos fallidos (y bloquear si corresponde)
            const intentos = await registrarIntentoFallido(user);

            // Este intento completó el máximo: la cuenta queda bloqueada desde ahora
            if (intentos >= MAX_INTENTOS_FALLIDOS) {
                return responderBloqueo(res, MINUTOS_BLOQUEO * 60);
            }

            return res.status(401).json({ 
                mensaje: 'Usuario o contraseña incorrectos',
                intentosRestantes: Math.max(0, MAX_INTENTOS_FALLIDOS - intentos)
            });
        }

        // Cuenta desactivada por un administrador
        if (!user.activo) {
            return res.status(403).json({ mensaje: 'Tu cuenta está desactivada. Comunícate con el administrador.' });
        }

        // Login exitoso: resetear intentos
        await pool.query(
            'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = ?',
            [user.id_usuario]
        );

        // RF-03: el acceso al panel depende de los permisos del rol
        const perfil = await cargarUsuarioConRol(user.id_usuario);
        if (!perfil || !perfil.permisos.length) {
            return res.status(403).json({ mensaje: 'Tu rol no tiene acceso al panel administrativo.' });
        }

        // Generar token JWT (los permisos se consultan en cada petición)
        const token = jwt.sign(
            { id: user.id_usuario, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: 'Inicio de sesion exitoso.',
            token,
            rol: perfil.rol,
            nombre: perfil.nombre,
            permisos: perfil.permisos
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};

// GET /api/auth/perfil -> datos y permisos actuales del usuario conectado
exports.perfil = (req, res) => {
    const { id, nombre, email, rol, esAdmin, permisos } = req.usuario;
    res.json({ id, nombre, email, rol, esAdmin, permisos });
};

// Exportadas para pruebas unitarias
exports.segundosRestantesBloqueo = segundosRestantesBloqueo;
exports.formatearTiempo = formatearTiempo;
