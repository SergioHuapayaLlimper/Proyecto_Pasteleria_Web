// admin-filtros.js
// -----------------------------------------------------
// Barra de filtros por fecha reutilizable (Dashboard y Pedidos).
// - Rangos rápidos: Hoy, Últimos 7 días, Este mes, Mes anterior, Todo (RF-05)
// - Se actualiza sola al cambiar una fecha o un filtro
// - Valida que "desde" no sea posterior a "hasta"
// -----------------------------------------------------

const FiltrosFecha = (() => {
    // Fecha local en formato AAAA-MM-DD (sin desfase por UTC)
    function aISO(fecha) {
        const a = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return `${a}-${m}-${d}`;
    }

    function formatear(iso) {
        if (!iso) return '';
        const [a, m, d] = iso.split('-');
        return `${d}/${m}/${a}`;
    }

    // Devuelve { desde, hasta } para cada rango rápido
    function rangoRapido(clave, hoy = new Date()) {
        const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        switch (clave) {
            case 'hoy':
                return { desde: aISO(h), hasta: aISO(h) };
            case '7d': {
                const inicio = new Date(h);
                inicio.setDate(h.getDate() - 6);
                return { desde: aISO(inicio), hasta: aISO(h) };
            }
            case 'mes':
                return { desde: aISO(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: aISO(h) };
            case 'mes-anterior':
                return {
                    desde: aISO(new Date(h.getFullYear(), h.getMonth() - 1, 1)),
                    hasta: aISO(new Date(h.getFullYear(), h.getMonth(), 0))
                };
            default:
                return { desde: '', hasta: '' };
        }
    }

    function validar(desde, hasta) {
        if (desde && hasta && desde > hasta) {
            return 'La fecha "Desde" no puede ser posterior a la fecha "Hasta".';
        }
        return null;
    }

    function describir(desde, hasta) {
        if (desde && hasta) {
            return desde === hasta ? `del ${formatear(desde)}` : `del ${formatear(desde)} al ${formatear(hasta)}`;
        }
        if (desde) return `desde el ${formatear(desde)}`;
        if (hasta) return `hasta el ${formatear(hasta)}`;
        return 'de todas las fechas';
    }

    // Conecta una barra de filtros (contenedor [data-filtros="prefijo"])
    function configurar({ prefijo, idDesde, idHasta, idsExtra = [], alCambiar }) {
        const contenedor = document.querySelector(`[data-filtros="${prefijo}"]`);
        const inputDesde = document.getElementById(idDesde);
        const inputHasta = document.getElementById(idHasta);
        const cajaError = document.getElementById(`${prefijo}-filtro-error`);
        const chips = [...contenedor.querySelectorAll('.chip-rango')];
        let temporizador = null;

        function marcarChip() {
            chips.forEach(chip => {
                const r = rangoRapido(chip.dataset.rango);
                chip.classList.toggle('activo', r.desde === inputDesde.value && r.hasta === inputHasta.value);
            });
        }

        function sincronizarLimites() {
            inputHasta.min = inputDesde.value || '';
            inputDesde.max = inputHasta.value || '';
        }

        function obtener() {
            const desde = inputDesde.value;
            const hasta = inputHasta.value;
            const error = validar(desde, hasta);
            cajaError.textContent = error || '';
            cajaError.hidden = !error;
            inputDesde.classList.toggle('invalido', Boolean(error));
            inputHasta.classList.toggle('invalido', Boolean(error));
            return { desde, hasta, error };
        }

        function disparar(inmediato = false) {
            clearTimeout(temporizador);
            if (inmediato) return alCambiar();
            temporizador = setTimeout(alCambiar, 250); // evita consultas al escribir la fecha a mano
        }

        function aplicarRango(clave) {
            const r = rangoRapido(clave);
            inputDesde.value = r.desde;
            inputHasta.value = r.hasta;
            sincronizarLimites();
            marcarChip();
            disparar(true);
        }

        chips.forEach(chip => chip.addEventListener('click', () => aplicarRango(chip.dataset.rango)));
        [inputDesde, inputHasta].forEach(input => input.addEventListener('change', () => {
            sincronizarLimites();
            marcarChip();
            disparar();
        }));
        idsExtra.forEach(id => document.getElementById(id).addEventListener('change', () => disparar(true)));
        document.querySelectorAll(`[data-ver-todo="${prefijo}"]`).forEach(btn =>
            btn.addEventListener('click', () => aplicarRango('todo')));

        marcarChip();
        return { obtener, describir: () => describir(inputDesde.value, inputHasta.value), aplicarRango };
    }

    return { configurar, rangoRapido, validar, describir, formatear, aISO };
})();
