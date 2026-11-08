// crearAdmin.js
// -----------------------------------------------------
// Crea un usuario administrador si no existe, o actualiza
// su contraseña si ya está registrado.
// Adaptado a bd_reposteria: tabla "usuario" con email.
// -----------------------------------------------------

const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function gestionarAdmin() {
    // ---- CONFIGURACIÓN ----
    // Cambia estos datos si quieres crear otro usuario
    const adminData = {
        nombre: 'Sergio Huapaya',
        email: 'sergio.huapaya@jabys.com',
        telefono: '987654321',
        id_rol: 1 // rol "Administrador" (del sistema)
    };

    const passwordPlano = 'Admin1234';

    try {
        // Generar hash
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordPlano, salt);

        // Verificar si el usuario ya existe
        const [existente] = await pool.query(
            'SELECT id_usuario FROM usuario WHERE email = ?',
            [adminData.email]
        );

        if (existente.length > 0) {
            // Actualizar
            await pool.query(
                `UPDATE usuario 
                 SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL, id_rol = ?, activo = 1
                 WHERE email = ?`,
                [passwordHash, adminData.id_rol, adminData.email]
            );
            console.log('✅ Usuario administrador actualizado correctamente.');
        } else {
            // Crear nuevo
            await pool.query(
                `INSERT INTO usuario (nombre, email, password_hash, telefono, id_rol)
                 VALUES (?, ?, ?, ?, ?)`,
                [adminData.nombre, adminData.email, passwordHash, adminData.telefono, adminData.id_rol]
            );
            console.log('✅ Usuario administrador creado correctamente.');
        }

        console.log('   Nombre:', adminData.nombre);
        console.log('   Email:', adminData.email);
        console.log('   Contraseña:', passwordPlano);
        console.log('   Rol: Administrador');

        // Mostrar todos los usuarios
        console.log('\n📋 Usuarios en la base de datos:');
        const [usuarios] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.email, r.nombre AS rol
             FROM usuario u JOIN roles r ON r.id_rol = u.id_rol`
        );
        usuarios.forEach(u => {
            console.log(`   - [${u.id_usuario}] ${u.email} (${u.rol}) - ${u.nombre}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

gestionarAdmin();