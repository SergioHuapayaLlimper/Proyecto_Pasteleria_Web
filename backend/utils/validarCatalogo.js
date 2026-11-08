// utils/validarCatalogo.js
// -----------------------------------------------------
// Validaciones de categorías y productos (funciones puras, sin BD),
// pensadas para poder cubrirlas con pruebas unitarias.
// -----------------------------------------------------

// Valida una categoría. Devuelve { datos, errores }.
function validarCategoria(entrada = {}) {
    const errores = [];
    const nombre = String(entrada.nombre ?? '').trim().replace(/\s+/g, ' ');
    const descripcion = String(entrada.descripcion ?? '').trim();
    const activo = entrada.activo === undefined ? true : Boolean(entrada.activo);

    if (nombre.length < 2 || nombre.length > 50) {
        errores.push('El nombre de la categoría debe tener entre 2 y 50 caracteres.');
    }
    if (descripcion.length > 150) {
        errores.push('La descripción no puede superar los 150 caracteres.');
    }

    return { datos: { nombre, descripcion: descripcion || null, activo }, errores };
}

// Valida un producto. Devuelve { datos, errores }.
function validarProducto(entrada = {}) {
    const errores = [];
    const nombre = String(entrada.nombre ?? '').trim();
    const descripcion = String(entrada.descripcion ?? '').trim();
    const precio = Number(entrada.precio);
    const idCategoria = Number(entrada.id_categoria);
    const imagenUrl = String(entrada.imagen_url ?? '').trim();
    const estado = entrada.estado === 'inactivo' ? 'inactivo' : 'activo';

    if (nombre.length < 2 || nombre.length > 100) {
        errores.push('El nombre del producto debe tener entre 2 y 100 caracteres.');
    }
    if (!Number.isFinite(precio) || precio <= 0 || precio > 99999999) {
        errores.push('El precio debe ser un número mayor a 0.');
    }
    if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
        errores.push('Selecciona una categoría registrada.');
    }
    if (imagenUrl.length > 255) {
        errores.push('La URL de la imagen es demasiado larga (máximo 255 caracteres).');
    }

    return {
        datos: {
            nombre,
            descripcion,
            precio: Math.round(precio * 100) / 100,
            id_categoria: idCategoria,
            imagen_url: imagenUrl,
            estado
        },
        errores
    };
}

module.exports = { validarCategoria, validarProducto };
