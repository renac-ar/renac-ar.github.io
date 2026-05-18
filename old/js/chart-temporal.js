/**
 * chart-temporal.js — Gráfico de evolución temporal (líneas por año).
 */

const ChartTemporal = (() => {
    let _chart = null;

    const COLORS = {
        total:  { line: '#1E5596', bg: 'rgba(30, 85, 150, 0.08)' },
        nvfm:   { line: '#4F6D28', bg: 'rgba(79, 109, 40, 0.08)' },
        ile:    { line: '#C0504D', bg: 'rgba(192, 80, 77, 0.08)' },
    };

    /**
     * Renderiza o actualiza el gráfico temporal.
     * @param {Array} data - Filas filtradas por anomalía + jurisdicción.
     * @param {Object} options - { showTotal, showNV, showILE, anomaliaLabel, jurisdiccionLabel }
     */
    function render(data, options = {}) {
        const { showTotal = true, showNV = true, showILE = false,
                anomaliaLabel = '', jurisdiccionLabel = '' } = options;

        // Ordenar por año
        data.sort((a, b) => a.anio - b.anio);
        const labels = data.map(r => r.anio);
        const factor = data.length > 0 ? data[0].factor : 10000;
        const factorLabel = factor === 100 ? '× 100 nac.' : '× 10.000 nac.';

        const datasets = [];

        if (showTotal) {
            datasets.push({
                label: 'Total',
                data: data.map(r => r.prev || 0),
                borderColor: COLORS.total.line,
                backgroundColor: COLORS.total.bg,
                borderWidth: 2.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: COLORS.total.line,
                fill: true,
                tension: 0.15,
            });
        }

        if (showNV) {
            // NV + FM = calcular prevalencia solo de NV+FM
            const nvfmData = data.map(r => {
                if (r.nacimientos > 0) {
                    return Math.round(((r.casos_nv + r.casos_fm) / r.nacimientos) * factor * 100) / 100;
                }
                return 0;
            });
            datasets.push({
                label: 'NV + FM',
                data: nvfmData,
                borderColor: COLORS.nvfm.line,
                backgroundColor: COLORS.nvfm.bg,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: COLORS.nvfm.line,
                fill: false,
                tension: 0.15,
                borderDash: [],
            });
        }

        if (showILE) {
            const ileData = data.map(r => {
                if (r.nacimientos > 0) {
                    return Math.round((r.casos_ile / r.nacimientos) * factor * 100) / 100;
                }
                return 0;
            });
            datasets.push({
                label: 'ILE/IVE',
                data: ileData,
                borderColor: COLORS.ile.line,
                backgroundColor: COLORS.ile.bg,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: COLORS.ile.line,
                fill: false,
                tension: 0.15,
                borderDash: [5, 3],
            });
        }

        const canvas = document.getElementById('temporal-chart');
        const ctx = canvas.getContext('2d');

        if (_chart) {
            _chart.destroy();
        }

        _chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 12 },
                            padding: 16,
                            usePointStyle: true,
                            pointStyleWidth: 20,
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 45, 82, 0.95)',
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        callbacks: {
                            title: (items) => `Año ${items[0].label}`,
                            label: (item) => {
                                const dataIndex = item.dataIndex;
                                const row = data[dataIndex];
                                const val = item.raw;
                                if (item.dataset.label === 'Total') {
                                    return `  Total: ${val} ${factorLabel}  (${row.casos_total} casos / ${row.nacimientos.toLocaleString('es')} nac.)`;
                                }
                                if (item.dataset.label === 'NV + FM') {
                                    return `  NV+FM: ${val} ${factorLabel}  (${row.casos_nv + row.casos_fm} casos)`;
                                }
                                return `  ILE/IVE: ${val} ${factorLabel}  (${row.casos_ile} casos)`;
                            },
                            afterBody: (items) => {
                                const dataIndex = items[0].dataIndex;
                                const row = data[dataIndex];
                                if (row.ic_inf && row.ic_sup) {
                                    return [`  IC 95%: ${row.ic_inf} — ${row.ic_sup}`];
                                }
                                return [];
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 12 },
                            color: '#666',
                        },
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 12 },
                            color: '#666',
                        },
                        title: {
                            display: true,
                            text: `Prevalencia ${factorLabel}`,
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                            color: '#666',
                        },
                    },
                },
            },
        });
    }

    /**
     * Renderiza la tabla de datos temporales.
     */
    function renderTable(data) {
        data.sort((a, b) => b.anio - a.anio); // Más reciente primero

        const thead = document.querySelector('#temporal-table thead');
        const tbody = document.querySelector('#temporal-table tbody');

        const factor = data.length > 0 ? data[0].factor : 10000;
        const factorLabel = factor === 100 ? '×100' : '×10k';

        thead.innerHTML = `<tr>
            <th>Año</th>
            <th class="num">Nacimientos</th>
            <th class="num">Casos</th>
            <th class="num">NV</th>
            <th class="num">FM</th>
            <th class="num">ILE/IVE</th>
            <th class="num">NE</th>
            <th class="num">Prev ${factorLabel}</th>
            <th class="num">IC 95%</th>
        </tr>`;

        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${r.anio}</td>
                <td class="num">${(r.nacimientos || 0).toLocaleString('es')}</td>
                <td class="num">${r.casos_total || 0}</td>
                <td class="num">${r.casos_nv || 0}</td>
                <td class="num">${r.casos_fm || 0}</td>
                <td class="num">${r.casos_ile || 0}</td>
                <td class="num">${r.casos_ne || 0}</td>
                <td class="num"><strong>${r.prev || '—'}</strong></td>
                <td class="num">${r.ic_inf && r.ic_sup ? `(${r.ic_inf}–${r.ic_sup})` : '—'}</td>
            </tr>
        `).join('');
    }

    function destroy() {
        if (_chart) {
            _chart.destroy();
            _chart = null;
        }
    }

    return { render, renderTable, destroy };
})();
