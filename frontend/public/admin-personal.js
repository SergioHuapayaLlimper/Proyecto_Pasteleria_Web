// admin-personal.js
// -----------------------------------------------------
// Secciones "Personal" y "Roles" del panel administrativo.
// Usa fetchAuth, escaparHTML y Dialogo definidos en admin-dashboard.js / dialogos.js.
// -----------------------------------------------------

let rolesCache = [];
let permisosCatalogo = [];

const ICONOS_PERMISO = {
    dashboard: 'fa-chart-line',
    productos: 'fa-box',
    pedidos: 'fa-shopping-bag',
    pedidos_estado: 'fa-clipboard-check',
    configuracion: 'fa-cog',
    personal: 'fa-users'
};

function formatearFechaCorta(valor) {
    if (!valor) return '-';
    const d = new Date(valor);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mostrarErrorModal(idCaja, mensaje) {
    const caja = document.getElementById(idCaja);
    caja.textContent = mensaje;
    caja.style.display = mensaje ? 'block' : 'none';
}

async function leerRespuesta(res, mensajePorDefecto) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.mensaje || mensajePorDefecto);
    return data;
}

// =====================================================
// ROLES
// =====================================================
async function obtenerRoles() {
    const res = await fetchAuth('/api/personal/roles');
    rolesCache = await leerRespuesta(res, 'No se pudieron cargar los roles.');
    return rolesCache;
}

async function obtenerCatalogoPermisos() {
    if (permisosCatalogo.length) return permisosCatalogo;
    const res = await fetchAuth('/api/personal/roles/permisos');
    permisosCatalogo = await leerRespuesta(res, 'No se pudo cargar el catálogo de permisos.');
    return permisosCatalogo;
}

