// exportarExcel.js
// -----------------------------------------------------
// Genera reportes Excel con formato profesional usando ExcelJS:
// encabezado con marca, tabla con filtros, formatos de moneda y fecha,
// colores por estado, fila de totales y hoja de resumen con fórmulas.
// RF-06 / HU07
// -----------------------------------------------------

(function () {
    const MARCA = {
        oscuro: 'FF3D2B2B',
        secundario: 'FF8B5A5A',
        primario: 'FFD4A5A5',
        crema: 'FFFFF9F5',
        rosaSuave: 'FFF3DCD6',
        borde: 'FFEADBD3',
        blanco: 'FFFFFFFF',
        textoSuave: 'FF7A6461'
    };

    const ESTADOS = {
        Pendiente:  { fondo: 'FFFFF4D6', texto: 'FF8A6100' },
        Completado: { fondo: 'FFE3F4EA', texto: 'FF1E7A46' },
        Cancelado:  { fondo: 'FFFDE4E1', texto: 'FFB3261E' }
    };

    // Columnas posibles (en el orden en que se muestran). "id" se omite a propósito.
    const COLUMNAS = [
        { claves: ['codigo_pedido'], titulo: 'Código', ancho: 22 },
        { claves: ['creado_en'], titulo: 'Fecha y hora', ancho: 19, tipo: 'fecha' },
        { claves: ['cliente', 'cliente_nombre'], titulo: 'Cliente', ancho: 28 },
        { claves: ['cliente_telefono'], titulo: 'Teléfono', ancho: 14 },
        { claves: ['metodo_pago'], titulo: 'Método de pago', ancho: 16 },
        { claves: ['estado'], titulo: 'Estado', ancho: 14, tipo: 'estado' },
        { claves: ['modo_entrega'], titulo: 'Modo de entrega', ancho: 17 },
        { claves: ['fecha_entrega'], titulo: 'Fecha de entrega', ancho: 15, tipo: 'fechaSolo' },
        { claves: ['direccion_entrega'], titulo: 'Dirección de entrega', ancho: 34 },
        { claves: ['monto_total'], titulo: 'Monto', ancho: 14, tipo: 'moneda' }
    ];

    const FORMATO_MONEDA = '"S/" #,##0.00';
    const FORMATO_FECHA = 'dd/mm/yyyy hh:mm';
    const FORMATO_FECHA_SOLO = 'dd/mm/yyyy';

    // "AAAA-MM-DD" -> fecha de Excel (sin desfase de zona horaria)
    function aFechaSolo(texto) {
        if (!texto) return null;
        const [a, m, d] = String(texto).slice(0, 10).split('-').map(Number);
        return new Date(Date.UTC(a, m - 1, d));
    }

    const borde = (color = MARCA.borde) => ({
        top: { style: 'thin', color: { argb: color } },
        left: { style: 'thin', color: { argb: color } },
        bottom: { style: 'thin', color: { argb: color } },
        right: { style: 'thin', color: { argb: color } }
    });

    const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

    // MySQL devuelve fechas en UTC; Excel no maneja zonas horarias,
    // así que se pasa la hora local para que se vea igual que en el panel.
    function aFechaLocal(valor) {
        if (!valor) return null;
        const d = new Date(valor);
        if (isNaN(d)) return null;
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    }

    function formatearFecha(texto) {
        if (!texto) return null;
        const [a, m, d] = texto.split('-');
        return `${d}/${m}/${a}`;
    }

    function letraColumna(n) {
        let s = '';
        while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
        return s;
    }

    // Arma la hoja principal y devuelve info para la hoja de resumen
    function crearHojaDatos(libro, datos, { titulo, nombreHoja, filtros }) {
        const cols = COLUMNAS
            .map(c => ({ ...c, clave: c.claves.find(k => datos.some(d => k in d)) }))
            .filter(c => c.clave);
        const n = cols.length;
        const ultima = letraColumna(n);

        const hoja = libro.addWorksheet(nombreHoja, {
            properties: { tabColor: { argb: MARCA.secundario } },
            views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
        });
        hoja.columns = cols.map(c => ({ width: c.ancho }));

        // ---- Fila 1: título con la marca ----
        hoja.mergeCells(`A1:${ultima}1`);
        const t = hoja.getCell('A1');
        t.value = `Corporación Jorby · ${titulo}`;
        t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: MARCA.blanco } };
        t.fill = relleno(MARCA.oscuro);
        t.alignment = { vertical: 'middle', indent: 1 };
        hoja.getRow(1).height = 34;

        // ---- Fila 2: datos del reporte ----
        const ahora = new Date();
        const partes = [`Generado: ${ahora.toLocaleDateString('es-PE')} ${ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`];
        const desde = formatearFecha(filtros.desde), hasta = formatearFecha(filtros.hasta);
        partes.push(`Periodo: ${desde || 'inicio'} – ${hasta || 'hoy'}`);
        if (filtros.estado) partes.push(`Estado: ${filtros.estado}`);
        partes.push(`Registros: ${datos.length}`);
        hoja.mergeCells(`A2:${ultima}2`);
        const s = hoja.getCell('A2');
        s.value = partes.join('   |   ');
        s.font = { name: 'Calibri', size: 10, italic: true, color: { argb: MARCA.secundario } };
        s.fill = relleno(MARCA.rosaSuave);
        s.alignment = { vertical: 'middle', indent: 1 };
        hoja.getRow(2).height = 22;

        // ---- Fila 4: indicadores rápidos (se llenan con fórmulas tras conocer el rango) ----
        hoja.getRow(3).height = 8;

        // ---- Fila 5: cabecera de la tabla ----
        const FILA_CAB = 5;
        const cab = hoja.getRow(FILA_CAB);
        cols.forEach((c, i) => {
            const celda = cab.getCell(i + 1);
            celda.value = c.titulo;
            celda.font = { name: 'Calibri', bold: true, color: { argb: MARCA.blanco } };
            celda.fill = relleno(MARCA.secundario);
            celda.border = borde(MARCA.secundario);
            celda.alignment = { vertical: 'middle', horizontal: c.tipo === 'moneda' ? 'right' : (c.tipo === 'estado' ? 'center' : 'left'), indent: c.tipo ? 0 : 1 };
        });
        cab.height = 24;

        // ---- Filas de datos ----
        datos.forEach((dato, idx) => {
            const fila = hoja.getRow(FILA_CAB + 1 + idx);
            const fondoFila = idx % 2 === 0 ? MARCA.blanco : MARCA.crema;
            cols.forEach((c, i) => {
                const celda = fila.getCell(i + 1);
                let valor = dato[c.clave];
                if (c.tipo === 'moneda') valor = Number(valor) || 0;
                if (c.tipo === 'fecha') valor = aFechaLocal(valor);
                if (c.tipo === 'fechaSolo') valor = aFechaSolo(valor);
                if (c.clave === 'direccion_entrega' && !valor && dato.modo_entrega === 'Recojo en tienda') valor = 'Recojo en tienda';
                celda.value = valor ?? '';
                celda.border = borde();
                celda.fill = relleno(fondoFila);
                celda.alignment = { vertical: 'middle', indent: c.tipo ? 0 : 1 };
                if (c.tipo === 'moneda') { celda.numFmt = FORMATO_MONEDA; celda.alignment.horizontal = 'right'; }
                if (c.tipo === 'fecha') { celda.numFmt = FORMATO_FECHA; celda.alignment.horizontal = 'center'; }
                if (c.tipo === 'fechaSolo') { celda.numFmt = FORMATO_FECHA_SOLO; celda.alignment.horizontal = 'center'; }
                if (c.tipo === 'estado') {
                    const e = ESTADOS[valor];
                    celda.alignment.horizontal = 'center';
                    if (e) {
                        celda.fill = relleno(e.fondo);
                        celda.font = { name: 'Calibri', bold: true, color: { argb: e.texto } };
                    }
                }
            });
            fila.height = 20;
        });

        const primeraDato = FILA_CAB + 1;
        const ultimaDato = FILA_CAB + datos.length;

        // ---- Fila de totales ----
        const filaTot = hoja.getRow(ultimaDato + 1);
        const idxMonto = cols.findIndex(c => c.tipo === 'moneda');
        for (let i = 1; i <= n; i++) {
            const celda = filaTot.getCell(i);
            celda.fill = relleno(MARCA.oscuro);
            celda.font = { name: 'Calibri', bold: true, color: { argb: MARCA.blanco } };
            celda.border = borde(MARCA.oscuro);
        }
        filaTot.getCell(1).value = 'TOTAL';
        filaTot.getCell(1).alignment = { indent: 1 };
        if (n > 1) {
            filaTot.getCell(2).value = { formula: `SUBTOTAL(103,A${primeraDato}:A${ultimaDato})&" pedidos"`, result: `${datos.length} pedidos` };
        }
        if (idxMonto >= 0) {
            const L = letraColumna(idxMonto + 1);
            const suma = datos.reduce((acc, d) => acc + (Number(d[cols[idxMonto].clave]) || 0), 0);
            const celda = filaTot.getCell(idxMonto + 1);
            // SUBTOTAL(109) solo suma las filas visibles: respeta los filtros que aplique el usuario
            celda.value = { formula: `SUBTOTAL(109,${L}${primeraDato}:${L}${ultimaDato})`, result: suma };
            celda.numFmt = FORMATO_MONEDA;
            celda.alignment = { horizontal: 'right' };
        }
        filaTot.height = 24;

        // Filtros en la cabecera
        hoja.autoFilter = { from: { row: FILA_CAB, column: 1 }, to: { row: ultimaDato, column: n } };

        // Pie de página al imprimir
        hoja.headerFooter.oddFooter = '&LCorporación Jorby&RPágina &P de &N';

        const rango = (clave) => {
            const i = cols.findIndex(c => c.clave === clave || c.claves.includes(clave));
            if (i < 0) return null;
            const L = letraColumna(i + 1);
            return `'${nombreHoja}'!$${L}$${primeraDato}:$${L}$${ultimaDato}`;
        };

        return { rangoEstado: rango('estado'), rangoMetodo: rango('metodo_pago'), rangoMonto: rango('monto_total'), datos, cols };
    }

    // Hoja "Resumen" con totales por estado y por método de pago (fórmulas vivas)
    function crearHojaResumen(libro, info, titulo) {
        const hoja = libro.addWorksheet('Resumen', {
            properties: { tabColor: { argb: MARCA.primario } },
            views: [{ showGridLines: false }]
        });
        hoja.columns = [{ width: 4 }, { width: 24 }, { width: 14 }, { width: 18 }, { width: 14 }];

        hoja.mergeCells('B2:E2');
        const t = hoja.getCell('B2');
        t.value = `Resumen · ${titulo}`;
        t.font = { name: 'Calibri', size: 15, bold: true, color: { argb: MARCA.blanco } };
        t.fill = relleno(MARCA.oscuro);
        t.alignment = { vertical: 'middle', indent: 1 };
        hoja.getRow(2).height = 30;

        let filaActual = 4;

        function bloque(tituloBloque, rangoCriterio, campo) {
            if (!rangoCriterio) return;
            const valores = [...new Set(info.datos.map(d => d[campo]).filter(Boolean))].sort();
            if (campo === 'estado') {
                Object.keys(ESTADOS).forEach(e => { if (!valores.includes(e)) valores.push(e); });
            }

            const cab = hoja.getRow(filaActual);
            [tituloBloque, 'Pedidos', 'Monto', '% del monto'].forEach((txt, i) => {
                const c = cab.getCell(i + 2);
                c.value = txt;
                c.font = { name: 'Calibri', bold: true, color: { argb: MARCA.blanco } };
                c.fill = relleno(MARCA.secundario);
                c.border = borde(MARCA.secundario);
                c.alignment = { horizontal: i === 0 ? 'left' : 'center', indent: i === 0 ? 1 : 0 };
            });
            cab.height = 22;

            const inicio = filaActual + 1;
            valores.forEach((v, idx) => {
                const r = inicio + idx;
                const fila = hoja.getRow(r);
                const cantidad = info.datos.filter(d => d[campo] === v).length;
                const monto = info.datos.filter(d => d[campo] === v).reduce((a, d) => a + (Number(d.monto_total) || 0), 0);
                fila.getCell(2).value = v;
                fila.getCell(3).value = { formula: `COUNTIF(${rangoCriterio},B${r})`, result: cantidad };
                fila.getCell(4).value = info.rangoMonto ? { formula: `SUMIF(${rangoCriterio},B${r},${info.rangoMonto})`, result: monto } : 0;
                fila.getCell(4).numFmt = FORMATO_MONEDA;
                const fin = inicio + valores.length; // fila de total
                fila.getCell(5).value = { formula: `IF($D$${fin}=0,0,D${r}/$D$${fin})` };
                fila.getCell(5).numFmt = '0.0%';
                for (let c = 2; c <= 5; c++) {
                    const celda = fila.getCell(c);
                    celda.border = borde();
                    celda.fill = relleno(idx % 2 ? MARCA.crema : MARCA.blanco);
                    celda.alignment = { horizontal: c === 2 ? 'left' : 'center', indent: c === 2 ? 1 : 0 };
                }
                const e = campo === 'estado' && ESTADOS[v];
                if (e) {
                    fila.getCell(2).font = { name: 'Calibri', bold: true, color: { argb: e.texto } };
                    fila.getCell(2).fill = relleno(e.fondo);
                }
            });

            const rTot = inicio + valores.length;
            const tot = hoja.getRow(rTot);
            tot.getCell(2).value = 'Total';
            tot.getCell(3).value = { formula: `SUM(C${inicio}:C${rTot - 1})` };
            tot.getCell(4).value = { formula: `SUM(D${inicio}:D${rTot - 1})` };
            tot.getCell(4).numFmt = FORMATO_MONEDA;
            tot.getCell(5).value = { formula: `IF(D${rTot}=0,0,1)` };
            tot.getCell(5).numFmt = '0.0%';
            for (let c = 2; c <= 5; c++) {
                const celda = tot.getCell(c);
                celda.font = { name: 'Calibri', bold: true, color: { argb: MARCA.blanco } };
                celda.fill = relleno(MARCA.oscuro);
                celda.border = borde(MARCA.oscuro);
                celda.alignment = { horizontal: c === 2 ? 'left' : 'center', indent: c === 2 ? 1 : 0 };
            }

            filaActual = rTot + 2;
        }

        bloque('Por estado', info.rangoEstado, 'estado');
        bloque('Por método de pago', info.rangoMetodo, 'metodo_pago');

        const nota = hoja.getCell(`B${filaActual}`);
        nota.value = 'Los valores se calculan con fórmulas a partir de la hoja de detalle.';
        nota.font = { name: 'Calibri', size: 9, italic: true, color: { argb: MARCA.textoSuave } };
    }

    // Construye el libro (separado de la descarga para poder probarlo)
    async function construirLibro(datos, { titulo = 'Reporte de Pedidos', nombreHoja = 'Pedidos', filtros = {} } = {}) {
        const libro = new ExcelJS.Workbook();
        libro.creator = 'Corporación Jorby - Panel Administrativo';
        libro.created = new Date();
        const info = crearHojaDatos(libro, datos, { titulo, nombreHoja, filtros });
        crearHojaResumen(libro, info, titulo);
        return libro;
    }

    // Genera el archivo y lo descarga en el navegador
    async function descargarExcel(datos, prefijoArchivo, opciones = {}) {
        if (typeof ExcelJS === 'undefined') {
            throw new Error('No se pudo cargar la librería de Excel. Revisa tu conexión a internet.');
        }
        const libro = await construirLibro(datos, opciones);
        const buffer = await libro.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefijoArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    if (typeof window !== 'undefined') {
        window.descargarExcel = descargarExcel;
        window.construirLibroExcel = construirLibro;
    }
    if (typeof module !== 'undefined') module.exports = { construirLibro };
})();
