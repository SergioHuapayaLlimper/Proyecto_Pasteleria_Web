// utils/validarPedido.js
// -----------------------------------------------------
// Validación de los datos del checkout (HU08 / RF-24, RF-25).
// Función pura: recibe la fecha de "hoy" como parámetro para
// poder probarla con pruebas unitarias sin depender del reloj.
// -----------------------------------------------------

const { esFechaValida } = require('./filtros');
const { normalizarTelefono, esCelularPeru, MENSAJE_TELEFONO_INVALIDO } = require('./telefono');

const METODOS_PAGO = ['Efectivo', 'Yape'];
const MODOS_ENTREGA = ['Delivery', 'Recojo en tienda'];
const DIAS_MAXIMOS_ANTICIPACION = 90;

// Fecha de hoy (AAAA-MM-DD) en la zona horaria del negocio
function hoyEnPeru(ahora = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(ahora);
}

function sumarDias(iso, dias) {
    const [a, m, d] = iso.split('-').map(Number);
    const fecha = new Date(Date.UTC(a, m - 1, d + dias));
    return fecha.toISOString().slice(0, 10);
}

// Devuelve { datos, error }. error es null si todo es válido.
function validarPedido(entrada = {}, hoy = hoyEnPeru()) {
    const nombre = String(entrada.cliente_nombre ?? '').trim();
    const telefono = normalizarTelefono(entrada.cliente_telefono);
    const metodoPago = entrada.metodo_pago;
    const productos = entrada.productos;
    const modoEntrega = entrada.modo_entrega;
    const esDelivery = modoEntrega === 'Delivery';
    // En recojo en tienda no se guarda dirección
    const direccion = esDelivery ? String(entrada.direccion_entrega ?? '').trim() : '';
    const referencia = esDelivery ? String(entrada.referencia_entrega ?? '').trim() : '';
    const fechaEntrega = String(entrada.fecha_entrega ?? '').trim();

    const datos = {
        nombre, telefono, metodoPago, productos, modoEntrega,
        direccion: direccion || null, referencia: referencia || null, fechaEntrega
    };

    if (!nombre || !telefono || !metodoPago || !modoEntrega || !fechaEntrega || !Array.isArray(productos) || !productos.length) {
        return { datos, error: 'Todos los campos obligatorios deben completarse.' };
    }
    if (!MODOS_ENTREGA.includes(modoEntrega)) {
        return { datos, error: 'Selecciona un modo de entrega válido (Delivery o Recojo en tienda).' };
    }
    if (!esCelularPeru(telefono)) {
        return { datos, error: MENSAJE_TELEFONO_INVALIDO };
    }
    if (!METODOS_PAGO.includes(metodoPago)) {
        return { datos, error: 'Método de pago no válido.' };
    }
    if (esDelivery && (direccion.length < 5 || direccion.length > 150)) {
        return { datos, error: 'Para delivery, la dirección de entrega debe tener entre 5 y 150 caracteres.' };
    }
    if (referencia.length > 150) {
        return { datos, error: 'La referencia no puede superar los 150 caracteres.' };
    }
    if (!esFechaValida(fechaEntrega)) {
        return { datos, error: 'La fecha de entrega no es válida.' };
    }
    // Solo fechas futuras: desde mañana
    if (fechaEntrega <= hoy) {
        return { datos, error: 'La fecha de entrega debe ser posterior al día de hoy.' };
    }
    if (fechaEntrega > sumarDias(hoy, DIAS_MAXIMOS_ANTICIPACION)) {
        return { datos, error: `La fecha de entrega no puede superar los ${DIAS_MAXIMOS_ANTICIPACION} días de anticipación.` };
    }

    return { datos, error: null };
}

module.exports = { validarPedido, hoyEnPeru, sumarDias, METODOS_PAGO, MODOS_ENTREGA, DIAS_MAXIMOS_ANTICIPACION };