async function cargarRoles() {
    const contenedor = document.getElementById('lista-roles');
    try {
        const [roles, catalogo] = await Promise.all([obtenerRoles(), obtenerCatalogoPermisos()]);
        const nombrePermiso = clave => (catalogo.find(p => p.clave === clave) || {}).nombre || clave;

        contenedor.innerHTML = roles.map(r => `
            <article class="card-rol ${r.es_sistema ? 'sistema' : ''}">
                <header>
                    <div>
                        <h3>${escaparHTML(r.nombre)}</h3>
                        <small>${r.total_usuarios} usuario(s) · creado ${formatearFechaCorta(r.creado_en)}</small>
                    </div>
                    ${r.es_sistema
                        ? '<span class="badge badge-sistema"><i class="fas fa-lock"></i> Sistema</span>'
                        : `<div class="acciones">
                               <button class="btn-sm btn-editar" data-accion="editar-rol" data-id="${r.id}" title="Editar rol"><i class="fas fa-edit"></i></button>
                               <button class="btn-sm btn-eliminar" data-accion="eliminar-rol" data-id="${r.id}" title="Eliminar rol"><i class="fas fa-trash"></i></button>
                           </div>`}
                </header>
                <p>${escaparHTML(r.descripcion || 'Sin descripción.')}</p>
                <ul class="chips-permisos">
                    ${r.permisos.map(p => `<li><i class="fas ${ICONOS_PERMISO[p] || 'fa-check'}"></i> ${escaparHTML(nombrePermiso(p))}</li>`).join('')}
                </ul>
            </article>
        `).join('');
    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<p class="vacio">${escaparHTML(error.message)}</p>`;
    }
}

async function abrirModalRol(rol = null) {
    const catalogo = await obtenerCatalogoPermisos();
    document.getElementById('titulo-modal-rol').textContent = rol ? 'Editar rol' : 'Nuevo rol';
    document.getElementById('rol-id').value = rol ? rol.id : '';
    document.getElementById('rol-nombre').value = rol ? rol.nombre : '';
    document.getElementById('rol-descripcion').value = rol ? (rol.descripcion || '') : '';
    mostrarErrorModal('rol-error', '');

    const seleccionados = rol ? rol.permisos : [];
    document.getElementById('rol-permisos').innerHTML = catalogo.map(p => `
        <label class="permiso-opcion">
            <input type="checkbox" value="${p.clave}" ${seleccionados.includes(p.clave) ? 'checked' : ''}>
            <span class="permiso-icono"><i class="fas ${ICONOS_PERMISO[p.clave] || 'fa-check'}"></i></span>
            <span class="permiso-texto">
                <strong>${escaparHTML(p.nombre)}</strong>
                <small>${escaparHTML(p.descripcion)}</small>
            </span>
        </label>
    `).join('');

    document.getElementById('modal-rol').classList.add('activo');
    document.getElementById('rol-nombre').focus();
}

async function guardarRol(e) {
    e.preventDefault();
    const id = document.getElementById('rol-id').value;
    const payload = {
        nombre: document.getElementById('rol-nombre').value.trim(),
        descripcion: document.getElementById('rol-descripcion').value.trim(),
        permisos: [...document.querySelectorAll('#rol-permisos input:checked')].map(c => c.value)
    };

    if (payload.nombre.length < 3) return mostrarErrorModal('rol-error', 'El nombre del rol debe tener al menos 3 caracteres.');
    if (!payload.permisos.length) return mostrarErrorModal('rol-error', 'Selecciona al menos un permiso.');

    const btn = document.getElementById('btn-guardar-rol');
    btn.disabled = true;
    try {
        const res = await fetchAuth(id ? `/api/personal/roles/${id}` : '/api/personal/roles', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        await leerRespuesta(res, 'No se pudo guardar el rol.');
        document.getElementById('modal-rol').classList.remove('activo');
        Dialogo.toast(id ? 'Rol actualizado.' : 'Rol creado.', 'exito');
        cargarRoles();
    } catch (error) {
        mostrarErrorModal('rol-error', error.message);
    } finally {
        btn.disabled = false;
    }
}

async function eliminarRol(id) {
    const rol = rolesCache.find(r => r.id === id);
    if (!rol) return;
    if (rol.total_usuarios > 0) {
        return Dialogo.alerta({
            titulo: 'No se puede eliminar',
            mensaje: `El rol "${rol.nombre}" tiene ${rol.total_usuarios} usuario(s) asignado(s). Cámbiales el rol antes de eliminarlo.`,
            tipo: 'aviso'
        });
    }
    const ok = await Dialogo.confirmar({
        titulo: `¿Eliminar el rol "${rol.nombre}"?`,
        mensaje: 'Esta acción no se puede deshacer.',
        textoConfirmar: 'Eliminar',
        tipo: 'peligro'
    });
    if (!ok) return;

    try {
        const res = await fetchAuth(`/api/personal/roles/${id}`, { method: 'DELETE' });
        await leerRespuesta(res, 'No se pudo eliminar el rol.');
        Dialogo.toast('Rol eliminado.', 'exito');
        cargarRoles();
    } catch (error) {
        Dialogo.toast(error.message, 'error');
    }
}

// =====================================================
// PERSONAL (USUARIOS)
// =====================================================
let usuariosCache = [];

async function cargarUsuarios() {
    const tbody = document.getElementById('tabla-usuarios');
    try {
        const res = await fetchAuth('/api/personal/usuarios');
        usuariosCache = await leerRespuesta(res, 'No se pudo cargar el personal.');

        if (!usuariosCache.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="vacio">No hay usuarios registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = usuariosCache.map(u => {
            const iniciales = u.nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
            const estado = u.bloqueado
                ? '<span class="badge badge-bloqueado"><i class="fas fa-lock"></i> Bloqueado</span>'
                : (u.activo ? '<span class="badge badge-activo">Activo</span>' : '<span class="badge badge-inactivo">Inactivo</span>');
            return `
            <tr>
                <td>
                    <div class="celda-usuario">
                        <span class="avatar">${escaparHTML(iniciales)}</span>
                        <div>
                            <strong>${escaparHTML(u.nombre)}${u.es_yo ? ' <small class="tu">(tú)</small>' : ''}</strong>
                            <small>${escaparHTML(u.email)}</small>
                        </div>
                    </div>
                </td>
                <td>${escaparHTML(u.telefono || '-')}</td>
                <td><span class="badge badge-rol ${u.rol_sistema ? 'admin' : ''}">${escaparHTML(u.rol)}</span></td>
                <td>${estado}</td>
                <td>${formatearFechaCorta(u.creado_en)}</td>
                <td>
                    <button class="btn-sm btn-editar" data-accion="editar-usuario" data-id="${u.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    ${u.es_yo ? '' : `<button class="btn-sm btn-eliminar" data-accion="eliminar-usuario" data-id="${u.id}" title="Eliminar"><i class="fas fa-trash"></i></button>`}
                </td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" class="vacio">${escaparHTML(error.message)}</td></tr>`;
    }
}

