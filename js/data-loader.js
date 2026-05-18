/**
 * data-loader.js — Carga de CSV y JSON para el DataViewer RENAC.
 * Usa PapaParse para parsear el CSV de prevalencia.
 */

const DataLoader = (() => {
    let _data = null;       // parsed CSV rows
    let _catalogo = null;   // anomalías catálogo
    let _metadata = null;   // metadata general

    /**
     * Carga todos los archivos de datos.
     * @returns {Promise<{data, catalogo, metadata}>}
     */
    async function loadAll() {
        const [csvText, catResponse, metaResponse] = await Promise.all([
            fetch('data/prevalencia.csv').then(r => r.text()),
            fetch('data/anomalias_catalogo.json').then(r => r.json()),
            fetch('data/metadata.json').then(r => r.json()),
        ]);

        // Parse CSV con PapaParse
        const parsed = Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        });

        _data = parsed.data;
        _catalogo = catResponse;
        _metadata = metaResponse;

        console.log(`[DataLoader] CSV: ${_data.length} filas`);
        console.log(`[DataLoader] Catálogo: ${_catalogo.length} entries`);
        console.log(`[DataLoader] Años: ${_metadata.rango_anios[0]}-${_metadata.rango_anios[1]}`);

        return { data: _data, catalogo: _catalogo, metadata: _metadata };
    }

    /**
     * Filtra datos por anomalía, jurisdicciones (array), y años (array) o rangos.
     */
    function query({ anomalia, jurisdiccion, jurisdicciones, anioMin, anioMax, anios }) {
        let result = _data;

        if (anomalia) {
            result = result.filter(r => r.anomalia === anomalia);
        }
        if (jurisdiccion) {
            result = result.filter(r => r.jurisdiccion === jurisdiccion);
        }
        if (jurisdicciones && jurisdicciones.length > 0) {
            result = result.filter(r => jurisdicciones.includes(r.jurisdiccion));
        }
        if (anioMin != null) {
            result = result.filter(r => r.anio >= anioMin);
        }
        if (anioMax != null) {
            result = result.filter(r => r.anio <= anioMax);
        }
        if (anios && anios.length > 0) {
            result = result.filter(r => anios.includes(r.anio));
        }

        return result;
    }

    /**
     * Aproximación de Byar para el IC 95% de Poisson.
     */
    function poissonCI(n, denom, factor) {
        if (denom <= 0 || n == null || denom == null) return { prev: null, lo: null, hi: null };
        n = Number(n);
        if (n === 0) {
            return {
                prev: 0.0,
                lo: 0.0,
                hi: parseFloat((3.688879 / denom * factor).toFixed(2))
            };
        }
        const prev = parseFloat((n / denom * factor).toFixed(2));
        const z = 1.95996; // 95% CI
        const lo = n * Math.pow(1 - 1/(9*n) - z / (3*Math.sqrt(n)), 3);
        const hi = (n+1) * Math.pow(1 - 1/(9*(n+1)) + z / (3*Math.sqrt(n+1)), 3);
        
        return {
            prev: prev,
            lo: parseFloat((lo / denom * factor).toFixed(2)),
            hi: parseFloat((hi / denom * factor).toFixed(2))
        };
    }

    /**
     * Agrega un conjunto de filas (sumando casos y nacimientos) y recalcula la prevalencia.
     */
    function aggregate(rows, anomaliaId, factorVal = 10000) {
        if (!rows || rows.length === 0) return null;
        
        let sumNac = 0;
        let sumTotal = 0;
        let sumNV = 0;
        let sumFM = 0;
        let sumILE = 0;
        let sumNE = 0;
        let sumAislado = 0;
        let sumACM = 0;
        let sumSme = 0;
        
        for (const r of rows) {
            sumNac += r.nacimientos || 0;
            sumTotal += r.casos_total || 0;
            sumNV += r.casos_nv || 0;
            sumFM += r.casos_fm || 0;
            sumILE += r.casos_ile || 0;
            sumNE += r.casos_ne || 0;
            sumAislado += r.casos_aislado || 0;
            sumACM += r.casos_acm || 0;
            sumSme += r.casos_sme || 0;
        }

        const ci = poissonCI(sumTotal, sumNac, factorVal);
        const firstRow = rows[0];
        
        return {
            anomalia: anomaliaId,
            jurisdiccion: firstRow.jurisdiccion,
            jurisdiccion_nombre: firstRow.jurisdiccion_nombre,
            anio: firstRow.anio,
            nacimientos: sumNac,
            casos_total: sumTotal,
            casos_nv: sumNV,
            casos_fm: sumFM,
            casos_ile: sumILE,
            casos_ne: sumNE,
            casos_aislado: sumAislado,
            casos_acm: sumACM,
            casos_sme: sumSme,
            factor: factorVal,
            prev: ci.prev,
            ic_inf: ci.lo,
            ic_sup: ci.hi
        };
    }

    /**
     * Retorna años únicos ordenados.
     */
    function getYears() {
        if (!_data) return [];
        const years = [...new Set(_data.map(r => r.anio))].filter(y => y != null);
        return years.sort((a, b) => a - b);
    }

    /**
     * Retorna jurisdicciones únicas.
     */
    function getJurisdicciones() {
        if (!_metadata) return [];
        return _metadata.jurisdicciones;
    }

    /**
     * Retorna el catálogo de anomalías.
     */
    function getCatalogo() {
        return _catalogo;
    }

    /**
     * Retorna metadata general.
     */
    function getMetadata() {
        return _metadata;
    }

    /**
     * Obtiene el label de una anomalía desde el catálogo.
     */
    function getAnomaliaLabel(id) {
        if (!_catalogo) return id;
        for (const entry of _catalogo) {
            if (entry.id === id) return entry.label;
            if (entry.children) {
                for (const child of entry.children) {
                    if (child.id === id) return child.label;
                }
            }
        }
        return id;
    }

    /**
     * Genera un CSV string de las filas dadas para descarga.
     */
    function toCSV(rows) {
        if (!rows || rows.length === 0) return '';
        const headers = Object.keys(rows[0]);
        const lines = [headers.join(',')];
        for (const row of rows) {
            lines.push(headers.map(h => {
                const val = row[h];
                if (typeof val === 'string' && val.includes(',')) {
                    return `"${val}"`;
                }
                return val ?? '';
            }).join(','));
        }
        return lines.join('\n');
    }

    /**
     * Descarga un CSV como archivo.
     */
    function downloadCSV(rows, filename) {
        const csv = toCSV(rows);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    return {
        loadAll,
        query,
        getYears,
        getJurisdicciones,
        getCatalogo,
        getMetadata,
        getAnomaliaLabel,
        downloadCSV,
        aggregate
    };
})();
