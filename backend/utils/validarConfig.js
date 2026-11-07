// utils/validarConfig.js
// -----------------------------------------------------
// Valida y normaliza los datos de configuración del negocio
// antes de guardarlos. Se separa del controlador para poder
// probarlo con pruebas unitarias.
// -----------------------------------------------------

// Únicas claves que el admin puede guardar
const CLAVES_PERMITIDAS = [
    'direccion', 'mapa_lat', 'mapa_lng', 'horario_atencion', 'metodos_pago',
    'telefono_contacto', 'correo_contacto', 'whatsapp_numero', 'whatsapp_mensaje'
];

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Devuelve { datos, errores }. Si errores tiene elementos, no se debe guardar.
function validarConfig(entrada) {
    const datos = {};
    const errores = [];

    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
        return { datos, errores: ['El cuerpo de la petición no es válido.'] };
    }

    for (const [clave, valorOriginal] of Object.entries(entrada)) {
        if (!CLAVES_PERMITIDAS.includes(clave)) continue; // se ignoran claves desconocidas
        datos[clave] = String(valorOriginal ?? '').trim();
    }

    if ('whatsapp_numero' in datos) {
        // Acepta "+51 932 614 848" y lo guarda como "51932614848"
        datos.whatsapp_numero = datos.whatsapp_numero.replace(/\D/g, '');
        if (!/^\d{10,15}$/.test(datos.whatsapp_numero)) {
            errores.push('El número de WhatsApp debe incluir el código de país (ej: 51987654321).');
        }
    }

    if ('mapa_lat' in datos) {
        const lat = Number(datos.mapa_lat);
        if (datos.mapa_lat === '' || Number.isNaN(lat) || lat < -90 || lat > 90) {
            errores.push('La latitud debe ser un número entre -90 y 90.');
        }
    }

    if ('mapa_lng' in datos) {
        const lng = Number(datos.mapa_lng);
        if (datos.mapa_lng === '' || Number.isNaN(lng) || lng < -180 || lng > 180) {
            errores.push('La longitud debe ser un número entre -180 y 180.');
        }
    }

    if (datos.correo_contacto && !REGEX_CORREO.test(datos.correo_contacto)) {
        errores.push('El correo de contacto no tiene un formato válido.');
    }

    if ('direccion' in datos && !datos.direccion) {
        errores.push('La dirección es obligatoria.');
    }

    return { datos, errores };
}

module.exports = { validarConfig, CLAVES_PERMITIDAS };
