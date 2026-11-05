// cart.js
// -----------------------------------------------------
// Carrito de compras completo con checkout.
// HU08 / RF-22, RF-23, RF-24, RF-25
// -----------------------------------------------------

// ---- ESTADO GLOBAL DEL CARRITO ----
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// ---- REFERENCIAS ----
const modalCarrito = document.getElementById('modal-carrito');
const btnCarrito = document.getElementById('btn-carrito');
const btnCerrarCarrito = document.getElementById('carrito-cerrar');
const listaCarrito = document.getElementById('lista-carrito');
const totalCarrito = document.getElementById('total-carrito');
const contadorCarrito = document.getElementById('contador-carrito');
const formCheckout = document.getElementById('form-checkout');
const errorCheckout = document.getElementById('error-checkout');

// ---- AGREGAR PRODUCTO AL CARRITO ----
function agregarAlCarrito(producto) {
    const existente = carrito.find(p => p.id === producto.id);

    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    guardarCarrito();
    renderizarCarrito();
    abrirCarrito();
}

// ---- GUARDAR EN LOCALSTORAGE ----
function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

// ---- ABRIR MODAL ----
function abrirCarrito() {
    modalCarrito.classList.add('activo');
    renderizarCarrito();
}

// ---- CERRAR MODAL ----
function cerrarCarrito() {
    modalCarrito.classList.remove('activo');
}

