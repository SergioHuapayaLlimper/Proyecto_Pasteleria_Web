// admin-dashboard.js
// -----------------------------------------------------
// Lógica del panel administrativo:
// - Verifica el token JWT
// - Carga el dashboard con métricas y gráficos
// - Gestiona productos (CRUD)
// - Muestra el historial de pedidos con filtros
// - Permite editar la configuración del negocio
// Adaptado a bd_reposteria.
// HU02, HU03, HU07
// -----------------------------------------------------

// ---- VERIFICAR SESIÓN ----
const token = localStorage.getItem('token_admin');
if (!token) {
    window.location.href = 'admin-login.html';
}

let usuarioAdmin = JSON.parse(localStorage.getItem('usuario_admin') || '{}');

// ---- PERMISOS DEL USUARIO CONECTADO ----
function tienePermiso(permiso) {
    return Array.isArray(usuarioAdmin.permisos) && usuarioAdmin.permisos.includes(permiso);
}

function cerrarSesionLocal() {
    localStorage.removeItem('token_admin');
    localStorage.removeItem('usuario_admin');
    window.location.href = 'admin-login.html';
}

// Helper para peticiones autenticadas
async function fetchAuth(url, opciones = {}) {
    const res = await fetch(url, {
        ...opciones,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(opciones.headers || {})
        }
    });
    // Sesión expirada o cuenta desactivada: volver al login
    if (res.status === 401) {
        cerrarSesionLocal();
        throw new Error('Sesión expirada');
    }
    return res;
}

// Escapa texto antes de insertarlo como HTML
function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Obtiene el perfil actualizado (rol y permisos) desde el servidor
async function actualizarPerfil() {
    try {
        const res = await fetchAuth('/api/auth/perfil');
        if (res.ok) {
            const perfil = await res.json();
            usuarioAdmin = { nombre: perfil.nombre, rol: perfil.rol, permisos: perfil.permisos, id: perfil.id };
            localStorage.setItem('usuario_admin', JSON.stringify(usuarioAdmin));
        }
    } catch (error) {
        console.warn('No se pudo actualizar el perfil:', error);
    }
}

// Oculta del menú las secciones a las que el rol no tiene acceso
function aplicarPermisosUI() {
    document.querySelectorAll('[data-permiso]').forEach(el => {
        el.style.display = tienePermiso(el.dataset.permiso) ? '' : 'none';
    });
    document.getElementById('rol-usuario').textContent = usuarioAdmin.rol || '';
    document.getElementById('nombre-usuario').textContent = usuarioAdmin.nombre || 'Usuario';
}

// Primera sección del menú que el usuario puede ver
function primeraSeccionPermitida() {
    const item = [...document.querySelectorAll('.nav-item')]
        .find(b => tienePermiso(b.dataset.permiso));
    return item ? item.dataset.seccion : null;
}

// ---- REFERENCIAS GLOBALES ----
let graficoEstados = null;
let graficoConsultas = null;

// ---- INICIALIZAR ----
document.addEventListener('DOMContentLoaded', async () => {
    // Rol y permisos actuales (pueden haber cambiado desde el último login)
    await actualizarPerfil();
    aplicarPermisosUI();

    // Navegación entre secciones
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const seccion = btn.dataset.seccion;
            cambiarSeccion(seccion);
        });
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
        const ok = await Dialogo.confirmar({
            titulo: '¿Cerrar sesión?',
            mensaje: 'Tendrás que volver a ingresar tus credenciales para acceder al panel.',
            textoConfirmar: 'Cerrar sesión',
            icono: 'fa-right-from-bracket'
        });
        if (ok) cerrarSesionLocal();
    });

    // Abrir la primera sección permitida para este rol
    const inicial = primeraSeccionPermitida();
    if (inicial) {
        cambiarSeccion(inicial);
    } else {
        await Dialogo.alerta({
            titulo: 'Sin acceso',
            mensaje: 'Tu rol no tiene secciones asignadas en el panel. Comunícate con el administrador.',
            tipo: 'aviso'
        });
        cerrarSesionLocal();
    }

    // Eventos de filtros
    document.getElementById('btn-filtrar').addEventListener('click', cargarDashboard);
    document.getElementById('btn-exportar-metricas').addEventListener('click', exportarMetricas);
    document.getElementById('btn-filtrar-pedidos').addEventListener('click', cargarPedidos);
    document.getElementById('btn-exportar-pedidos').addEventListener('click', exportarPedidos);

    // Modal producto
    document.getElementById('btn-nuevo-producto').addEventListener('click', abrirModalNuevoProducto);
    document.getElementById('cerrar-modal-producto').addEventListener('click', cerrarModalProducto);
    document.getElementById('form-producto').addEventListener('submit', guardarProducto);

    // Formulario de configuración
    document.getElementById('form-config').addEventListener('submit', guardarConfiguracion);
});

