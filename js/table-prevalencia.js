/**
 * table-prevalencia.js — Tabla jerárquica de prevalencia por anomalía.
 */

const TablePrevalencia = (() => {

    /**
     * Renderiza tabla jerárquica con grupos expandibles.
     * @param {Array} allData - Todos los datos cargados.
     * @param {Array} catalogo - Catálogo de anomalías.
     * @param {Object} filters - { jurisdiccion, anios }
     */
    function render(allData, catalogo, filters) {
        const { jurisdiccion, anios } = filters;

        const thead = document.querySelector('#prevalencia-table thead');
        const tbody = document.querySelector('#prevalencia-table tbody');

        thead.innerHTML = `<tr>
            <th style="min-width:220px">Anomalía</th>
            <th class="num">Casos</th>
            <th class="num">NV</th>
            <th class="num">FM</th>
            <th class="num">ILE/IVE</th>
            <th class="num">NE</th>
            <th class="num">Aislado</th>
            <th class="num">ACM</th>
            <th class="num">Sme</th>
            <th class="num">Prevalencia</th>
            <th class="num">IC 95%</th>
        </tr>`;

        // Helper: buscar fila de datos agregada por años
        function findRow(anomalia) {
            const rows = allData.filter(r =>
                r.anomalia === anomalia &&
                r.jurisdiccion === jurisdiccion &&
                anios.includes(r.anio)
            );
            
            if (rows.length === 0) return null;
            if (rows.length === 1) return rows[0]; // Optimization
            
            const factor = anomalia === 'hlptrue' ? 100 : 10000;
            return DataLoader.aggregate(rows, anomalia, factor);
        }

        // Helper: formatea n con % entre paréntesis sobre total
        function fmtPct(n, total) {
            if (n == null || total == null || total === 0) return '—';
            const pct = (n / total * 100).toFixed(1);
            return `${n} <span class="pct">(${pct}%)</span>`;
        }

        function formatRow(r) {
            if (!r) {
                return `<td class="num">—</td>`.repeat(9);
            }
            const total = r.casos_total || 0;

            return `
                <td class="num">${total}</td>
                <td class="num">${fmtPct(r.casos_nv, total)}</td>
                <td class="num">${fmtPct(r.casos_fm, total)}</td>
                <td class="num">${fmtPct(r.casos_ile, total)}</td>
                <td class="num">${fmtPct(r.casos_ne, total)}</td>
                <td class="num">${fmtPct(r.casos_aislado, total)}</td>
                <td class="num">${fmtPct(r.casos_acm, total)}</td>
                <td class="num">${fmtPct(r.casos_sme, total)}</td>
                <td class="num"><strong>${r.prev != null && r.prev !== '' ? r.prev : '—'}</strong></td>
                <td class="num">${r.ic_inf && r.ic_sup ? `(${r.ic_inf}–${r.ic_sup})` : '—'}</td>
            `;
        }

        let html = '';

        for (const entry of catalogo) {
            if (entry.tipo === 'total') {
                // Total AC mayores — fila especial
                const r = findRow(entry.id);
                html += `<tr class="row-total">
                    <td>${entry.label}</td>
                    ${formatRow(r)}
                </tr>`;
            } else if (entry.tipo === 'group') {
                // Grupo con hijos
                const r = findRow(entry.id);
                const groupId = entry.id;
                html += `<tr class="row-group" data-group="${groupId}">
                    <td>${entry.label}</td>
                    ${formatRow(r)}
                </tr>`;
                if (entry.children) {
                    for (const child of entry.children) {
                        const cr = findRow(child.id);
                        html += `<tr class="row-child child-of-${groupId}">
                            <td>${child.label}</td>
                            ${formatRow(cr)}
                        </tr>`;
                    }
                }
            } else if (entry.tipo === 'section') {
                // Sección (Otras anomalías, Displasias)
                html += `<tr class="row-section">
                    <td colspan="11">${entry.label}</td>
                </tr>`;
                if (entry.children) {
                    for (const child of entry.children) {
                        const cr = findRow(child.id);
                        html += `<tr class="row-child">
                            <td>${child.label}</td>
                            ${formatRow(cr)}
                        </tr>`;
                    }
                }
            }
        }

        tbody.innerHTML = html;

        // Setup expand/collapse
        tbody.querySelectorAll('.row-group').forEach(row => {
            row.addEventListener('click', () => {
                const groupId = row.dataset.group;
                const children = tbody.querySelectorAll(`.child-of-${groupId}`);
                const isCollapsed = row.classList.toggle('collapsed');
                children.forEach(child => {
                    child.classList.toggle('hidden', isCollapsed);
                });
            });
        });
    }

    return { render };
})();
