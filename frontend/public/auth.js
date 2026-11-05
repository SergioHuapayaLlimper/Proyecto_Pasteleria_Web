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

    // Mostrar mensaje de error
    function mostrarError(mensaje) {
        loginError.textContent = mensaje;
        loginError.style.display = 'block';
    }

    // Ocultar mensaje de error
    function ocultarError() {
        loginError.style.display = 'none';
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
                btnLogin.disabled = false;
                btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                return;
            }

            // Verificar que el rol sea Administrador
            if (data.rol !== 'Administrador') {
                mostrarError('Solo los administradores pueden acceder al panel.');
                btnLogin.disabled = false;
                btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                return;
            }

            // Guardar token y datos del usuario
            localStorage.setItem('token_admin', data.token);
            localStorage.setItem('usuario_admin', JSON.stringify({
                nombre: data.nombre,
                rol: data.rol
            }));

            // Redirigir al panel
            window.location.href = 'admin-dashboard.html';

        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            mostrarError('Error de conexión. Intenta de nuevo.');
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
        }
    });

});