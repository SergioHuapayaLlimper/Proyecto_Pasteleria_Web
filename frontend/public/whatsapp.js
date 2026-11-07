// whatsapp.js
// -----------------------------------------------------
// Configura los enlaces de WhatsApp (botón flotante, hero, CTA, footer)
// con el número y mensaje definidos por el admin en "Configuración".
// RF-16, RF-17, RF-18
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {

    // Valores de respaldo por si la API no responde
    const NUMERO_POR_DEFECTO = '51922794192';
    const MENSAJE_POR_DEFECTO = 'Hola, quisiera información sobre sus productos';

    const btnWhatsapp = document.getElementById('btn-whatsapp');
    const enlaces = [btnWhatsapp, ...document.querySelectorAll('.js-whatsapp')].filter(Boolean);
    if (!enlaces.length) return;

    function construirUrl(numero, mensaje) {
        return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    }

    function asignarUrl(url) {
        enlaces.forEach(enlace => enlace.setAttribute('href', url));
    }

    // 1) Enlace de respaldo inmediato (por si el usuario hace clic antes de que cargue la API)
    asignarUrl(construirUrl(NUMERO_POR_DEFECTO, MENSAJE_POR_DEFECTO));

    // 2) Enlace real con los datos de la configuración del negocio
    try {
        const config = await obtenerConfigNegocio();
        const numero = normalizarNumeroWhatsApp(config.whatsapp_numero) || NUMERO_POR_DEFECTO;
        const mensaje = config.whatsapp_mensaje || MENSAJE_POR_DEFECTO;
        asignarUrl(construirUrl(numero, mensaje));
    } catch (error) {
        console.warn('No se pudo cargar la configuración de WhatsApp, se usa el número por defecto.', error);
    }

    // ---- TRACKING para métricas (HU02 / RF-04) ----
    enlaces.forEach(enlace => enlace.addEventListener('click', () => {
        fetch('/api/pedidos/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'whatsapp' })
        }).catch(() => console.log('No se pudo registrar la consulta de WhatsApp'));
    }));

});
