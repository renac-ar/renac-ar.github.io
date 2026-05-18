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
     * Filtra datos por anomalía, jurisdicción, y opcionalmente rango de años.
     */
    function query({ anomalia, jurisdiccion, anioMin, anioMax }) {
        let result = _data;

        if (anomalia) {
            result = result.filter(r => r.anomalia === anomalia);
        }
        if (jurisdiccion) {
            result = result.filter(r => r.jurisdiccion === jurisdiccion);
        }
        if (anioMin != null) {
            result = result.filter(r => r.anio >= anioMin);
        }
        if (anioMax != null) {
            result = result.filter(r => r.anio <= anioMax);
        }

        return result;
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
    };
})();
