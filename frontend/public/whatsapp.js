// whatsapp.js
// -----------------------------------------------------
// Configura el botón flotante de WhatsApp para que abra
// el chat con el número oficial y un mensaje predeterminado.
// RF-16, RF-17, RF-18
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    // ---- CONFIGURACIÓN ----
    // ⚠️ IMPORTANTE: Reemplaza este número por el real de la pastelería.
    // Formato: código de país + número, SIN el signo "+", SIN espacios ni guiones.
    // Ejemplo Perú: 51987654321
    const NUMERO_WHATSAPP = '51922794192';

    // Mensaje predeterminado que aparecerá al abrir el chat (RF-18)
    const MENSAJE_PREDETERMINADO = 'Hola, quisiera información sobre sus productos';

    // ---- REFERENCIA AL BOTÓN ----
    const btnWhatsapp = document.getElementById('btn-whatsapp');

    if (!btnWhatsapp) return; // Seguridad por si el botón no existe

    // ---- CONSTRUIR LA URL ----
    // Codificamos el mensaje para que funcione en la URL (reemplaza espacios por %20, etc.)
    const mensajeCodificado = encodeURIComponent(MENSAJE_PREDETERMINADO);
    const urlWhatsapp = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeCodificado}`;

    // ---- ASIGNAR EL ENLACE ----
    btnWhatsapp.setAttribute('href', urlWhatsapp);

    // ---- TRACKING (opcional para métricas - HU02) ----
    // Cuando el usuario haga clic, registramos la consulta en el backend.
    btnWhatsapp.addEventListener('click', () => {
        // Enviamos un "ping" al backend para registrar la consulta
        // (esto alimentará las métricas del panel admin - RF-04)
        fetch('/api/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'whatsapp' })
        }).catch(() => {
            // Si falla, no pasa nada. No queremos interrumpir al usuario.
            console.log('No se pudo registrar la consulta de WhatsApp');
        });
    });

});