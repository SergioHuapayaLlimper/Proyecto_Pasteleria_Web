// 001_roles_y_personal.js
// -----------------------------------------------------
// Convierte una BD antigua (usuario.rol como texto) al modelo de roles:
// - Crea la tabla "roles" con Administrador y Contador.
// - Agrega a "usuario": id_rol, activo, creado_en, actualizado_en.
// - Pasa cada usuario de su rol en texto al id_rol equivalente.
// - Elimina la columna antigua "rol".
// En una BD nueva (creada con db/bd_reposteria.sql) no cambia nada.
// -----------------------------------------------------

exports.descripcion = 'Tabla de roles y datos del personal';

exports.up = async (con, { existeTabla, existeColumna, existeRestriccion }) => {
    // 1. Tabla de roles
    if (!(await existeTabla(con, 'roles'))) {
        await con.query(`
            CREATE TABLE roles (
                id_rol         INT AUTO_INCREMENT PRIMARY KEY,
                nombre         VARCHAR(40)  NOT NULL,
                descripcion    VARCHAR(150) NULL,
                permisos       JSON         NOT NULL,
                es_sistema     TINYINT(1)   NOT NULL DEFAULT 0,
                creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_roles_nombre (nombre)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    }

    await con.query(`
        INSERT IGNORE INTO roles (id_rol, nombre, descripcion, permisos, es_sistema) VALUES
        (1, 'Administrador', 'Acceso total al panel administrativo.',
            JSON_ARRAY('dashboard','productos','pedidos','pedidos_estado','configuracion','personal'), 1),
        (2, 'Contador', 'Consulta métricas y exporta el historial de pedidos (RF21).',
            JSON_ARRAY('dashboard','pedidos'), 0)`);

    // 2. Nuevas columnas en usuario
    if (!(await existeColumna(con, 'usuario', 'id_rol'))) {
        await con.query('ALTER TABLE usuario ADD COLUMN id_rol INT NULL AFTER telefono');
    }
    if (!(await existeColumna(con, 'usuario', 'activo'))) {
        await con.query('ALTER TABLE usuario ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER id_rol');
    }
    if (!(await existeColumna(con, 'usuario', 'creado_en'))) {
        await con.query('ALTER TABLE usuario ADD COLUMN creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    }
    if (!(await existeColumna(con, 'usuario', 'actualizado_en'))) {
        await con.query(`ALTER TABLE usuario ADD COLUMN actualizado_en TIMESTAMP NOT NULL
                         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    }
    await con.query('ALTER TABLE usuario MODIFY telefono VARCHAR(15) NULL');

    // 3. Migrar el rol en texto (si existe) al nuevo id_rol
    if (await existeColumna(con, 'usuario', 'rol')) {
        // Crear como rol personalizado cualquier rol en texto que no exista aún
        await con.query(`
            INSERT IGNORE INTO roles (nombre, descripcion, permisos)
            SELECT DISTINCT u.rol, 'Rol migrado automáticamente.', JSON_ARRAY('dashboard')
            FROM usuario u
            WHERE u.rol IS NOT NULL AND u.rol <> ''`);
        await con.query(`
            UPDATE usuario u JOIN roles r ON r.nombre = u.rol
            SET u.id_rol = r.id_rol
            WHERE u.id_rol IS NULL`);
    }

    // Cualquier usuario sin rol queda como Administrador (comportamiento anterior por defecto)
    await con.query('UPDATE usuario SET id_rol = 1 WHERE id_rol IS NULL');
    await con.query('ALTER TABLE usuario MODIFY id_rol INT NOT NULL');

    if (!(await existeRestriccion(con, 'usuario', 'fk_usuario_rol'))) {
        await con.query(`ALTER TABLE usuario ADD CONSTRAINT fk_usuario_rol
                         FOREIGN KEY (id_rol) REFERENCES roles (id_rol)`);
    }

    if (await existeColumna(con, 'usuario', 'rol')) {
        await con.query('ALTER TABLE usuario DROP COLUMN rol');
    }
};