// ---- CAMBIAR SECCIÓN ----
// Qué función carga los datos de cada sección al entrar en ella.
const CARGADORES_SECCION = {
    dashboard: cargarDashboard,
    productos: cargarProductos,
    pedidos: cargarPedidos,
    configuracion: cargarConfiguracion,
    personal: () => cargarUsuarios(),   // definidas en admin-personal.js
    roles: () => cargarRoles()
};

function cambiarSeccion(seccion) {
    const item = document.querySelector(`.nav-item[data-seccion="${seccion}"]`);
    if (!item || !tienePermiso(item.dataset.permiso)) return;

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('activo'));
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));

    document.querySelector(`.nav-item[data-seccion="${seccion}"]`).classList.add('activo');
    document.getElementById(`seccion-${seccion}`).classList.add('activa');

    const cargarSeccion = CARGADORES_SECCION[seccion];
    if (cargarSeccion) cargarSeccion();
}

// Genera y descarga un Excel (hoja "Pedidos") con los datos recibidos.
// descargarExcel(datos, prefijo, opciones) está definida en exportarExcel.js

// =====================================================
// SECCIÓN: DASHBOARD (HU02 / RF-04, RF-05, RF-06)
// =====================================================
async function cargarDashboard() {
    try {
        const res = await fetchAuth('/api/metricas/resumen');
        const data = await res.json();

        // Tarjetas
        document.getElementById('metrica-pedidos').textContent = data.totalPedidos;
        document.getElementById('metrica-ventas').textContent = `S/ ${parseFloat(data.ventasTotales).toFixed(2)}`;
        document.getElementById('metrica-productos').textContent = data.totalProductos;

        const whatsapp = data.consultas.find(c => c.tipo === 'whatsapp');
        document.getElementById('metrica-whatsapp').textContent = whatsapp ? whatsapp.cantidad : 0;

        // Gráficos
        dibujarGraficoEstados(data.porEstado);
        dibujarGraficoConsultas(data.consultas);

    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

function dibujarGraficoEstados(porEstado) {
    const ctx = document.getElementById('grafico-estados');
    if (graficoEstados) graficoEstados.destroy();

    const colores = {
        Pendiente: '#ffc107',
        Completado: '#28a745',
        Cancelado: '#dc3545'
    };

    graficoEstados = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: porEstado.map(e => e.estado),
            datasets: [{
                data: porEstado.map(e => e.cantidad),
                backgroundColor: porEstado.map(e => colores[e.estado] || '#999')
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function dibujarGraficoConsultas(consultas) {
    const ctx = document.getElementById('grafico-consultas');
    if (graficoConsultas) graficoConsultas.destroy();

    graficoConsultas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: consultas.map(c => c.tipo),
            datasets: [{
                label: 'Cantidad',
                data: consultas.map(c => c.cantidad),
                backgroundColor: ['#25d366', '#17a2b8', '#8b5a5a']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

async function exportarMetricas() {
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;

    try {
        const res = await fetchAuth(`/api/metricas/exportar?desde=${desde}&hasta=${hasta}`);
        const datos = await res.json();

        if (!datos.length) {
            Dialogo.toast('No hay datos para exportar en el rango seleccionado.', 'aviso');
            return;
        }

        await descargarExcel(datos, 'Reporte_Jorby', {
            titulo: 'Reporte de Ventas',
            nombreHoja: 'Detalle',
            filtros: { desde, hasta }
        });
        Dialogo.toast('Reporte exportado correctamente.', 'exito');
    } catch (error) {
        console.error('Error al exportar:', error);
        Dialogo.toast('No se pudo exportar el reporte.', 'error');
    }
}

// =====================================================
// SECCIÓN: PRODUCTOS (HU03 / RF-07, RF-08, RF-09)
// =====================================================
async function cargarProductos() {
    try {
        const res = await fetchAuth('/api/productos/todos');
        const productos = await res.json();
        const tbody = document.getElementById('tabla-productos');

        if (!productos.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">No hay productos.</td></tr>';
            return;
        }

        tbody.innerHTML = productos.map(p => `
            <tr>
                <td><img src="${p.imagen_url || 'https://via.placeholder.com/50'}" alt="${p.nombre}"></td>
                <td><strong>${p.nombre}</strong><br><small>${p.descripcion || ''}</small></td>
                <td>${p.categoria}</td>
                <td>S/ ${parseFloat(p.precio).toFixed(2)}</td>
                <td><span class="badge badge-${p.estado}">${p.estado}</span></td>
                <td>
                    <button class="btn-sm btn-editar" onclick='editarProducto(${JSON.stringify(p).replace(/'/g, "&apos;")})'>
                        <i class="fas fa-edit"></i>
                    </button>
                    ${p.estado === 'activo' ? `
                        <button class="btn-sm btn-eliminar" onclick="desactivarProducto(${p.id})">
                            <i class="fas fa-ban"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

function abrirModalNuevoProducto() {
    document.getElementById('titulo-modal-producto').textContent = 'Nuevo Producto';
    document.getElementById('form-producto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-estado').value = 'activo';
    document.getElementById('modal-producto').classList.add('activo');
}

function editarProducto(producto) {
    document.getElementById('titulo-modal-producto').textContent = 'Editar Producto';
    document.getElementById('prod-id').value = producto.id;
    document.getElementById('prod-nombre').value = producto.nombre;
    document.getElementById('prod-descripcion').value = producto.descripcion || '';
    document.getElementById('prod-precio').value = producto.precio;
    document.getElementById('prod-categoria').value = producto.categoria;
    document.getElementById('prod-imagen').value = producto.imagen_url || '';
    document.getElementById('prod-estado').value = producto.estado;
    document.getElementById('modal-producto').classList.add('activo');
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').classList.remove('activo');
}

async function guardarProducto(e) {
    e.preventDefault();

    const id = document.getElementById('prod-id').value;
    const payload = {
        nombre: document.getElementById('prod-nombre').value,
        descripcion: document.getElementById('prod-descripcion').value,
        precio: document.getElementById('prod-precio').value,
        categoria: document.getElementById('prod-categoria').value,
        imagen_url: document.getElementById('prod-imagen').value,
        estado: document.getElementById('prod-estado').value
    };

    try {
        const url = id ? `/api/productos/${id}` : '/api/productos';
        const metodo = id ? 'PUT' : 'POST';

        const res = await fetchAuth(url, {
            method: metodo,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.mensaje || 'No se pudo guardar el producto.');
        }

        cerrarModalProducto();
        cargarProductos();
        Dialogo.toast('Producto guardado correctamente.', 'exito');

    } catch (error) {
        console.error('Error al guardar producto:', error);
        Dialogo.toast(error.message, 'error');
    }
}

async function desactivarProducto(id) {
    const ok = await Dialogo.confirmar({
        titulo: '¿Desactivar producto?',
        mensaje: 'Ya no aparecerá en el catálogo de la página principal. Podrás activarlo de nuevo editándolo.',
        textoConfirmar: 'Desactivar',
        tipo: 'peligro'
    });
    if (!ok) return;

    try {
        const res = await fetchAuth(`/api/productos/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        cargarProductos();
        Dialogo.toast('Producto desactivado.', 'exito');
    } catch (error) {
        console.error('Error al desactivar:', error);
        Dialogo.toast('No se pudo desactivar el producto.', 'error');
    }
}

// =====================================================
// SECCIÓN: PEDIDOS (HU07 / RF-19, RF-20, RF-21)
// =====================================================
// Lee los filtros de la sección Pedidos y los devuelve como parámetros de URL.
function obtenerFiltrosPedidos() {
    const desde = document.getElementById('pedido-desde').value;
    const hasta = document.getElementById('pedido-hasta').value;
    const estado = document.getElementById('pedido-estado').value;

    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (estado) params.append('estado', estado);
    return params;
}

async function cargarPedidos() {
    const params = obtenerFiltrosPedidos();

    try {
        const res = await fetchAuth(`/api/pedidos?${params.toString()}`);
        const pedidos = await res.json();
        const tbody = document.getElementById('tabla-pedidos');

        if (!pedidos.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">No hay pedidos.</td></tr>';
            return;
        }

        tbody.innerHTML = pedidos.map(p => `
            <tr>
                <td><strong>${p.codigo_pedido}</strong></td>
                <td>${p.cliente_nombre}</td>
                <td>${p.cliente_telefono}</td>
                <td>${p.metodo_pago}</td>
                <td>S/ ${parseFloat(p.monto_total).toFixed(2)}</td>
                <td><span class="badge badge-${p.estado.toLowerCase()}">${p.estado}</span></td>
                <td>${new Date(p.creado_en).toLocaleDateString('es-PE')}</td>
                <td>
                    ${p.estado === 'Pendiente' && tienePermiso('pedidos_estado') ? `
                        <button class="btn-sm btn-completar" onclick="cambiarEstadoPedido(${p.id}, 'Completado')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-sm btn-eliminar" onclick="cambiarEstadoPedido(${p.id}, 'Cancelado')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar pedidos:', error);
    }
}

async function cambiarEstadoPedido(id, nuevoEstado) {
    const ok = await Dialogo.confirmar({
        titulo: 'Cambiar estado del pedido',
        mensaje: `¿Marcar este pedido como "${nuevoEstado}"?`,
        textoConfirmar: `Marcar como ${nuevoEstado}`,
        tipo: nuevoEstado === 'Cancelado' ? 'peligro' : 'pregunta'
    });
    if (!ok) return;

    try {
        const res = await fetchAuth(`/api/pedidos/${id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: nuevoEstado })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.mensaje || 'No se pudo cambiar el estado.');
        }
        cargarPedidos();
        Dialogo.toast(`Pedido marcado como ${nuevoEstado}.`, 'exito');
    } catch (error) {
        console.error('Error:', error);
        Dialogo.toast(error.message, 'error');
    }
}

async function exportarPedidos() {
    const params = obtenerFiltrosPedidos();

    try {
        const res = await fetchAuth(`/api/pedidos?${params.toString()}`);
        const pedidos = await res.json();

        if (!pedidos.length) {
            Dialogo.toast('No hay pedidos para exportar con los filtros actuales.', 'aviso');
            return;
        }

        await descargarExcel(pedidos, 'Pedidos_Jorby', {
            titulo: 'Reporte de Pedidos',
            nombreHoja: 'Pedidos',
            filtros: Object.fromEntries(params)
        });
        Dialogo.toast('Pedidos exportados correctamente.', 'exito');
    } catch (error) {
        console.error('Error al exportar:', error);
        Dialogo.toast('No se pudo exportar los pedidos.', 'error');
    }
}

// =====================================================
// SECCIÓN: CONFIGURACIÓN
// =====================================================
// Relación entre cada clave de configuración (API) y el id de su campo en el formulario.
const CAMPOS_CONFIG = {
    direccion: 'cfg-direccion',
    mapa_lat: 'cfg-lat',
    mapa_lng: 'cfg-lng',
    horario_atencion: 'cfg-horario',
    metodos_pago: 'cfg-pagos',
    telefono_contacto: 'cfg-telefono',
    correo_contacto: 'cfg-correo',
    whatsapp_numero: 'cfg-whatsapp',
    whatsapp_mensaje: 'cfg-whatsapp-msg'
};

async function cargarConfiguracion() {
    try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        const config = await res.json();

        Object.entries(CAMPOS_CONFIG).forEach(([clave, idCampo]) => {
            document.getElementById(idCampo).value = config[clave] || '';
        });
        actualizarPreviewMapa();
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        mostrarMensajeConfig('No se pudo cargar la configuración.', 'error');
    }
}

// Actualiza el mapa de vista previa según la latitud/longitud escritas
function actualizarPreviewMapa() {
    const iframe = document.getElementById('cfg-mapa-preview');
    if (!iframe) return;
    const lat = document.getElementById('cfg-lat').value.trim();
    const lng = document.getElementById('cfg-lng').value.trim();
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    const nuevaUrl = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&output=embed`;
    if (iframe.src !== nuevaUrl) iframe.src = nuevaUrl;
}

// Al escribir latitud o longitud, refresca el mapa (con una pequeña espera)
let temporizadorMapa = null;
document.addEventListener('input', (e) => {
    if (e.target.id !== 'cfg-lat' && e.target.id !== 'cfg-lng') return;
    clearTimeout(temporizadorMapa);
    temporizadorMapa = setTimeout(actualizarPreviewMapa, 600);
});

function mostrarMensajeConfig(texto, tipo) {
    const caja = document.getElementById('cfg-mensaje');
    if (!caja) return Dialogo.toast(texto, tipo);
    caja.textContent = texto;
    caja.className = `cfg-mensaje ${tipo}`;
    caja.style.display = 'block';
}

async function guardarConfiguracion(e) {
    e.preventDefault();

    const payload = Object.fromEntries(
        Object.entries(CAMPOS_CONFIG).map(([clave, idCampo]) => [
            clave,
            document.getElementById(idCampo).value
        ])
    );

    const btn = document.getElementById('btn-guardar-config');
    if (btn) btn.disabled = true;

    try {
        const res = await fetchAuth('/api/config', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.mensaje || 'Error al guardar la configuración');

        mostrarMensajeConfig('Configuración guardada. Los cambios ya se ven en la página principal.', 'exito');
        Dialogo.toast('Configuración guardada.', 'exito');
        cargarConfiguracion(); // muestra los valores tal como quedaron guardados
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        mostrarMensajeConfig(error.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}