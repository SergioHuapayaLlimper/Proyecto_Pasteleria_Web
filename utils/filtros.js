// utils/filtros.js
// -----------------------------------------------------
// Utilidades compartidas para armar consultas SQL.
// -----------------------------------------------------

// Arma el filtro opcional por rango de fechas sobre la columna creado_en.
// Devuelve un fragmento SQL que empieza con " AND ..." (o vacio) y sus parametros.
// Uso: const { sql, params } = filtroRangoFechas(desde, hasta);
function filtroRangoFechas(desde, hasta) {
    let sql = '';
    const params = [];

    if (desde) { sql += ' AND DATE(creado_en) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(creado_en) <= ?'; params.push(hasta); }

    return { sql, params };
}

module.exports = { filtroRangoFechas };
