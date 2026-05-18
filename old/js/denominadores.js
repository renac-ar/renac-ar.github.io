/**
 * denominadores.js — Vista de denominadores (nacimientos) por año.
 */

const Denominadores = (() => {
    let _chart = null;

    /**
     * Renderiza gráfico de barras de nacimientos por año.
     * @param {Array} data - Filas con { anio, nacimientos }
     * @param {Object} options - { entityLabel }
     */
    function render(data, options = {}) {
        const { entityLabel = '' } = options;

        data.sort((a, b) => a.anio - b.anio);

        const labels = data.map(d => d.anio);
        const values = data.map(d => d.nacimientos || 0);

        const canvas = document.getElementById('denom-chart');
        const ctx = canvas.getContext('2d');

        if (_chart) _chart.destroy();

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 380);
        gradient.addColorStop(0, 'rgba(30, 85, 150, 0.7)');
        gradient.addColorStop(1, 'rgba(30, 85, 150, 0.25)');

        _chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Nacimientos',
                    data: values,
                    backgroundColor: gradient,
                    borderColor: '#1E5596',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    barPercentage: 0.7,
                }]
            },
            options: {
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
                            title: items => `Año ${items[0].label}`,
                            label: item => `  Nacimientos: ${item.raw.toLocaleString('es')}`,
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
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 12 },
                            color: '#666',
                            callback: v => v.toLocaleString('es'),
                        },
                        title: {
                            display: true,
                            text: 'Nacimientos',
                            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                            color: '#666',
                        },
                    },
                },
            },
        });
    }

    /**
     * Renderiza tabla de nacimientos por año.
     */
    function renderTable(data) {
        const sorted = [...data].sort((a, b) => b.anio - a.anio);

        const thead = document.querySelector('#denom-table thead');
        const tbody = document.querySelector('#denom-table tbody');

        thead.innerHTML = `<tr>
            <th>Año</th>
            <th class="num">Nacimientos</th>
        </tr>`;

        tbody.innerHTML = sorted.map(r => `
            <tr>
                <td>${r.anio}</td>
                <td class="num"><strong>${(r.nacimientos || 0).toLocaleString('es')}</strong></td>
            </tr>
        `).join('');
    }

    function destroy() {
        if (_chart) { _chart.destroy(); _chart = null; }
    }

    return { render, renderTable, destroy };
})();
