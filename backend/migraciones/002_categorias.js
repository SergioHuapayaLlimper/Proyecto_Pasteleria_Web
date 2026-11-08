// 002_categorias.js
// -----------------------------------------------------
// Prepara la tabla "categorias" para gestionarla desde el panel:
// - Agrega descripcion, activo, creado_en y actualizado_en.
// - Une categorías repetidas (ej. "Tortas" y " tortas") que se hayan creado
//   automáticamente antes, moviendo sus productos a una sola.
// - Agrega un índice único por nombre.
// Las categorías que ya usan los productos se conservan tal cual.
// -----------------------------------------------------

exports.descripcion = 'Gestión de categorías de productos';

exports.up = async (con, { existeColumna, existeRestriccion }) => {
    if (!(await existeColumna(con, 'categorias', 'descripcion'))) {
        await con.query('ALTER TABLE categorias ADD COLUMN descripcion VARCHAR(150) NULL AFTER nombre');
    }
    if (!(await existeColumna(con, 'categorias', 'activo'))) {
        await con.query('ALTER TABLE categorias ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER descripcion');
    }
    if (!(await existeColumna(con, 'categorias', 'creado_en'))) {
        await con.query('ALTER TABLE categorias ADD COLUMN creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    }
    if (!(await existeColumna(con, 'categorias', 'actualizado_en'))) {
        await con.query(`ALTER TABLE categorias ADD COLUMN actualizado_en TIMESTAMP NOT NULL
                         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    }

    // Limpiar espacios en los nombres
    await con.query('UPDATE categorias SET nombre = TRIM(nombre)');

    if (!(await existeRestriccion(con, 'categorias', 'uk_categorias_nombre'))) {
        // Unir duplicados: se conserva la categoría con el id más bajo
        const [duplicados] = await con.query(`
            SELECT c.id_categoria AS id, m.id_conservar
            FROM categorias c
            JOIN (SELECT nombre, MIN(id_categoria) AS id_conservar
                  FROM categorias GROUP BY nombre HAVING COUNT(*) > 1) m
              ON m.nombre = c.nombre
            WHERE c.id_categoria <> m.id_conservar`);

        for (const d of duplicados) {
            await con.query('UPDATE productos SET id_categoria = ? WHERE id_categoria = ?', [d.id_conservar, d.id]);
            await con.query('DELETE FROM categorias WHERE id_categoria = ?', [d.id]);
        }

        await con.query('ALTER TABLE categorias ADD UNIQUE KEY uk_categorias_nombre (nombre)');
    }
};
