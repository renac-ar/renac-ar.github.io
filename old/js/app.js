/**
 * app.js — Orquestador principal del DataViewer RENAC.
 * Inicializa la carga de datos, popula filtros, y conecta las vistas.
 */

(async function () {
    'use strict';

    // ─── Globals ──────────────────────────────────────────────────────────
    let DATA = null;
    let CATALOGO = null;
    let METADATA = null;

    // ─── Init ─────────────────────────────────────────────────────────────
    try {
        const loaded = await DataLoader.loadAll();
        DATA = loaded.data;
        CATALOGO = loaded.catalogo;
        METADATA = loaded.metadata;

        populateHeader();
        populateFilters();
        setupNavigation();
        setupTemporalView();
        setupTablaView();
        setupBarrasView();
        setupDenominadoresView();

        // Render initial view
        updateTemporal();
        updateTabla();
        updateBarras();
        updateDenominadores();

        // Hide loading
        document.getElementById('loading-overlay').classList.add('hidden');
    } catch (err) {
        console.error('Error loading data:', err);
        document.getElementById('loading-overlay').innerHTML = `
            <p style="color:#C0504D; font-weight:600;">Error al cargar los datos</p>
            <p style="font-size:0.85rem; color:#666;">${err.message}</p>
        `;
    }

    // ─── Header ───────────────────────────────────────────────────────────
    function populateHeader() {
        const meta = document.getElementById('header-meta');
        meta.innerHTML = `
            Datos ${METADATA.rango_anios[0]}–${METADATA.rango_anios[1]}<br>
            Actualización: ${METADATA.ultima_actualizacion}
        `;
    }

    // ─── Navigation ───────────────────────────────────────────────────────
    function setupNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Toggle active tab
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Toggle active view
                const viewId = 'view-' + tab.dataset.view;
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(viewId).classList.add('active');
            });
        });
    }

    // ─── Filters ──────────────────────────────────────────────────────────
    function populateFilters() {
        const years = DataLoader.getYears();
        const jurisdicciones = DataLoader.getJurisdicciones();
        const maxYear = years[years.length - 1];

        // --- Anomalía dropdowns ---
        const anomSelect = document.getElementById('filter-anomalia');
        const barrasAnomSelect = document.getElementById('filter-barras-anomalia');

        function populateAnomalySelect(select) {
            select.innerHTML = '';
            for (const entry of CATALOGO) {
                if (entry.tipo === 'total') {
                    const opt = document.createElement('option');
                    opt.value = entry.id;
                    opt.textContent = `★ ${entry.label}`;
                    opt.selected = true;
                    select.appendChild(opt);
                } else if (entry.tipo === 'group') {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = entry.label;
                    // Group itself
                    const opt = document.createElement('option');
                    opt.value = entry.id;
                    opt.textContent = `${entry.label} (grupo)`;
                    optgroup.appendChild(opt);
                    // Children
                    if (entry.children) {
                        for (const child of entry.children) {
                            const childOpt = document.createElement('option');
                            childOpt.value = child.id;
                            childOpt.textContent = `  ${child.label}`;
                            optgroup.appendChild(childOpt);
                        }
                    }
                    select.appendChild(optgroup);
                } else if (entry.tipo === 'section' && entry.children) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = entry.label;
                    for (const child of entry.children) {
                        const opt = document.createElement('option');
                        opt.value = child.id;
                        opt.textContent = child.label;
                        optgroup.appendChild(opt);
                    }
                    select.appendChild(optgroup);
                }
            }
        }

        populateAnomalySelect(anomSelect);
        populateAnomalySelect(barrasAnomSelect);

        // --- Jurisdicción dropdowns ---
        function populateJurisSelect(select, includeAll = false) {
            select.innerHTML = '';
            // Argentina (total) primero
            const argOpt = document.createElement('option');
            argOpt.value = 'ARGENTINA';
            argOpt.textContent = 'Argentina (total)';
            argOpt.selected = true;
            select.appendChild(argOpt);

            // Provincias
            for (const j of jurisdicciones) {
                if (j.id === 'ARGENTINA') continue;
                const opt = document.createElement('option');
                opt.value = j.id;
                opt.textContent = j.nombre;
                select.appendChild(opt);
            }
        }

        populateJurisSelect(document.getElementById('filter-jurisdiccion'));
        populateJurisSelect(document.getElementById('filter-tabla-jurisdiccion'));

        // --- Year dropdowns ---
        function populateYearSelect(select) {
            select.innerHTML = '';
            for (let i = years.length - 1; i >= 0; i--) {
                const opt = document.createElement('option');
                opt.value = years[i];
                opt.textContent = years[i];
                if (years[i] === maxYear) opt.selected = true;
                select.appendChild(opt);
            }
        }

        populateYearSelect(document.getElementById('filter-tabla-anio'));
        populateYearSelect(document.getElementById('filter-barras-anio'));

        // --- Denominadores jurisdicción ---
        populateJurisSelect(document.getElementById('filter-denom-jurisdiccion'));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  VISTA 1: EVOLUCIÓN TEMPORAL
    // ═══════════════════════════════════════════════════════════════════════

    function setupTemporalView() {
        // Filter changes
        document.getElementById('filter-anomalia').addEventListener('change', updateTemporal);
        document.getElementById('filter-jurisdiccion').addEventListener('change', updateTemporal);
        document.getElementById('chk-total').addEventListener('change', updateTemporal);
        document.getElementById('chk-nv').addEventListener('change', updateTemporal);
        document.getElementById('chk-ile').addEventListener('change', updateTemporal);

        // Toggle chart/table
        document.getElementById('btn-chart').addEventListener('click', () => {
            document.getElementById('btn-chart').classList.add('active');
            document.getElementById('btn-table').classList.remove('active');
            document.getElementById('temporal-chart-container').style.display = '';
            document.getElementById('temporal-table-container').style.display = 'none';
        });

        document.getElementById('btn-table').addEventListener('click', () => {
            document.getElementById('btn-table').classList.add('active');
            document.getElementById('btn-chart').classList.remove('active');
            document.getElementById('temporal-chart-container').style.display = 'none';
            document.getElementById('temporal-table-container').style.display = '';
        });

        // Download
        document.getElementById('btn-download-temporal').addEventListener('click', () => {
            const anom = document.getElementById('filter-anomalia').value;
            const juris = document.getElementById('filter-jurisdiccion').value;
            const data = DataLoader.query({ anomalia: anom, jurisdiccion: juris });
            DataLoader.downloadCSV(data, `renac_${anom}_${juris}_temporal.csv`);
        });
    }

    function updateTemporal() {
        const anom = document.getElementById('filter-anomalia').value;
        const juris = document.getElementById('filter-jurisdiccion').value;
        const showTotal = document.getElementById('chk-total').checked;
        const showNV = document.getElementById('chk-nv').checked;
        const showILE = document.getElementById('chk-ile').checked;

        const data = DataLoader.query({ anomalia: anom, jurisdiccion: juris });
        const anomLabel = DataLoader.getAnomaliaLabel(anom);
        const jurisLabel = juris === 'ARGENTINA' ? 'Argentina' : juris;

        // Update title
        document.getElementById('temporal-title').textContent =
            `${anomLabel} — ${jurisLabel}`;

        // Update footnote
        const factor = data.length > 0 ? data[0].factor : 10000;
        document.getElementById('temporal-footnote').textContent =
            `Prevalencia ${factor === 100 ? 'por 100' : 'por 10.000'} nacimientos. IC 95% Poisson exacto. Fuente: RENAC.`;

        ChartTemporal.render(data, { showTotal, showNV, showILE, anomaliaLabel: anomLabel });
        ChartTemporal.renderTable(data);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  VISTA 2: TABLA DE PREVALENCIA
    // ═══════════════════════════════════════════════════════════════════════

    function setupTablaView() {
        document.getElementById('filter-tabla-jurisdiccion').addEventListener('change', updateTabla);
        document.getElementById('filter-tabla-anio').addEventListener('change', updateTabla);

        // Download
        document.getElementById('btn-download-tabla').addEventListener('click', () => {
            const juris = document.getElementById('filter-tabla-jurisdiccion').value;
            const anio = parseInt(document.getElementById('filter-tabla-anio').value);
            const data = DataLoader.query({ jurisdiccion: juris, anioMin: anio, anioMax: anio });
            DataLoader.downloadCSV(data, `renac_prevalencia_${juris}_${anio}.csv`);
        });
    }

    function updateTabla() {
        const juris = document.getElementById('filter-tabla-jurisdiccion').value;
        const anio = parseInt(document.getElementById('filter-tabla-anio').value);
        const jurisLabel = juris === 'ARGENTINA' ? 'Argentina' : juris;

        document.getElementById('tabla-title').textContent =
            `Prevalencia por anomalía — ${jurisLabel} — ${anio}`;

        // Get nacimientos from hlptrue row
        const totalRow = DATA.find(r => r.anomalia === 'hlptrue' && r.jurisdiccion === juris && r.anio === anio);
        const nacimientos = totalRow ? (totalRow.nacimientos || 0).toLocaleString('es') : '—';

        document.getElementById('tabla-footnote').textContent =
            `Nacimientos: ${nacimientos}. Prevalencia por 10.000 nacimientos (excepto Total AC: por 100). IC 95% Poisson exacto. Fuente: RENAC.`;

        TablePrevalencia.render(DATA, CATALOGO, { jurisdiccion: juris, anio });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  VISTA 3: COMPARACIÓN POR JURISDICCIÓN
    // ═══════════════════════════════════════════════════════════════════════

    function setupBarrasView() {
        document.getElementById('filter-barras-anomalia').addEventListener('change', updateBarras);
        document.getElementById('filter-barras-anio').addEventListener('change', updateBarras);

        // Download
        document.getElementById('btn-download-barras').addEventListener('click', () => {
            const anom = document.getElementById('filter-barras-anomalia').value;
            const anio = parseInt(document.getElementById('filter-barras-anio').value);
            const data = DataLoader.query({ anomalia: anom, anioMin: anio, anioMax: anio });
            DataLoader.downloadCSV(data, `renac_${anom}_jurisdicciones_${anio}.csv`);
        });
    }

    function updateBarras() {
        const anom = document.getElementById('filter-barras-anomalia').value;
        const anio = parseInt(document.getElementById('filter-barras-anio').value);
        const anomLabel = DataLoader.getAnomaliaLabel(anom);

        const data = DataLoader.query({ anomalia: anom, anioMin: anio, anioMax: anio });

        document.getElementById('barras-title').textContent =
            `${anomLabel} por jurisdicción — ${anio}`;

        const factor = data.length > 0 ? data[0].factor : 10000;
        document.getElementById('barras-footnote').textContent =
            `Prevalencia ${factor === 100 ? 'por 100' : 'por 10.000'} nacimientos. Línea punteada: Argentina. IC 95% Poisson exacto. Fuente: RENAC.`;

        ChartBarras.render(data, { anomaliaLabel: anomLabel });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  VISTA 4: DENOMINADORES
    // ═══════════════════════════════════════════════════════════════════════

    function setupDenominadoresView() {
        document.getElementById('filter-denom-jurisdiccion').addEventListener('change', updateDenominadores);

        // Toggle chart/table
        document.getElementById('btn-denom-chart').addEventListener('click', () => {
            document.getElementById('btn-denom-chart').classList.add('active');
            document.getElementById('btn-denom-table').classList.remove('active');
            document.getElementById('denom-chart-container').style.display = '';
            document.getElementById('denom-table-container').style.display = 'none';
        });
        document.getElementById('btn-denom-table').addEventListener('click', () => {
            document.getElementById('btn-denom-table').classList.add('active');
            document.getElementById('btn-denom-chart').classList.remove('active');
            document.getElementById('denom-chart-container').style.display = 'none';
            document.getElementById('denom-table-container').style.display = '';
        });

        // Download
        document.getElementById('btn-download-denom').addEventListener('click', () => {
            const juris = document.getElementById('filter-denom-jurisdiccion').value;
            const data = getDenomData(juris);
            DataLoader.downloadCSV(data, `renac_nacimientos_${juris}.csv`);
        });
    }

    function getDenomData(juris) {
        return DATA.filter(r => r.anomalia === 'hlptrue' && r.jurisdiccion === juris)
            .map(r => ({ anio: r.anio, jurisdiccion: r.jurisdiccion, jurisdiccion_nombre: r.jurisdiccion_nombre, nacimientos: r.nacimientos }))
            .sort((a, b) => a.anio - b.anio);
    }

    function updateDenominadores() {
        const juris = document.getElementById('filter-denom-jurisdiccion').value;
        const jurisLabel = juris === 'ARGENTINA' ? 'Argentina' :
            (METADATA.jurisdicciones.find(j => j.id === juris) || {}).nombre || juris;
        const data = getDenomData(juris);

        document.getElementById('denom-title').textContent = `Nacimientos por año — ${jurisLabel}`;

        const totalNac = data.reduce((s, r) => s + (r.nacimientos || 0), 0);
        document.getElementById('denom-footnote').textContent =
            `Total acumulado: ${totalNac.toLocaleString('es')} nacimientos (${data.length} años). Nacimientos en hospitales RENAC. Fuente: RENAC.`;

        Denominadores.render(data, { entityLabel: jurisLabel });
        Denominadores.renderTable(data);
    }

})();
