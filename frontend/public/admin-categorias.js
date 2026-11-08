// admin-categorias.js
// -----------------------------------------------------
// Sección "Categorías" del panel y combo de categorías del formulario
// de productos. Usa fetchAuth, escaparHTML y Dialogo (admin-dashboard.js).
// RF-07
// -----------------------------------------------------

let categoriasCache = [];

async function obtenerCategorias({ soloActivas = false } = {}) {
    const res = await fetchAuth(`/api/categorias${soloActivas ? '?activas=1' : ''}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.mensaje || 'No se pudieron cargar las categorías.');
    return data;
}

// ---- Tabla de categorías ----
async function cargarCategorias() {
    const tbody = document.getElementById('tabla-categorias');
    try {
        categoriasCache = await obtenerCategorias();

        if (!categoriasCache.length) {
            tbody.innerHTML = `
                <tr><td colspan="5">
                    <div class="estado-vacio en-tabla">
                        <i class="fas fa-tags"></i>
                        <h3>Aún no hay categorías</h3>
                        <p>Crea al menos una para poder registrar productos.</p>
                    </div>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = categoriasCache.map(c => `
            <tr>
                <td>
                    <strong>${escaparHTML(c.nombre)}</strong>
                    <small class="texto-suave">${escaparHTML(c.descripcion || 'Sin descripción')}</small>
                </td>
                <td>
                    <strong>${c.total_productos}</strong>
                    <small class="texto-suave">${c.productos_activos} activo(s)</small>
                </td>
                <td>${c.activo
                    ? '<span class="badge badge-activo">Activa</span>'
                    : '<span class="badge badge-inactivo">Inactiva</span>'}</td>
                <td>${formatearFechaCorta(c.creado_en)}</td>
                <td>
                    <button class="btn-sm btn-editar" data-accion="editar-categoria" data-id="${c.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-eliminar" data-accion="eliminar-categoria" data-id="${c.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="5" class="vacio">${escaparHTML(error.message)}</td></tr>`;
    }
}

// ---- Modal crear/editar ----
function abrirModalCategoria(categoria = null) {
    document.getElementById('titulo-modal-categoria').textContent = categoria ? 'Editar categoría' : 'Nueva categoría';
    document.getElementById('cat-id').value = categoria ? categoria.id : '';
    document.getElementById('cat-nombre').value = categoria ? categoria.nombre : '';
    document.getElementById('cat-descripcion').value = categoria ? (categoria.descripcion || '') : '';
    document.getElementById('cat-activo').checked = categoria ? categoria.activo : true;
    actualizarAvisoInactiva();
    mostrarErrorModal('cat-error', '');
    document.getElementById('modal-categoria').classList.add('activo');
    document.getElementById('cat-nombre').focus();
}

function actualizarAvisoInactiva() {
    const id = document.getElementById('cat-id').value;
    const activo = document.getElementById('cat-activo').checked;
    document.getElementById('cat-aviso-inactiva').hidden = activo || !id;
}

async function guardarCategoria(e) {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const payload = {
        nombre: document.getElementById('cat-nombre').value.trim(),
        descripcion: document.getElementById('cat-descripcion').value.trim(),
        activo: document.getElementById('cat-activo').checked
    };

    if (payload.nombre.length < 2) {
        return mostrarErrorModal('cat-error', 'El nombre debe tener al menos 2 caracteres.');
    }

    const btn = document.getElementById('btn-guardar-categoria');
    btn.disabled = true;
    try {
        const res = await fetchAuth(id ? `/api/categorias/${id}` : '/api/categorias', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.mensaje || 'No se pudo guardar la categoría.');

        document.getElementById('modal-categoria').classList.remove('activo');
        Dialogo.toast(id ? 'Categoría actualizada.' : 'Categoría creada.', 'exito');
        cargarCategorias();
    } catch (error) {
        mostrarErrorModal('cat-error', error.message);
    } finally {
        btn.disabled = false;
    }
}

async function eliminarCategoria(id) {
    const c = categoriasCache.find(x => x.id === id);
    if (!c) return;

    if (c.total_productos > 0) {
        const desactivar = await Dialogo.confirmar({
            titulo: 'No se puede eliminar',
            mensaje: `"${c.nombre}" tiene ${c.total_productos} producto(s). Puedes desactivarla para que no aparezca al registrar nuevos productos.`,
            textoConfirmar: c.activo ? 'Desactivar categoría' : 'Entendido',
            tipo: 'aviso'
        });
        if (desactivar && c.activo) {
            await cambiarEstadoCategoria(c, false);
        }
        return;
    }

    const ok = await Dialogo.confirmar({
        titulo: `¿Eliminar "${c.nombre}"?`,
        mensaje: 'Esta acción no se puede deshacer.',
        textoConfirmar: 'Eliminar',
        tipo: 'peligro'
    });
    if (!ok) return;

    try {
        const res = await fetchAuth(`/api/categorias/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.mensaje || 'No se pudo eliminar la categoría.');
        Dialogo.toast('Categoría eliminada.', 'exito');
        cargarCategorias();
    } catch (error) {
        Dialogo.toast(error.message, 'error');
    }
}

async function cambiarEstadoCategoria(c, activo) {
    try {
        const res = await fetchAuth(`/api/categorias/${c.id}`, {
            method: 'PUT',
            body: JSON.stringify({ nombre: c.nombre, descripcion: c.descripcion, activo })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.mensaje || 'No se pudo actualizar la categoría.');
        Dialogo.toast(activo ? 'Categoría activada.' : 'Categoría desactivada.', 'exito');
        cargarCategorias();
    } catch (error) {
        Dialogo.toast(error.message, 'error');
    }
}

// ---- Combo del formulario de productos ----
// Llena el <select> con las categorías activas. Si el producto que se edita
// tiene una categoría ya desactivada, se agrega como opción para no perderla.
// Devuelve false si no hay categorías (y avisa al usuario).
async function cargarOpcionesCategorias(idSeleccionada = null, nombreSeleccionada = '') {
    const select = document.getElementById('prod-categoria');
    let activas;
    try {
        activas = await obtenerCategorias({ soloActivas: true });
    } catch (error) {
        Dialogo.toast(error.message, 'error');
        return false;
    }

    const opciones = activas.map(c => ({ id: c.id, nombre: c.nombre }));
    if (idSeleccionada && !opciones.some(o => o.id === Number(idSeleccionada))) {
        opciones.push({ id: Number(idSeleccionada), nombre: `${nombreSeleccionada} (inactiva)` });
    }

    if (!opciones.length) {
        const ir = await Dialogo.confirmar({
            titulo: 'No hay categorías registradas',
            mensaje: 'Antes de registrar un producto, crea al menos una categoría.',
            textoConfirmar: 'Crear categoría',
            icono: 'fa-tags'
        });
        if (ir) {
            cambiarSeccion('categorias');
            abrirModalCategoria();
        }
        return false;
    }

    select.innerHTML = '<option value="">-- Selecciona una categoría --</option>' +
        opciones.map(o => `<option value="${o.id}">${escaparHTML(o.nombre)}</option>`).join('');
    return true;
}

// ---- Eventos ----
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-nueva-categoria').addEventListener('click', () => abrirModalCategoria());
    document.getElementById('form-categoria').addEventListener('submit', guardarCategoria);
    document.getElementById('cat-activo').addEventListener('change', actualizarAvisoInactiva);
    document.getElementById('cerrar-modal-categoria').addEventListener('click', () =>
        document.getElementById('modal-categoria').classList.remove('activo'));

    document.getElementById('link-ir-categorias').addEventListener('click', (e) => {
        e.preventDefault();
        cerrarModalProducto();
        cambiarSeccion('categorias');
    });

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.dataset.accion === 'editar-categoria') abrirModalCategoria(categoriasCache.find(c => c.id === id));
        if (btn.dataset.accion === 'eliminar-categoria') eliminarCategoria(id);
    });
});
