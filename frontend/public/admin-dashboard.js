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

// En celular las tablas se muestran como tarjetas: cada celda necesita
// saber el nombre de su columna (data-label) para mostrarlo como título.
function etiquetarTabla(tabla) {
    const titulos = [...tabla.querySelectorAll('thead th')].map(th => th.textContent.trim());
    tabla.querySelectorAll('tbody tr').forEach(tr => {
        [...tr.children].forEach((td, i) => {
            if (!td.hasAttribute('colspan') && titulos[i]) td.dataset.label = titulos[i];
        });
    });
}

// Etiqueta automáticamente cada tabla cuando su contenido cambia
new MutationObserver((cambios) => {
    const tablas = new Set();
    cambios.forEach(c => {
        const tabla = c.target.closest && c.target.closest('table.tabla');
        if (tabla) tablas.add(tabla);
        c.addedNodes.forEach(n => n.querySelectorAll && n.querySelectorAll('table.tabla').forEach(t => tablas.add(t)));
    });
    tablas.forEach(etiquetarTabla);
}).observe(document.documentElement, { childList: true, subtree: true });

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
let filtrosDashboard = null;
let filtrosPedidos = null;
// Evita que una respuesta lenta pise a otra más reciente al cambiar filtros rápido
let turnoDashboard = 0;
let turnoPedidos = 0;

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

    // Barras de filtros: se actualizan solas al cambiar fechas o estado
    filtrosDashboard = FiltrosFecha.configurar({
        prefijo: 'dashboard', idDesde: 'filtro-desde', idHasta: 'filtro-hasta',
        alCambiar: cargarDashboard
    });
    filtrosPedidos = FiltrosFecha.configurar({
        prefijo: 'pedidos', idDesde: 'pedido-desde', idHasta: 'pedido-hasta',
        idsExtra: ['pedido-estado'], alCambiar: cargarPedidos
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

    // Botones de las barras de filtros
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

    // Menú lateral en celular
    document.getElementById('btn-menu-admin').addEventListener('click', () =>
        abrirMenuMovil(!document.getElementById('sidebar').classList.contains('abierta')));
    document.getElementById('sidebar-overlay').addEventListener('click', () => abrirMenuMovil(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirMenuMovil(false); });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) abrirMenuMovil(false); });

    // Detalle del pedido: cerrar con la X, clic fuera o Esc
    const modalDetalle = document.getElementById('modal-detalle-pedido');
    document.getElementById('cerrar-detalle-pedido').addEventListener('click', cerrarDetallePedido);
    modalDetalle.addEventListener('click', (e) => { if (e.target === modalDetalle) cerrarDetallePedido(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarDetallePedido(); });
});

// ---- CAMBIAR SECCIÓN ----
// Qué función carga los datos de cada sección al entrar en ella.
const CARGADORES_SECCION = {
    dashboard: cargarDashboard,
    productos: cargarProductos,
    categorias: () => cargarCategorias(),   // definida en admin-categorias.js
    pedidos: cargarPedidos,
    configuracion: cargarConfiguracion,
    personal: () => cargarUsuarios(),   // definidas en admin-personal.js
    roles: () => cargarRoles()
};

// ---- MENÚ LATERAL EN CELULAR ----
function abrirMenuMovil(abrir) {
    document.getElementById('sidebar').classList.toggle('abierta', abrir);
    document.getElementById('sidebar-overlay').classList.toggle('visible', abrir);
    document.getElementById('btn-menu-admin').setAttribute('aria-expanded', abrir);
    document.body.classList.toggle('menu-abierto', abrir);
}