function actualizarAyudaRol() {
    const id = Number(document.getElementById('usr-rol').value);
    const rol = rolesCache.find(r => r.id === id);
    const nombres = rol ? rol.permisos.map(p => (permisosCatalogo.find(c => c.clave === p) || {}).nombre || p) : [];
    document.getElementById('usr-rol-ayuda').textContent = rol ? `Acceso a: ${nombres.join(', ')}.` : '';
}

async function abrirModalUsuario(usuario = null) {
    try {
        await Promise.all([obtenerRoles(), obtenerCatalogoPermisos()]);
    } catch (error) {
        return Dialogo.toast(error.message, 'error');
    }

    const select = document.getElementById('usr-rol');
    select.innerHTML = rolesCache.map(r => `<option value="${r.id}">${escaparHTML(r.nombre)}</option>`).join('');

    const esYo = usuario && usuario.es_yo;
    document.getElementById('titulo-modal-usuario').textContent = usuario ? 'Editar usuario' : 'Nuevo usuario';
    document.getElementById('usr-id').value = usuario ? usuario.id : '';
    document.getElementById('usr-nombre').value = usuario ? usuario.nombre : '';
    document.getElementById('usr-email').value = usuario ? usuario.email : '';
    document.getElementById('usr-telefono').value = usuario ? (usuario.telefono || '') : '';
    select.value = usuario ? usuario.id_rol : (rolesCache.find(r => !r.es_sistema) || rolesCache[0] || {}).id;
    select.disabled = Boolean(esYo);
    document.getElementById('usr-password').value = '';
    document.getElementById('usr-password2').value = '';
    document.getElementById('usr-activo').checked = usuario ? usuario.activo : true;
    document.getElementById('usr-activo').disabled = Boolean(esYo);
    document.getElementById('usr-desbloquear').checked = false;
    document.getElementById('fila-desbloquear').style.display = usuario && usuario.bloqueado ? '' : 'none';
    document.getElementById('usr-password-label').textContent = usuario ? 'Nueva contraseña' : 'Contraseña *';
    document.getElementById('usr-password-ayuda').textContent = usuario
        ? 'Déjala vacía para mantener la contraseña actual.'
        : 'Mínimo 8 caracteres, con al menos una letra y un número.';
    mostrarErrorModal('usr-error', esYo ? '' : '');
    actualizarAyudaRol();

    document.getElementById('modal-usuario').classList.add('activo');
    document.getElementById('usr-nombre').focus();
}

