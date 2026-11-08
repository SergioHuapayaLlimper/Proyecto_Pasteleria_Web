// auth.js
// -----------------------------------------------------
// Login del panel administrativo (HU01 / RF-01, RF-02, RF-03).
// Guarda el token JWT en localStorage para usarlo en las
// peticiones protegidas del panel admin.
// Adaptado a bd_reposteria: el campo identificador es "email".
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    const formLogin = document.getElementById('form-login');
    const loginError = document.getElementById('login-error');
    const btnLogin = document.getElementById('btn-login');

    // Si ya hay un token guardado, redirigir al panel
    if (localStorage.getItem('token_admin')) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    // Mostrar/ocultar contraseña
    const btnVerPassword = document.getElementById('btn-ver-password');
    const inputPassword = document.getElementById('password');
    if (btnVerPassword && inputPassword) {
        btnVerPassword.addEventListener('click', () => {
            const oculto = inputPassword.type === 'password';
            inputPassword.type = oculto ? 'text' : 'password';
            btnVerPassword.innerHTML = oculto ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            btnVerPassword.setAttribute('aria-label', oculto ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });
    }

    // Año actual en el pie del panel de marca
    const anioLogin = document.getElementById('anio-login');
    if (anioLogin) anioLogin.textContent = new Date().getFullYear();

    // Mostrar mensaje de error (se reinicia la animación en cada intento)
    function mostrarError(mensaje) {
        loginError.style.display = 'none';
        void loginError.offsetWidth;
        loginError.innerHTML = '<i class="fas fa-circle-exclamation"></i>';
        loginError.appendChild(document.createTextNode(' ' + mensaje));
        loginError.style.display = 'flex';
    }

    // Ocultar mensaje de error
    function ocultarError() {
        loginError.style.display = 'none';
    }

    // Deja el botón de login en su estado original
    function restaurarBotonLogin() {
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
    }

    // Manejar envío del formulario
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        ocultarError();

        const usuario = document.getElementById('usuario').value.trim();
        const password = document.getElementById('password').value;

        // Validación de campos (RF-02)
        if (!usuario || !password) {
            mostrarError('Por favor completa todos los campos.');
            return;
        }

        try {
            btnLogin.disabled = true;
            btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            });

            const data = await res.json();

            // Si hay error, mostrar mensaje y salir
            if (!res.ok) {
                let mensaje = data.mensaje || 'Credenciales incorrectas.';

                if (data.intentosRestantes !== undefined) {
                    mensaje += ` Te quedan ${data.intentosRestantes} intentos.`;
                }

                mostrarError(mensaje);
                restaurarBotonLogin();
                return;
            }

            // Guardar token y datos del usuario
            localStorage.setItem('token_admin', data.token);
            localStorage.setItem('usuario_admin', JSON.stringify({
                nombre: data.nombre,
                rol: data.rol,
                permisos: data.permisos || []
            }));

            // Redirigir al panel
            window.location.href = 'admin-dashboard.html';

        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            mostrarError('Error de conexión. Intenta de nuevo.');
            restaurarBotonLogin();
        }
    });

});