function cambiarSeccion(seccion) {
    const item = document.querySelector(`.nav-item[data-seccion="${seccion}"]`);
    if (!item || !tienePermiso(item.dataset.permiso)) return;
    abrirMenuMovil(false);
    document.getElementById('topbar-seccion').textContent = item.textContent.trim();

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
function parametrosFecha({ desde, hasta }) {
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    return params;
}

function hayFiltroFecha(f) {
    return Boolean(f.desde || f.hasta);
}

async function cargarDashboard() {
    if (!filtrosDashboard) return;
    const filtros = filtrosDashboard.obtener();
    if (filtros.error) return;

    const turno = ++turnoDashboard;
    const seccion = document.getElementById('seccion-dashboard');
    seccion.classList.add('cargando');

    try {
        const res = await fetchAuth(`/api/metricas/resumen?${parametrosFecha(filtros)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'No se pudieron cargar las métricas.');
        if (turno !== turnoDashboard) return; // llegó una respuesta más nueva

        // Tarjetas
        const totalWhatsapp = (data.consultas.find(c => c.tipo === 'whatsapp') || {}).cantidad || 0;
        document.getElementById('metrica-pedidos').textContent = data.totalPedidos;
        document.getElementById('metrica-ventas').textContent = `S/ ${Number(data.ventasTotales).toFixed(2)}`;
        document.getElementById('metrica-productos').textContent = data.totalProductos;
        document.getElementById('metrica-whatsapp').textContent = totalWhatsapp;

        document.getElementById('dashboard-rango').innerHTML =
            `<i class="fas fa-calendar-days"></i> Mostrando datos ${escaparHTML(filtrosDashboard.describir())}`;

        // Sin pedidos ni consultas en el rango: ocultar gráficos y mostrar aviso
        const totalConsultas = data.consultas.reduce((a, c) => a + c.cantidad, 0);
        const sinDatos = data.totalPedidos === 0 && totalConsultas === 0;
        const aviso = document.getElementById('dashboard-vacio');
        aviso.hidden = !sinDatos;
        aviso.querySelector('h3').textContent = hayFiltroFecha(filtros)
            ? 'No hay datos para las fechas seleccionadas'
            : 'Aún no hay pedidos ni consultas registrados';
        aviso.querySelector('p').textContent = hayFiltroFecha(filtros)
            ? 'Prueba con otro rango de fechas o revisa todos los registros.'
            : 'Cuando lleguen pedidos o consultas por WhatsApp, aparecerán aquí.';
        aviso.querySelector('button').hidden = !hayFiltroFecha(filtros);
        seccion.querySelector('.grid-graficos').hidden = sinDatos;

        if (!sinDatos) {
            dibujarGraficoEstados(data.porEstado);
            dibujarGraficoConsultas(data.consultas);
        }
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        if (turno === turnoDashboard) Dialogo.toast(error.message, 'error');
    } finally {
        if (turno === turnoDashboard) seccion.classList.remove('cargando');
    }
}

// Muestra el gráfico o un mensaje si no hay datos para dibujar
function alternarVacio(idCanvas, idVacio, vacio) {
    document.getElementById(idCanvas).hidden = vacio;
    document.getElementById(idVacio).hidden = !vacio;
}

function dibujarGraficoEstados(porEstado) {
    const ctx = document.getElementById('grafico-estados');
    if (graficoEstados) { graficoEstados.destroy(); graficoEstados = null; }

    const vacio = !porEstado.some(e => e.cantidad > 0);
    alternarVacio('grafico-estados', 'vacio-estados', vacio);
    if (vacio) return;

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
    if (graficoConsultas) { graficoConsultas.destroy(); graficoConsultas = null; }

    const vacio = !consultas.some(c => c.cantidad > 0);
    alternarVacio('grafico-consultas', 'vacio-consultas', vacio);
    if (vacio) return;

    const nombres = { whatsapp: 'WhatsApp', pedido: 'Pedidos web' };
    graficoConsultas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: consultas.map(c => nombres[c.tipo] || c.tipo),
            datasets: [{
                label: 'Cantidad',
                data: consultas.map(c => c.cantidad),
                backgroundColor: ['#25d366', '#17a2b8', '#8b5a5a'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

async function exportarMetricas() {
    const filtros = filtrosDashboard.obtener();
    if (filtros.error) return Dialogo.toast(filtros.error, 'aviso');

    try {
        const res = await fetchAuth(`/api/metricas/exportar?${parametrosFecha(filtros)}`);
        const datos = await res.json();
        if (!res.ok) throw new Error(datos.mensaje || 'No se pudo exportar el reporte.');

        if (!datos.length) {
            Dialogo.toast('No hay datos para exportar en las fechas seleccionadas.', 'aviso');
            return;
        }

        await descargarExcel(datos, 'Reporte_Jorby', {
            titulo: 'Reporte de Ventas',
            nombreHoja: 'Detalle',
            filtros: { desde: filtros.desde, hasta: filtros.hasta }
        });
        Dialogo.toast('Reporte exportado correctamente.', 'exito');
    } catch (error) {
        console.error('Error al exportar:', error);
        Dialogo.toast(error.message || 'No se pudo exportar el reporte.', 'error');
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
                <td><span class="badge badge-rol">${escaparHTML(p.categoria)}</span></td>
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

async function abrirModalNuevoProducto() {
    const hay = await cargarOpcionesCategorias();
    if (!hay) return;
    document.getElementById('titulo-modal-producto').textContent = 'Nuevo Producto';
    document.getElementById('form-producto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-estado').value = 'activo';
    document.getElementById('modal-producto').classList.add('activo');
}

async function editarProducto(producto) {
    const hay = await cargarOpcionesCategorias(producto.id_categoria, producto.categoria);
    if (!hay) return;
    document.getElementById('titulo-modal-producto').textContent = 'Editar Producto';
    document.getElementById('prod-id').value = producto.id;
    document.getElementById('prod-nombre').value = producto.nombre;
    document.getElementById('prod-descripcion').value = producto.descripcion || '';
    document.getElementById('prod-precio').value = producto.precio;
    document.getElementById('prod-categoria').value = String(producto.id_categoria);
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
    if (!document.getElementById('prod-categoria').value) {
        return Dialogo.toast('Selecciona una categoría para el producto.', 'aviso');
    }
    const payload = {
        nombre: document.getElementById('prod-nombre').value,
        descripcion: document.getElementById('prod-descripcion').value,
        precio: document.getElementById('prod-precio').value,
        id_categoria: Number(document.getElementById('prod-categoria').value),
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
// Devuelve los parámetros de filtro de Pedidos, o null si las fechas no son válidas
function obtenerFiltrosPedidos() {
    const filtros = filtrosPedidos ? filtrosPedidos.obtener() : { desde: '', hasta: '' };
    if (filtros.error) return null;

    const params = parametrosFecha(filtros);
    const estado = document.getElementById('pedido-estado').value;
    if (estado) params.append('estado', estado);
    return params;
}

async function cargarPedidos() {
    const params = obtenerFiltrosPedidos();
    if (!params) return;

    const turno = ++turnoPedidos;
    const tbody = document.getElementById('tabla-pedidos');
    const seccion = document.getElementById('seccion-pedidos');
    seccion.classList.add('cargando');

    try {
        const res = await fetchAuth(`/api/pedidos?${params.toString()}`);
        const pedidos = await res.json();
        if (!res.ok) throw new Error(pedidos.mensaje || 'No se pudieron cargar los pedidos.');
        if (turno !== turnoPedidos) return;

        // Resumen del resultado: cantidad, monto y rango aplicado
        const estado = document.getElementById('pedido-estado').value;
        const total = pedidos.reduce((a, p) => a + Number(p.monto_total || 0), 0);
        document.getElementById('pedidos-rango').innerHTML =
            `<i class="fas fa-calendar-days"></i> ${pedidos.length} pedido(s)` +
            `${estado ? ` en estado <strong>${escaparHTML(estado)}</strong>` : ''}` +
            ` · Total S/ ${total.toFixed(2)} · ${escaparHTML(filtrosPedidos.describir())}`;

        if (!pedidos.length) {
            const hayFiltros = params.toString() !== '';
            tbody.innerHTML = `
                <tr><td colspan="9">
                    <div class="estado-vacio en-tabla">
                        <i class="fas fa-calendar-xmark"></i>
                        <h3>${hayFiltros ? 'No hay pedidos para los filtros seleccionados' : 'Aún no hay pedidos registrados'}</h3>
                        <p>${hayFiltros ? 'Prueba con otro rango de fechas u otro estado.' : 'Los pedidos de la web aparecerán aquí.'}</p>
                        ${hayFiltros ? '<button type="button" class="btn-secundario" data-ver-todo-pedidos>Ver todos los pedidos</button>' : ''}
                    </div>
                </td></tr>`;
            const btn = tbody.querySelector('[data-ver-todo-pedidos]');
            if (btn) btn.addEventListener('click', () => {
                document.getElementById('pedido-estado').value = '';
                filtrosPedidos.aplicarRango('todo');
            });
            return;
        }

        tbody.innerHTML = pedidos.map(p => `
            <tr>
                <td><strong>${escaparHTML(p.codigo_pedido)}</strong></td>
                <td>${escaparHTML(p.cliente_nombre)}</td>
                <td>${escaparHTML(p.cliente_telefono || '-')}</td>
                <td>${escaparHTML(p.metodo_pago)}</td>
                <td>S/ ${parseFloat(p.monto_total).toFixed(2)}</td>
                <td><span class="badge badge-${p.estado.toLowerCase()}">${p.estado}</span></td>
                <td>${new Date(p.creado_en).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>${celdaEntrega(p)}</td>
                <td>
                    <button class="btn-sm btn-ver-detalle" onclick="verDetallePedido(${p.id})" title="Ver detalle del pedido">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${p.estado === 'Pendiente' && tienePermiso('pedidos_estado') ? `
                        <button class="btn-sm btn-completar" onclick="cambiarEstadoPedido(${p.id}, 'Completado')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-sm btn-eliminar" onclick="cambiarEstadoPedido(${p.id}, 'Cancelado')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        if (turno === turnoPedidos) Dialogo.toast(error.message, 'error');
    } finally {
        if (turno === turnoPedidos) seccion.classList.remove('cargando');
    }
}

// =====================================================
// DETALLE DEL PEDIDO (HU07) - solo lectura, Admin y Contador
// =====================================================
function formatoSoles(valor) {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function fechaLargaDesdeISO(iso) {
    if (!iso) return '-';
    const [a, m, d] = iso.split('-').map(Number);
    const texto = new Date(a, m - 1, d).toLocaleDateString('es-PE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

async function verDetallePedido(id) {
    const modal = document.getElementById('modal-detalle-pedido');
    const contenido = document.getElementById('detalle-pedido-contenido');
    contenido.innerHTML = '<p class="vacio"><i class="fas fa-spinner fa-spin"></i> Cargando detalle...</p>';
    modal.classList.add('activo');

    try {
        const res = await fetchAuth(`/api/pedidos/${id}`);
        const p = await res.json();
        if (!res.ok) throw new Error(p.mensaje || 'No se pudo cargar el pedido.');

        const sumaProductos = p.detalle.reduce((a, d) => a + d.subtotal, 0);
        const cantidadTotal = p.detalle.reduce((a, d) => a + d.cantidad, 0);
        const esDelivery = p.modo_entrega !== 'Recojo en tienda';
        const fechaPedido = new Date(p.creado_en).toLocaleString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const filas = p.detalle.length
            ? p.detalle.map(d => `
                <tr>
                    <td><strong>${escaparHTML(d.producto_nombre)}</strong></td>
                    <td><span class="badge badge-rol">${escaparHTML(d.categoria || 'Sin categoría')}</span></td>
                    <td class="num">${d.cantidad}</td>
                    <td class="num">${formatoSoles(d.precio_unitario)}</td>
                    <td class="num"><strong>${formatoSoles(d.subtotal)}</strong></td>
                </tr>`).join('')
            : '<tr><td colspan="5" class="vacio">Este pedido no tiene productos registrados.</td></tr>';

        contenido.innerHTML = `
            <header class="detalle-cabecera">
                <div>
                    <span class="detalle-etiqueta">Pedido</span>
                    <h2 id="detalle-titulo">${escaparHTML(p.codigo_pedido)}</h2>
                    <small class="texto-suave">Registrado el ${fechaPedido}</small>
                </div>
                <span class="badge badge-${escaparHTML(p.estado.toLowerCase())} badge-grande">${escaparHTML(p.estado)}</span>
            </header>

            <div class="detalle-bloques">
                <section class="detalle-bloque">
                    <h4><i class="fas fa-user"></i> Cliente</h4>
                    <p><strong>${escaparHTML(p.cliente_nombre)}</strong></p>
                    <p><i class="fas fa-phone"></i> ${escaparHTML(p.cliente_telefono || '-')}</p>
                    <p><i class="fas fa-wallet"></i> Pago: ${escaparHTML(p.metodo_pago)}</p>
                </section>
                <section class="detalle-bloque">
                    <h4><i class="fas ${esDelivery ? 'fa-motorcycle' : 'fa-store'}"></i> Entrega</h4>
                    ${p.fecha_entrega ? `
                        <p><strong>${esDelivery ? 'Delivery' : 'Recojo en tienda'}</strong></p>
                        <p><i class="fas fa-calendar-day"></i> ${esDelivery ? 'Envío' : 'Recojo'}: ${fechaLargaDesdeISO(p.fecha_entrega)}</p>
                        ${esDelivery ? `
                            <p><i class="fas fa-location-dot"></i> ${escaparHTML(p.direccion_entrega || '-')}</p>
                            ${p.referencia_entrega ? `<p><i class="fas fa-compass"></i> Ref.: ${escaparHTML(p.referencia_entrega)}</p>` : ''}
                        ` : ''}
                    ` : '<p class="texto-suave">Este pedido se registró antes de que existieran los datos de entrega.</p>'}
                </section>
            </div>

            <h4 class="detalle-subtitulo"><i class="fas fa-basket-shopping"></i> Productos (${cantidadTotal} unidad${cantidadTotal === 1 ? '' : 'es'})</h4>
            <div class="tabla-container detalle-tabla">
                <table class="tabla">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th class="num">Cant.</th>
                            <th class="num">P. unitario</th>
                            <th class="num">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>

            <div class="detalle-resumen">
                <div><span>Subtotal de productos</span><span>${formatoSoles(sumaProductos)}</span></div>
                <div class="detalle-total"><span>Total a pagar</span><span>${formatoSoles(p.monto_total)}</span></div>
                ${Math.abs(sumaProductos - p.monto_total) > 0.009
                    ? '<p class="detalle-alerta"><i class="fas fa-triangle-exclamation"></i> El total registrado no coincide con la suma de los productos.</p>'
                    : ''}
            </div>`;
    } catch (error) {
        console.error('Error al ver detalle:', error);
        contenido.innerHTML = `<p class="vacio">${escaparHTML(error.message)}</p>`;
    }
}

function cerrarDetallePedido() {
    document.getElementById('modal-detalle-pedido').classList.remove('activo');
}

// Modo, fecha y dirección de entrega (HU08)
function celdaEntrega(p) {
    if (!p.fecha_entrega) return '<span class="texto-suave">-</span>';
    const [a, m, d] = p.fecha_entrega.split('-');
    const esDelivery = p.modo_entrega !== 'Recojo en tienda';
    const lugar = esDelivery
        ? `${escaparHTML(p.direccion_entrega || '')}${p.referencia_entrega ? ` <em>(${escaparHTML(p.referencia_entrega)})</em>` : ''}`
        : 'Recoge en tienda';
    return `
        <span class="badge ${esDelivery ? 'badge-delivery' : 'badge-recojo'}">
            <i class="fas ${esDelivery ? 'fa-motorcycle' : 'fa-store'}"></i> ${esDelivery ? 'Delivery' : 'Recojo'}
        </span>
        <strong class="fecha-entrega">${d}/${m}/${a}</strong>
        <small class="texto-suave">${lugar}</small>`;
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
    if (!params) return Dialogo.toast('Revisa el rango de fechas antes de exportar.', 'aviso');

    try {
        const res = await fetchAuth(`/api/pedidos?${params.toString()}`);
        const pedidos = await res.json();
        if (!res.ok) throw new Error(pedidos.mensaje || 'No se pudo exportar los pedidos.');

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
        Dialogo.toast(error.message || 'No se pudo exportar los pedidos.', 'error');
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