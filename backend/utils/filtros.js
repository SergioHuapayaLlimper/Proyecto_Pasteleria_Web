// utils/filtros.js
// -----------------------------------------------------
// Utilidades compartidas para armar consultas SQL.
// -----------------------------------------------------

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto) {
    if (!REGEX_FECHA.test(texto)) return false;
    const [a, m, d] = texto.split('-').map(Number);
    const fecha = new Date(Date.UTC(a, m - 1, d));
    return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}

// Valida un rango de fechas opcional (formato AAAA-MM-DD).
// Devuelve un mensaje de error o null si es válido.
function validarRangoFechas(desde, hasta) {
    if (desde && !esFechaValida(desde)) return 'La fecha "desde" no es válida.';
    if (hasta && !esFechaValida(hasta)) return 'La fecha "hasta" no es válida.';
    if (desde && hasta && desde > hasta) return 'La fecha "desde" no puede ser posterior a la fecha "hasta".';
    return null;
}

// Arma el filtro opcional por rango de fechas sobre la columna creado_en.
// Devuelve un fragmento SQL que empieza con " AND ..." (o vacio) y sus parametros.
// Uso: const { sql, params } = filtroRangoFechas(desde, hasta);
function filtroRangoFechas(desde, hasta, columna = 'creado_en') {
    let sql = '';
    const params = [];

    if (desde) { sql += ` AND DATE(${columna}) >= ?`; params.push(desde); }
    if (hasta) { sql += ` AND DATE(${columna}) <= ?`; params.push(hasta); }

    return { sql, params };
}

module.exports = { filtroRangoFechas, validarRangoFechas, esFechaValida };
