/**
 * chart-barras.js — Gráfico de barras horizontales: comparación por jurisdicción.
 */

const ChartBarras = (() => {
    let _chart = null;

    /**
     * Renderiza barras horizontales de prevalencia por jurisdicción.
     * @param {Array} data - Filas filtradas (una anomalía × un año × todas las jurisdicciones).
     * @param {Object} options - { anomaliaLabel }
     */
    function render(data, options = {}) {
        // Filtrar solo jurisdicciones con datos (excluir ARGENTINA para las barras, pero mostrar referencia)
        const argRow = data.find(r => r.jurisdiccion === 'ARGENTINA');
        const provData = data
            .filter(r => r.jurisdiccion !== 'ARGENTINA' && r.prev != null && r.prev !== '')
            .sort((a, b) => (b.prev || 0) - (a.prev || 0));

        const labels = provData.map(r => r.jurisdiccion_nombre || r.jurisdiccion);
        const values = provData.map(r => r.prev || 0);
        const argPrev = argRow ? argRow.prev : null;
        const factor = data.length > 0 ? data[0].factor : 10000;
        const factorLabel = factor === 100 ? '× 100 nac.' : '× 10.000 nac.';

        // Colorear barras: verde si >= promedio, azul si < promedio
        const bgColors = values.map(v => {
            if (argPrev != null && v > argPrev) return 'rgba(192, 80, 77, 0.65)';
            return 'rgba(46, 117, 182, 0.65)';
        });
        const borderColors = values.map(v => {
            if (argPrev != null && v > argPrev) return '#C0504D';
            return '#2E75B6';
        });

        // Error bars (IC)
        const errorBars = provData.map(r => ({
            lo: r.ic_inf || 0,
            hi: r.ic_sup || 0,
        }));

        const canvas = document.getElementById('barras-chart');
        const ctx = canvas.getContext('2d');

        if (_chart) _chart.destroy();

        // Annotation plugin for reference line
        const annotationPlugin = {
            id: 'argLine',
            afterDraw: (chart) => {
                if (argPrev == null) return;
                const { ctx: c, scales: { x } } = chart;
                const xPixel = x.getPixelForValue(argPrev);
                c.save();
                c.beginPath();
                c.setLineDash([6, 4]);
                c.strokeStyle = '#1E5596';
                c.lineWidth = 2;
                c.moveTo(xPixel, chart.chartArea.top);
                c.lineTo(xPixel, chart.chartArea.bottom);
                c.stroke();

                // Label
                c.setLineDash([]);
                c.fillStyle = '#1E5596';
                c.font = "bold 11px 'Inter', sans-serif";
                c.textAlign = 'center';
                c.fillText(`Argentina: ${argPrev}`, xPixel, chart.chartArea.top - 6);
                c.restore();
            },
        };

        _chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: `Prevalencia ${factorLabel}`,
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 3,
                    barPercentage: 0.7,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 45, 82, 0.95)',
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: 'bold' },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 6,
                        callbacks: {
                            title: (items) => items[0].label,
                            label: (item) => {
                                const idx = item.dataIndex;
                                const r = provData[idx];
                                const lines = [
                                    `  Prevalencia: ${r.prev} ${factorLabel}`,
                                    `  Casos: ${r.casos_total}  |  Nacimientos: ${(r.nacimientos || 0).toLocaleString('es')}`,
                                ];
                                if (r.ic_inf && r.ic_sup) {
                                    lines.push(`  IC 95%: ${r.ic_inf} — ${r.ic_sup}`);
                                }
                                return lines;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        title: {
                            display: true,
                            text: `Prevalencia ${factorLabel}`,
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                            color: '#666',
                        },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            color: '#666',
                        },
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 12 },
                            color: '#333',
                        },
                    },
                },
            },
            plugins: [annotationPlugin],
        });
    }

    function destroy() {
        if (_chart) {
            _chart.destroy();
            _chart = null;
        }
    }

    return { render, destroy };
})();
