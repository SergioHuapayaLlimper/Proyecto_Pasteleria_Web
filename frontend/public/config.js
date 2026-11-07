// config.js
// -----------------------------------------------------
// Fuente única de la configuración del negocio en la landing.
// Todos los scripts (productos, WhatsApp, carrito) la leen desde aquí,
// así lo que el admin cambie en "Configuración" se refleja en toda la página.
// RF-11 a RF-18
// -----------------------------------------------------

(function () {
    let configCache = null;

    // Devuelve la configuración (clave -> valor) desde /api/config.
    // Por defecto reutiliza la última respuesta; con { refrescar: true }
    // vuelve a consultar al servidor (útil justo antes de enviar un pedido).
    async function obtenerConfigNegocio({ refrescar = false } = {}) {
        if (configCache && !refrescar) return configCache;

        const peticion = fetch('/api/config', { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            });

        if (!refrescar) {
            configCache = peticion.catch(err => {
                configCache = null; // permite reintentar más tarde
                throw err;
            });
            return configCache;
        }

        const datos = await peticion;
        configCache = Promise.resolve(datos);
        return datos;
    }

    // Deja solo dígitos: "+51 932 614 848" -> "51932614848"
    function normalizarNumeroWhatsApp(numero) {
        return String(numero || '').replace(/\D/g, '');
    }

    window.obtenerConfigNegocio = obtenerConfigNegocio;
    window.normalizarNumeroWhatsApp = normalizarNumeroWhatsApp;
})();
