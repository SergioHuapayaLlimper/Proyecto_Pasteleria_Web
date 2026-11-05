// productos.js
// -----------------------------------------------------
// Consume la API de productos para pintar el catálogo público
// y la información del negocio (ubicación, horarios, pagos).
// RF-10, RF-11, RF-12, RF-13, RF-14, RF-15
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    const API_BASE = '/api';

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

            contenedor.innerHTML = productos.map(p => `
                <div class="card-producto">
                    <img src="${p.imagen_url || 'https://via.placeholder.com/400x200?text=Sin+imagen'}" alt="${p.nombre}">
                    <div class="info">
                        <h3>${p.nombre}</h3>
                        <p>${p.descripcion || ''}</p>
                        <p class="precio">S/ ${parseFloat(p.precio).toFixed(2)}</p>
                        <button class="btn-agregar" 
                                data-id="${p.id}" 
                                data-nombre="${p.nombre}" 
                                data-precio="${p.precio}"
                                data-imagen="${p.imagen_url || ''}">
                            <i class="fas fa-cart-plus"></i> Agregar al carrito
                        </button>
                    </div>
                </div>
            `).join('');

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
            const res = await fetch(`${API_BASE}/config`);
            const config = await res.json();

            const infoUbicacion = document.getElementById('info-ubicacion');
            if (infoUbicacion && config.direccion) {
                infoUbicacion.innerHTML = `
                    <p style="text-align:center; font-size:1.1rem; margin-bottom:15px;">
                        <i class="fas fa-map-marker-alt"></i> ${config.direccion}
                    </p>
                    <iframe 
                        src="https://www.google.com/maps?q=${config.mapa_lat},${config.mapa_lng}&output=embed"
                        loading="lazy">
                    </iframe>
                    <div style="text-align:center; margin-top:15px;">
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${config.mapa_lat},${config.mapa_lng}" 
                           target="_blank" class="btn-primary">
                            <i class="fas fa-directions"></i> Abrir en Google Maps
                        </a>
                    </div>
                `;
            }

            const infoHorarios = document.getElementById('info-horarios');
            if (infoHorarios && config.horario_atencion) {
                infoHorarios.innerHTML = `<i class="fas fa-clock"></i> ${config.horario_atencion}`;
            }

            const infoPagos = document.getElementById('info-pagos');
            if (infoPagos && config.metodos_pago) {
                infoPagos.innerHTML = `<i class="fas fa-credit-card"></i> ${config.metodos_pago}`;
            }

            const infoContacto = document.getElementById('info-contacto');
            if (infoContacto) {
                infoContacto.innerHTML = `
                    <p><i class="fas fa-phone"></i> ${config.telefono_contacto || ''}</p>
                    <p><i class="fas fa-envelope"></i> ${config.correo_contacto || ''}</p>
                `;
            }

        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    }

    cargarProductos();
    cargarConfiguracion();

});