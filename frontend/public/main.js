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

    // ---- HEADER CON SOMBRA AL HACER SCROLL ----
    const header = document.getElementById('header');
    const actualizarHeader = () => header && header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', actualizarHeader, { passive: true });
    actualizarHeader();

    // ---- MENÚ MÓVIL ----
    const btnMenu = document.getElementById('btn-menu');
    const nav = document.getElementById('nav');
    if (btnMenu && nav) {
        btnMenu.addEventListener('click', () => {
            const abierto = nav.classList.toggle('abierto');
            btnMenu.setAttribute('aria-expanded', abierto);
            btnMenu.innerHTML = abierto ? '<i class="fas fa-xmark"></i>' : '<i class="fas fa-bars"></i>';
        });
        nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            nav.classList.remove('abierto');
            btnMenu.setAttribute('aria-expanded', 'false');
            btnMenu.innerHTML = '<i class="fas fa-bars"></i>';
        }));
    }

    // ---- RESALTAR SECCIÓN ACTIVA EN EL MENÚ ----
    const enlacesNav = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
    if ('IntersectionObserver' in window && enlacesNav.length) {
        const observadorNav = new IntersectionObserver(entradas => {
            entradas.forEach(entrada => {
                if (!entrada.isIntersecting) return;
                enlacesNav.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + entrada.target.id));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        enlacesNav.forEach(a => {
            const seccion = document.querySelector(a.getAttribute('href'));
            if (seccion) observadorNav.observe(seccion);
        });
    }

    // ---- ANIMACIÓN DE APARICIÓN (se aplica también a contenido dinámico) ----
    window.revelarElementos = (selector) => {
        const elementos = document.querySelectorAll(selector);
        if (!('IntersectionObserver' in window)) {
            elementos.forEach(el => el.classList.add('visible'));
            return;
        }
        const observador = new IntersectionObserver((entradas, obs) => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) {
                    entrada.target.classList.add('visible');
                    obs.unobserve(entrada.target);
                }
            });
        }, { threshold: 0.12 });
        elementos.forEach((el, i) => {
            el.classList.add('revelar');
            el.style.transitionDelay = `${(i % 4) * 70}ms`;
            observador.observe(el);
        });
    };
    revelarElementos('.seccion-cabecera, .info-ubicacion, .info-card, .cta');

    // ---- AÑO ACTUAL EN EL FOOTER ----
    const anio = document.getElementById('anio-actual');
    if (anio) anio.textContent = new Date().getFullYear();

    // ---- CERRAR MODALES CON LA TECLA ESC ----
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        modalAcceso.style.display = 'none';
        const modalCarrito = document.getElementById('modal-carrito');
        if (modalCarrito) modalCarrito.classList.remove('activo');
    });

});
