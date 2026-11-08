// utils/validarPersonal.js
// -----------------------------------------------------
// Catálogo de permisos del panel y validaciones de roles y usuarios.
// Son funciones puras (sin base de datos) para facilitar las pruebas unitarias.
// -----------------------------------------------------

// Secciones/acciones del panel que se pueden asignar a un rol
const PERMISOS = [
    { clave: 'dashboard',      nombre: 'Dashboard',            descripcion: 'Ver métricas y exportar el reporte general.' },
    { clave: 'productos',      nombre: 'Productos',            descripcion: 'Crear, editar y desactivar productos del catálogo.' },
    { clave: 'pedidos',        nombre: 'Pedidos',              descripcion: 'Ver y exportar el historial de pedidos.' },
    { clave: 'pedidos_estado', nombre: 'Gestionar pedidos',    descripcion: 'Marcar pedidos como completados o cancelados.' },
    { clave: 'configuracion',  nombre: 'Configuración',        descripcion: 'Editar dirección, horarios, pagos y WhatsApp.' },
    { clave: 'personal',       nombre: 'Personal y roles',     descripcion: 'Crear cuentas del personal y administrar roles.' }
];

const CLAVES_PERMISOS = PERMISOS.map(p => p.clave);
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Contraseña: mínimo 8 caracteres, al menos una letra y un número
function validarPassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) {
        return 'La contraseña debe incluir al menos una letra y un número.';
    }
    return null;
}

// Valida los datos de un rol. Devuelve { datos, errores }.
function validarRol(entrada = {}) {
    const errores = [];
    const nombre = String(entrada.nombre ?? '').trim();
    const descripcion = String(entrada.descripcion ?? '').trim();
    const permisos = Array.isArray(entrada.permisos) ? entrada.permisos : [];

    if (nombre.length < 3 || nombre.length > 40) {
        errores.push('El nombre del rol debe tener entre 3 y 40 caracteres.');
    }
    if (descripcion.length > 150) {
        errores.push('La descripción no puede superar los 150 caracteres.');
    }

    const desconocidos = permisos.filter(p => !CLAVES_PERMISOS.includes(p));
    if (desconocidos.length) {
        errores.push(`Permisos no válidos: ${desconocidos.join(', ')}.`);
    }

    // Sin duplicados y en el orden del catálogo
    const permisosLimpios = CLAVES_PERMISOS.filter(c => permisos.includes(c));
    if (!permisosLimpios.length) {
        errores.push('Selecciona al menos un permiso para el rol.');
    }
    // "Gestionar pedidos" no tiene sentido sin poder ver los pedidos
    if (permisosLimpios.includes('pedidos_estado') && !permisosLimpios.includes('pedidos')) {
        permisosLimpios.splice(permisosLimpios.indexOf('pedidos_estado'), 0, 'pedidos');
    }

    return { datos: { nombre, descripcion: descripcion || null, permisos: permisosLimpios }, errores };
}

// Valida los datos de un usuario del personal.
// esNuevo = true exige contraseña; en edición es opcional (vacía = no cambiar).
function validarUsuario(entrada = {}, { esNuevo = false } = {}) {
    const errores = [];
    const nombre = String(entrada.nombre ?? '').trim();
    const email = String(entrada.email ?? '').trim().toLowerCase();
    const telefono = String(entrada.telefono ?? '').replace(/\D/g, '');
    const idRol = Number(entrada.id_rol);
    const password = entrada.password ?? '';
    const activo = entrada.activo === undefined ? true : Boolean(entrada.activo);

    if (nombre.length < 3 || nombre.length > 50) {
        errores.push('El nombre debe tener entre 3 y 50 caracteres.');
    }
    if (!REGEX_CORREO.test(email) || email.length > 100) {
        errores.push('Ingresa un correo electrónico válido.');
    }
    if (telefono && (telefono.length < 9 || telefono.length > 15)) {
        errores.push('El teléfono debe tener entre 9 y 15 dígitos.');
    }
    if (!Number.isInteger(idRol) || idRol <= 0) {
        errores.push('Selecciona un rol válido.');
    }
    if (esNuevo || password) {
        const errorPassword = validarPassword(password);
        if (errorPassword) errores.push(errorPassword);
    }

    return {
        datos: { nombre, email, telefono: telefono || null, id_rol: idRol, password: password || null, activo },
        errores
    };
}

module.exports = { PERMISOS, CLAVES_PERMISOS, validarRol, validarUsuario, validarPassword };
