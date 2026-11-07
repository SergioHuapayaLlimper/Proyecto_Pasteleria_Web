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

const usuarioAdmin = JSON.parse(localStorage.getItem('usuario_admin') || '{}');

// Helper para peticiones autenticadas
async function fetchAuth(url, opciones = {}) {
    return fetch(url, {
        ...opciones,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(opciones.headers || {})
        }
    });
}

// ---- REFERENCIAS GLOBALES ----
let graficoEstados = null;
let graficoConsultas = null;

// ---- INICIALIZAR ----
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar nombre del usuario
    document.getElementById('nombre-usuario').textContent = usuarioAdmin.nombre || 'Administrador';

    // Navegación entre secciones
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const seccion = btn.dataset.seccion;
            cambiarSeccion(seccion);
        });
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('token_admin');
            localStorage.removeItem('usuario_admin');
            window.location.href = 'admin-login.html';
        }
    });

    // Cargar dashboard por defecto
    cargarDashboard();
    cargarConfiguracion();

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
    configuracion: cargarConfiguracion
};

function cambiarSeccion(seccion) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('activo'));
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));

    document.querySelector(`.nav-item[data-seccion="${seccion}"]`).classList.add('activo');
    document.getElementById(`seccion-${seccion}`).classList.add('activa');

    const cargarSeccion = CARGADORES_SECCION[seccion];
    if (cargarSeccion) cargarSeccion();
}

// Genera y descarga un Excel (hoja "Pedidos") con los datos recibidos.
function descargarExcel(datos, prefijoArchivo) {
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `${prefijoArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

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
            alert('No hay datos para exportar.');
            return;
        }

        descargarExcel(datos, 'Reporte_Jorby');
    } catch (error) {
        console.error('Error al exportar:', error);
        alert('Error al exportar');
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

        if (!res.ok) throw new Error('Error al guardar');

        cerrarModalProducto();
        cargarProductos();
        alert('Producto guardado correctamente');

    } catch (error) {
        console.error('Error al guardar producto:', error);
        alert('Error al guardar producto');
    }
}

async function desactivarProducto(id) {
    if (!confirm('¿Desactivar este producto? Ya no aparecerá en el catálogo.')) return;

    try {
        await fetchAuth(`/api/productos/${id}`, { method: 'DELETE' });
        cargarProductos();
    } catch (error) {
        console.error('Error al desactivar:', error);
        alert('Error al desactivar');
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
                    ${p.estado === 'Pendiente' ? `
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
    if (!confirm(`¿Marcar pedido como ${nuevoEstado}?`)) return;

    try {
        await fetchAuth(`/api/pedidos/${id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: nuevoEstado })
        });
        cargarPedidos();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar estado');
    }
}

async function exportarPedidos() {
    const params = obtenerFiltrosPedidos();

    try {
        const res = await fetchAuth(`/api/pedidos?${params.toString()}`);
        const pedidos = await res.json();

        if (!pedidos.length) {
            alert('No hay pedidos para exportar.');
            return;
        }

        descargarExcel(pedidos, 'Pedidos_Jorby');
    } catch (error) {
        console.error('Error al exportar:', error);
        alert('Error al exportar');
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
        const res = await fetch('/api/config');
        const config = await res.json();

        Object.entries(CAMPOS_CONFIG).forEach(([clave, idCampo]) => {
            document.getElementById(idCampo).value = config[clave] || '';
        });
    } catch (error) {
        console.error('Error al cargar configuración:', error);
    }
}

async function guardarConfiguracion(e) {
    e.preventDefault();

    const payload = Object.fromEntries(
        Object.entries(CAMPOS_CONFIG).map(([clave, idCampo]) => [
            clave,
            document.getElementById(idCampo).value
        ])
    );

    try {
        const res = await fetchAuth('/api/config', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Error al guardar');

        alert('Configuración guardada correctamente');
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        alert('Error al guardar la configuración');
    }
}