async function guardarUsuario(e) {
    e.preventDefault();
    const id = document.getElementById('usr-id').value;
    const password = document.getElementById('usr-password').value;
    const password2 = document.getElementById('usr-password2').value;

    const payload = {
        nombre: document.getElementById('usr-nombre').value.trim(),
        email: document.getElementById('usr-email').value.trim(),
        telefono: document.getElementById('usr-telefono').value.trim(),
        id_rol: Number(document.getElementById('usr-rol').value),
        activo: document.getElementById('usr-activo').checked,
        desbloquear: document.getElementById('usr-desbloquear').checked
    };
    if (password) payload.password = password;

    // Validaciones rápidas en el navegador (el servidor vuelve a validar)
    if (payload.nombre.length < 3) return mostrarErrorModal('usr-error', 'Ingresa el nombre completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return mostrarErrorModal('usr-error', 'Ingresa un correo válido.');
    if (payload.telefono) {
        let digitos = payload.telefono.replace(/\D/g, '');
        if (digitos.length === 11 && digitos.startsWith('51')) digitos = digitos.slice(2);
        if (!/^9\d{8}$/.test(digitos)) {
            return mostrarErrorModal('usr-error', 'El teléfono debe ser un celular de 9 dígitos que empiece con 9.');
        }
        payload.telefono = digitos;
    }
    if (!id && !password) return mostrarErrorModal('usr-error', 'La contraseña es obligatoria para una cuenta nueva.');
    if (password !== password2) return mostrarErrorModal('usr-error', 'Las contraseñas no coinciden.');

    const btn = document.getElementById('btn-guardar-usuario');
    btn.disabled = true;
    try {
        const res = await fetchAuth(id ? `/api/personal/usuarios/${id}` : '/api/personal/usuarios', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });
        await leerRespuesta(res, 'No se pudo guardar el usuario.');
        document.getElementById('modal-usuario').classList.remove('activo');
        Dialogo.toast(id ? 'Usuario actualizado.' : 'Usuario creado. Ya puede iniciar sesión.', 'exito');
        cargarUsuarios();
    } catch (error) {
        mostrarErrorModal('usr-error', error.message);
    } finally {
        btn.disabled = false;
    }
}

async function eliminarUsuario(id) {
    const u = usuariosCache.find(x => x.id === id);
    if (!u) return;
    const ok = await Dialogo.confirmar({
        titulo: `¿Eliminar a ${u.nombre}?`,
        mensaje: `La cuenta ${u.email} se eliminará definitivamente. Si solo quieres quitarle el acceso por un tiempo, edítala y desactívala.`,
        textoConfirmar: 'Eliminar cuenta',
        tipo: 'peligro'
    });
    if (!ok) return;

    try {
        const res = await fetchAuth(`/api/personal/usuarios/${id}`, { method: 'DELETE' });
        await leerRespuesta(res, 'No se pudo eliminar el usuario.');
        Dialogo.toast('Usuario eliminado.', 'exito');
        cargarUsuarios();
    } catch (error) {
        Dialogo.toast(error.message, 'error');
    }
}

// =====================================================
// EVENTOS
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-nuevo-usuario').addEventListener('click', () => abrirModalUsuario());
    document.getElementById('btn-nuevo-rol').addEventListener('click', () => abrirModalRol());
    document.getElementById('form-usuario').addEventListener('submit', guardarUsuario);
    document.getElementById('form-rol').addEventListener('submit', guardarRol);
    document.getElementById('usr-rol').addEventListener('change', actualizarAyudaRol);

    document.getElementById('cerrar-modal-usuario').addEventListener('click', () =>
        document.getElementById('modal-usuario').classList.remove('activo'));
    document.getElementById('cerrar-modal-rol').addEventListener('click', () =>
        document.getElementById('modal-rol').classList.remove('activo'));

    // Mostrar/ocultar contraseña
    document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.objetivo);
        const oculto = input.type === 'password';
        input.type = oculto ? 'text' : 'password';
        btn.innerHTML = `<i class="fas ${oculto ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    }));

    // Botones de las tablas (delegación de eventos)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        switch (btn.dataset.accion) {
            case 'editar-usuario': abrirModalUsuario(usuariosCache.find(u => u.id === id)); break;
            case 'eliminar-usuario': eliminarUsuario(id); break;
            case 'editar-rol': abrirModalRol(rolesCache.find(r => r.id === id)); break;
            case 'eliminar-rol': eliminarRol(id); break;
        }
    });
});