// ---- RENDERIZAR CARRITO (RF-23) ----
function renderizarCarrito() {
    // Actualizar contador flotante
    const totalItems = carrito.reduce((sum, p) => sum + p.cantidad, 0);
    contadorCarrito.textContent = totalItems;

    if (carrito.length === 0) {
        listaCarrito.innerHTML = `
            <div class="carrito-vacio">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
                <p>¡Agrega algunos productos deliciosos!</p>
            </div>
        `;
        totalCarrito.textContent = 'Total: S/ 0.00';
        formCheckout.style.display = 'none';
        return;
    }

    listaCarrito.innerHTML = carrito.map(p => `
        <div class="item-carrito">
            <img src="${p.imagen_url || 'https://via.placeholder.com/60'}" alt="${p.nombre}">
            <div class="info-item">
                <h4>${p.nombre}</h4>
                <p class="precio-item">S/ ${parseFloat(p.precio).toFixed(2)} c/u</p>
            </div>
            <div class="controles-cantidad">
                <button onclick="cambiarCantidad('${p.id}', -1)">−</button>
                <span>${p.cantidad}</span>
                <button onclick="cambiarCantidad('${p.id}', 1)">+</button>
            </div>
            <button class="btn-eliminar-item" onclick="eliminarDelCarrito('${p.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    // Calcular total (RF-23)
    const total = carrito.reduce((sum, p) => sum + (parseFloat(p.precio) * p.cantidad), 0);
    totalCarrito.textContent = `Total: S/ ${total.toFixed(2)}`;

    formCheckout.style.display = 'block';
}

// ---- CAMBIAR CANTIDAD ----
function cambiarCantidad(id, delta) {
    const item = carrito.find(p => p.id === id);
    if (!item) return;

    item.cantidad += delta;

    if (item.cantidad <= 0) {
        eliminarDelCarrito(id);
        return;
    }

    guardarCarrito();
    renderizarCarrito();
}

// ---- ELIMINAR ITEM ----
function eliminarDelCarrito(id) {
    carrito = carrito.filter(p => p.id !== id);
    guardarCarrito();
    renderizarCarrito();
}

// ---- VALIDAR TELÉFONO (RF-25) ----
function validarTelefono(telefono) {
    const limpio = telefono.replace(/\D/g, '');
    return limpio.length >= 9;
}

// ---- ENVIAR PEDIDO ----
async function enviarPedido(e) {
    e.preventDefault();

    const nombre = document.getElementById('cliente-nombre').value.trim();
    const telefono = document.getElementById('cliente-telefono').value.trim();
    const metodoPago = document.getElementById('metodo-pago').value;

    errorCheckout.style.display = 'none';

    // Validaciones (RF-25)
    if (!nombre || !telefono || !metodoPago) {
        errorCheckout.textContent = 'Todos los campos son obligatorios.';
        errorCheckout.style.display = 'block';
        return;
    }

    if (!validarTelefono(telefono)) {
        errorCheckout.textContent = 'El teléfono debe tener al menos 9 dígitos.';
        errorCheckout.style.display = 'block';
        return;
    }

    // Armar payload
    const payload = {
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        metodo_pago: metodoPago,
        productos: carrito.map(p => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            cantidad: p.cantidad
        }))
    };

    try {
        document.getElementById('btn-confirmar').disabled = true;
        document.getElementById('btn-confirmar').textContent = 'Enviando...';

        const res = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.mensaje || 'Error al enviar el pedido');
        }

        // Éxito
        listaCarrito.innerHTML = `
            <div class="mensaje-exito">
                <i class="fas fa-check-circle"></i>
                <h3>¡Pedido registrado con éxito!</h3>
                <p>Código: <strong>${data.codigo_pedido}</strong></p>
                <p>Total: S/ ${parseFloat(data.monto_total).toFixed(2)}</p>
                <p>Te redirigiremos a WhatsApp para confirmar tu pedido...</p>
            </div>
        `;
        totalCarrito.textContent = '';
        formCheckout.style.display = 'none';

        // Limpiar carrito
        carrito = [];
        guardarCarrito();
        contadorCarrito.textContent = '0';

        // === ENVIAR A WHATSAPP (HU08 - mejora) ===
        // Esperar 2 segundos antes de abrir WhatsApp para que el usuario vea el mensaje
        setTimeout(() => {
            enviarPedidoAWhatsApp(data.codigo_pedido, {
                nombre,
                telefono,
                metodoPago,
                productos: payload.productos,
                total: data.monto_total
            });
        }, 2000);

    } catch (error) {
        console.error('Error al enviar pedido:', error);
        errorCheckout.textContent = error.message || 'Error al enviar el pedido. Intenta de nuevo.';
        errorCheckout.style.display = 'block';
        document.getElementById('btn-confirmar').disabled = false;
        document.getElementById('btn-confirmar').textContent = 'Confirmar Pedido';
    }
}
// ---- ENVIAR PEDIDO A WHATSAPP (HU08) ----
// Abre WhatsApp Web con el detalle del pedido pre-escrito
async function enviarPedidoAWhatsApp(codigoPedido, pedido) {
    try {
        // Obtener el número de WhatsApp del negocio desde la configuración
        const res = await fetch('/api/config');
        const config = await res.json();
        
        const numeroNegocio = config.whatsapp_numero || '51999999999';
        
        // Construir el mensaje
        let mensaje = `🍰 *NUEVO PEDIDO - Corporación Jorby*\n\n`;
        mensaje += `📋 *Código:* ${codigoPedido}\n`;
        mensaje += `👤 *Cliente:* ${pedido.nombre}\n`;
        mensaje += `📞 *Teléfono:* ${pedido.telefono}\n`;
        mensaje += `💳 *Método de pago:* ${pedido.metodoPago}\n\n`;
        mensaje += `🛒 *Productos:*\n`;
        
        pedido.productos.forEach(p => {
            const subtotal = (parseFloat(p.precio) * p.cantidad).toFixed(2);
            mensaje += `• ${p.cantidad}x ${p.nombre} — S/ ${subtotal}\n`;
        });
        
        mensaje += `\n💰 *TOTAL:* S/ ${parseFloat(pedido.total).toFixed(2)}\n\n`;
        mensaje += `_Pedido realizado desde la página web._`;
        
        // Codificar el mensaje para la URL
        const mensajeCodificado = encodeURIComponent(mensaje);
        
        // URL de WhatsApp
        const urlWhatsApp = `https://wa.me/${numeroNegocio}?text=${mensajeCodificado}`;
        
        // Abrir WhatsApp en nueva pestaña
        window.open(urlWhatsApp, '_blank');
        
    } catch (error) {
        console.error('Error al abrir WhatsApp:', error);
        // Si falla, al menos mostramos un aviso
        alert('Pedido registrado. Puedes escribirnos por WhatsApp para confirmar.');
    }
}

// ---- EVENTOS ----
document.addEventListener('DOMContentLoaded', () => {
    // Abrir carrito al hacer clic en el botón flotante
    btnCarrito.addEventListener('click', abrirCarrito);

    // Cerrar carrito
    btnCerrarCarrito.addEventListener('click', cerrarCarrito);

    // Cerrar al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalCarrito) cerrarCarrito();
    });

    // Enviar pedido
    formCheckout.addEventListener('submit', enviarPedido);

    // Renderizar al cargar (por si había items guardados)
    renderizarCarrito();

    
});