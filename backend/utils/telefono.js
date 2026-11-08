// utils/telefono.js
// -----------------------------------------------------
// Validación de celulares de Perú (RF-25).
// Formato válido: 9 dígitos y empieza con 9 (ej: 987654321).
// Se aceptan espacios, guiones y el prefijo +51, que se eliminan.
// -----------------------------------------------------

const REGEX_CELULAR_PERU = /^9\d{8}$/;

// "+51 987 654 321" -> "987654321"
function normalizarTelefono(texto) {
    let digitos = String(texto ?? '').replace(/\D/g, '');
    if (digitos.length === 11 && digitos.startsWith('51')) digitos = digitos.slice(2);
    return digitos;
}

function esCelularPeru(texto) {
    return REGEX_CELULAR_PERU.test(normalizarTelefono(texto));
}

const MENSAJE_TELEFONO_INVALIDO =
    'El teléfono debe ser un celular de Perú: 9 dígitos que empiecen con 9 (ej: 987654321).';

module.exports = { normalizarTelefono, esCelularPeru, MENSAJE_TELEFONO_INVALIDO };
