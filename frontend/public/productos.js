// productos.js
// -----------------------------------------------------
// Consume la API de productos para pintar el catálogo público
// y la información del negocio (ubicación, horarios, pagos).
// RF-10, RF-11, RF-12, RF-13, RF-14, RF-15
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    const API_BASE = '/api';

    // Evita inyectar HTML desde los datos de la BD (protección básica contra XSS)
    function escaparHTML(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ---- 1. CARGAR PRODUCTOS (RF-10) ----
    async function cargarProductos() {
        const contenedor = document.getElementById('catalogo-productos');
        if (!contenedor) return;

        try {
            const res = await fetch(`${API_BASE}/productos`);
            const productos = await res.json();

            if (!productos.length) {
                contenedor.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
                return;
            }

            const IMG_DEFECTO = 'https://via.placeholder.com/400x300?text=Sin+imagen';

            contenedor.innerHTML = productos.map(p => {
                const nombre = escaparHTML(p.nombre);
                const precio = parseFloat(p.precio).toFixed(2);
                const imagen = escaparHTML(p.imagen_url || IMG_DEFECTO);
                return `
                <div class="card-producto">
                    <div class="media">
                        <img src="${imagen}" alt="${nombre}" loading="lazy">
                    </div>
                    <div class="info">
                        <h3>${nombre}</h3>
                        <p class="descripcion">${escaparHTML(p.descripcion || '')}</p>
                        <p class="precio"><small>S/</small> ${precio}</p>
                        <button class="btn-agregar" 
                                data-id="${escaparHTML(p.id)}" 
                                data-nombre="${nombre}" 
                                data-precio="${escaparHTML(p.precio)}"
                                data-imagen="${escaparHTML(p.imagen_url || '')}">
                            <i class="fas fa-cart-plus"></i> Agregar al carrito
                        </button>
                    </div>
                </div>`;
            }).join('');

            if (typeof window.revelarElementos === 'function') {
                window.revelarElementos('#catalogo-productos .card-producto');
            }

            contenedor.querySelectorAll('.btn-agregar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const producto = {
                        id: btn.dataset.id,
                        nombre: btn.dataset.nombre,
                        precio: parseFloat(btn.dataset.precio),
                        imagen_url: btn.dataset.imagen,
                        cantidad: 1
                    };
                    if (typeof agregarAlCarrito === 'function') {
                        agregarAlCarrito(producto);
                    }
                    // Feedback visual breve en el botón
                    const original = btn.innerHTML;
                    btn.classList.add('agregado');
                    btn.innerHTML = '<i class="fas fa-check"></i> Agregado';
                    setTimeout(() => {
                        btn.classList.remove('agregado');
                        btn.innerHTML = original;
                    }, 1200);
                });
            });

        } catch (error) {
            console.error('Error al cargar productos:', error);
            contenedor.innerHTML = '<p>Error al cargar productos. Intenta más tarde.</p>';
        }
    }

    // ---- 2. CARGAR CONFIGURACIÓN DEL NEGOCIO ----
    async function cargarConfiguracion() {
        try {
            const config = await obtenerConfigNegocio();

            const infoUbicacion = document.getElementById('info-ubicacion');
            if (infoUbicacion && config.direccion) {
                const lat = encodeURIComponent(config.mapa_lat || '');
                const lng = encodeURIComponent(config.mapa_lng || '');
                infoUbicacion.innerHTML = `
                    <iframe 
                        src="https://www.google.com/maps?q=${lat},${lng}&output=embed"
                        title="Mapa de ubicación de la pastelería"
                        loading="lazy">
                    </iframe>
                    <div class="ubicacion-pie">
                        <p class="ubicacion-direccion">
                            <i class="fas fa-map-marker-alt"></i> ${escaparHTML(config.direccion)}
                        </p>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" 
                           target="_blank" rel="noopener" class="btn-mapa">
                            <i class="fas fa-directions"></i> Abrir en Google Maps
                        </a>
                    </div>
                `;
            }

            const infoHorarios = document.getElementById('info-horarios');
            if (infoHorarios && config.horario_atencion) {
                infoHorarios.textContent = config.horario_atencion;
            }

            const infoPagos = document.getElementById('info-pagos');
            if (infoPagos && config.metodos_pago) {
                infoPagos.textContent = config.metodos_pago;
            }

            const infoContacto = document.getElementById('info-contacto');
            if (infoContacto && (config.telefono_contacto || config.correo_contacto)) {
                const tel = escaparHTML(config.telefono_contacto || '');
                const correo = escaparHTML(config.correo_contacto || '');
                infoContacto.innerHTML = `
                    <p><i class="fas fa-phone"></i> <a href="tel:${tel.replace(/\s/g, '')}">${tel}</a></p>
                    <p><i class="fas fa-envelope"></i> <a href="mailto:${correo}">${correo}</a></p>
                `;
            }

            marcarSinDatos();

        } catch (error) {
            console.error('Error al cargar configuración:', error);
            marcarSinDatos();
        }
    }

    // Si la API no devolvió algún dato, evita que quede "Cargando..." para siempre
    function marcarSinDatos() {
        ['info-horarios', 'info-pagos'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.textContent.trim() === 'Cargando...') {
                el.textContent = 'Información no disponible por el momento.';
            }
        });
    }

    cargarProductos();
    cargarConfiguracion();

});