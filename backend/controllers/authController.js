// authController.js
// -----------------------------------------------------
// Login de administradores y contadores.
// Adaptado a la base de datos bd_reposteria (tabla "usuario").
// RF-01, RF-02, RF-03
// -----------------------------------------------------

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

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
            [usuario]
        );

        if (rows.length === 0) {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        const user = rows[0];

        // Verificar si la cuenta está bloqueada (RF-03)
        if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
            return res.status(423).json({ 
                mensaje: 'Superaste el número de intentos permitidos. Cuenta bloqueada por 5 minutos.' 
            });
        }

        // Verificar contraseña
        const passwordValido = await bcrypt.compare(password, user.password_hash);

        if (!passwordValido) {
            // Incrementar intentos fallidos
            const intentos = user.intentos_fallidos + 1;
            let bloqueadoHasta = null;

            // RF-03: bloquear tras 5 intentos por 5 minutos
            if (intentos >= 5) {
                bloqueadoHasta = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
            }

            await pool.query(
                'UPDATE usuario SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id_usuario = ?',
                [intentos, bloqueadoHasta, user.id_usuario]
            );

            return res.status(401).json({ 
                mensaje: 'Usuario o contraseña incorrectos',
                intentosRestantes: Math.max(0, 5 - intentos)
            });
        }

        // Login exitoso: resetear intentos
        await pool.query(
            'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = ?',
            [user.id_usuario]
        );

        // RF-03: solo Administrador puede entrar al panel
        if (user.rol !== 'Administrador') {
            return res.status(403).json({ 
                mensaje: 'Solo los administradores pueden acceder al panel.' 
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: user.id_usuario, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: 'Inicio de sesion exitoso.',
            token,
            rol: user.rol,
            nombre: user.nombre
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
};