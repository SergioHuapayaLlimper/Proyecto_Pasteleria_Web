// main.js
// -----------------------------------------------------
// Lógica del botón "Acceso" con modal Cliente/Administrador
// y navegación suave entre secciones.
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    // ---- REFERENCIAS A ELEMENTOS ----
    const btnAcceso = document.getElementById('btn-acceso');
    const modalAcceso = document.getElementById('modal-acceso');
    const btnCerrarModal = modalAcceso.querySelector('.close');
    const btnCliente = document.getElementById('btn-cliente');
    const btnAdmin = document.getElementById('btn-admin');

    // ---- ABRIR MODAL ----
    btnAcceso.addEventListener('click', () => {
        modalAcceso.style.display = 'flex';
    });

    // ---- CERRAR MODAL (con la X) ----
    btnCerrarModal.addEventListener('click', () => {
        modalAcceso.style.display = 'none';
    });

    // ---- CERRAR MODAL (al hacer clic fuera) ----
    window.addEventListener('click', (e) => {
        if (e.target === modalAcceso) {
            modalAcceso.style.display = 'none';
        }
    });

    // ---- OPCIÓN CLIENTE ----
    // Cierra el modal y se queda en el index
    btnCliente.addEventListener('click', () => {
        modalAcceso.style.display = 'none';
        // Opcional: podrías redirigir a una sección específica
        // window.location.href = '#productos';
    });

    // ---- OPCIÓN ADMINISTRADOR ----
    // Redirige al login del admin
    btnAdmin.addEventListener('click', () => {
        window.location.href = 'admin-login.html';
    });

    // ---- NAVEGACIÓN SUAVE (smooth scroll) ----
    document.querySelectorAll('a[href^="#"]').forEach(enlace => {
        enlace.addEventListener('click', function (e) {
            const destino = this.getAttribute('href');
            if (destino !== '#' && document.querySelector(destino)) {
                e.preventDefault();
                document.querySelector(destino).scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

});