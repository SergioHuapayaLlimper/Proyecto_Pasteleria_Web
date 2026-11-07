// dialogos.js
// -----------------------------------------------------
// Reemplazo visual de alert() y confirm() del navegador.
//   await Dialogo.confirmar({ titulo, mensaje, textoConfirmar, tipo }) -> true/false
//   await Dialogo.alerta({ titulo, mensaje, tipo })
//   Dialogo.toast('Texto', 'exito' | 'error' | 'aviso' | 'info')
// Requiere dialogos.css y Font Awesome.
// -----------------------------------------------------

(function () {
    const ICONOS = {
        info: 'fa-circle-info',
        exito: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        aviso: 'fa-triangle-exclamation',
        peligro: 'fa-triangle-exclamation',
        pregunta: 'fa-circle-question'
    };

    function crear(etiqueta, clase, texto) {
        const el = document.createElement(etiqueta);
        if (clase) el.className = clase;
        if (texto !== undefined) el.textContent = texto; // textContent evita inyectar HTML
        return el;
    }

    // Construye el modal y devuelve una promesa con el botón elegido
    function abrirDialogo({ titulo, mensaje = '', tipo = 'info', icono, botones }) {
        return new Promise(resolve => {
            const anterior = document.activeElement;
            const overlay = crear('div', 'dlg-overlay');
            const caja = crear('div', `dlg-caja ${tipo}`);
            caja.setAttribute('role', 'alertdialog');
            caja.setAttribute('aria-modal', 'true');

            const circulo = crear('div', 'dlg-icono');
            const i = crear('i', `fas ${icono || ICONOS[tipo] || ICONOS.info}`);
            circulo.appendChild(i);

            const h = crear('h3', 'dlg-titulo', titulo);
            h.id = 'dlg-titulo-' + Date.now();
            caja.setAttribute('aria-labelledby', h.id);

            const p = crear('p', 'dlg-mensaje', mensaje);
            const fila = crear('div', 'dlg-botones');

            function cerrar(valor) {
                document.removeEventListener('keydown', teclado);
                overlay.classList.add('saliendo');
                setTimeout(() => overlay.remove(), 180);
                if (anterior && anterior.focus) anterior.focus();
                resolve(valor);
            }

            botones.forEach(b => {
                const btn = crear('button', `dlg-btn ${b.primario ? 'dlg-btn-primario' : 'dlg-btn-secundario'}`, b.texto);
                btn.type = 'button';
                btn.addEventListener('click', () => cerrar(b.valor));
                fila.appendChild(btn);
            });

            function teclado(e) {
                if (e.key === 'Escape') cerrar(botones.find(b => !b.primario)?.valor ?? false);
            }
            document.addEventListener('keydown', teclado);
            overlay.addEventListener('click', e => {
                if (e.target === overlay) cerrar(botones.find(b => !b.primario)?.valor ?? false);
            });

            caja.append(circulo, h, p, fila);
            overlay.appendChild(caja);
            document.body.appendChild(overlay);
            fila.querySelector('.dlg-btn-primario')?.focus();
        });
    }

    function confirmar({ titulo = '¿Estás seguro?', mensaje = '', textoConfirmar = 'Aceptar',
                         textoCancelar = 'Cancelar', tipo = 'pregunta', icono } = {}) {
        return abrirDialogo({
            titulo, mensaje, tipo, icono,
            botones: [
                { texto: textoCancelar, valor: false },
                { texto: textoConfirmar, valor: true, primario: true }
            ]
        });
    }

    function alerta({ titulo = 'Aviso', mensaje = '', tipo = 'info', textoBoton = 'Entendido', icono } = {}) {
        return abrirDialogo({
            titulo, mensaje, tipo, icono,
            botones: [{ texto: textoBoton, valor: true, primario: true }]
        });
    }

    function toast(mensaje, tipo = 'info', duracion = 3500) {
        let contenedor = document.querySelector('.dlg-toasts');
        if (!contenedor) {
            contenedor = crear('div', 'dlg-toasts');
            contenedor.setAttribute('aria-live', 'polite');
            document.body.appendChild(contenedor);
        }
        const t = crear('div', `dlg-toast ${tipo}`);
        t.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
        const btnCerrar = crear('button', 'dlg-toast-cerrar', '×');
        btnCerrar.setAttribute('aria-label', 'Cerrar notificación');
        t.append(crear('i', `fas ${ICONOS[tipo] || ICONOS.info}`), crear('span', 'dlg-toast-texto', mensaje), btnCerrar);
        contenedor.appendChild(t);

        const quitar = () => {
            t.classList.add('saliendo');
            setTimeout(() => t.remove(), 250);
        };
        btnCerrar.addEventListener('click', quitar);
        setTimeout(quitar, duracion);
    }

    window.Dialogo = { confirmar, alerta, toast };
})();
