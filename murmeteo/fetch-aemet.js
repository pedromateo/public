const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 5, initialDelayMs = 30000) {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            const res = await fetch(url, options);
            if (res.status === 429 && attempt <= maxRetries) {
                const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
                console.warn(`HTTP 429 (Demasiadas peticiones). Esperando ${delayMs / 1000}s antes de reintentar (intento ${attempt} de ${maxRetries})...`);
                await sleep(delayMs);
                continue;
            }
            return res;
        } catch (err) {
            if (attempt <= maxRetries) {
                const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
                console.warn(`Error de conexión (${err.message}). Esperando ${delayMs / 1000}s antes de reintentar (intento ${attempt} de ${maxRetries})...`);
                await sleep(delayMs);
                continue;
            }
            throw err;
        }
    }
}

async function fetchAemet() {
    const apiKey = process.env.AEMET_API_KEY;
    const municipio = '30030'; // Murcia
    
    if (!apiKey) {
        console.error('Error: Variable de entorno AEMET_API_KEY no encontrada.');
        process.exit(1);
    }

    console.log('Solicitando URL de datos a AEMET...');
    const metadataUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${municipio}/?api_key=${apiKey}`;
    
    const maxRetries = 5;
    const initialDelayMs = 30000; // 30 segundos

    let metaData;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        const metaRes = await fetchWithRetry(metadataUrl, { headers: { 'Accept': 'application/json' } }, maxRetries - attempt + 1, initialDelayMs * Math.pow(2, attempt - 1));
        if (!metaRes.ok) throw new Error(`HTTP Error ${metaRes.status} al pedir metadatos`);
        
        metaData = await metaRes.json();
        if (metaData.estado === 429 && attempt <= maxRetries) {
            const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
            console.warn(`AEMET devolvió estado 429: ${metaData.descripcion}. Esperando ${delayMs / 1000}s antes de reintentar (intento ${attempt} de ${maxRetries})...`);
            await sleep(delayMs);
            continue;
        }
        break;
    }

    if (metaData.estado !== 200) throw new Error(`AEMET Error: ${metaData.descripcion}`);
    
    const dataUrl = metaData.datos;
    console.log('Descargando JSON de pronóstico real...');
    
    const dataRes = await fetchWithRetry(dataUrl, {}, maxRetries, initialDelayMs);
    if (!dataRes.ok) throw new Error(`HTTP Error en descarga de datos ${dataRes.status}`);
    
    const forecastData = await dataRes.json();
    
    // Guardar fecha y hora exacta de creación del fichero
    if (Array.isArray(forecastData) && forecastData.length > 0) {
        forecastData[0].ficheroCreado = new Date().toISOString();
    }
    
    // 1. Guardar en directorio forecasts con formato forecast_YYYYMMDD_am/pm.json
    const forecastsDir = path.join(__dirname, 'forecasts');
    if (!fs.existsSync(forecastsDir)) {
        fs.mkdirSync(forecastsDir, { recursive: true });
    }

    const { filename } = getMadridSlot();
    const slotPath = path.join(forecastsDir, filename);
    fs.writeFileSync(slotPath, JSON.stringify(forecastData, null, 2));
    console.log(`Pronóstico guardado exitosamente en forecasts/${filename}`);

    // 2. Mantener copia en forecast.json para retrocompatibilidad
    const legacyPath = path.join(__dirname, 'forecast.json');
    fs.writeFileSync(legacyPath, JSON.stringify(forecastData, null, 2));
    console.log('Copia de retrocompatibilidad guardada en forecast.json');

    // 3. Purgar pronósticos antiguos dejando como máximo 5 ficheros
    pruneOldForecasts(forecastsDir, 5);
}

function getMadridSlot(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false
    }).formatToParts(date);
    
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    const rawHour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const hour = rawHour === 24 ? 0 : rawHour;
    const period = hour < 12 ? 'am' : 'pm';
    
    return {
        slot: `${y}${m}${d}_${period}`,
        filename: `forecast_${y}${m}${d}_${period}.json`
    };
}

function pruneOldForecasts(dirPath, maxFiles = 5) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath)
        .filter(f => /^forecast_\d{8}_(am|pm)\.json$/.test(f))
        .sort()
        .reverse();
        
    if (files.length > maxFiles) {
        const toDelete = files.slice(maxFiles);
        for (const file of toDelete) {
            fs.unlinkSync(path.join(dirPath, file));
            console.log(`Eliminado pronóstico antiguo: ${file}`);
        }
    }
}

if (require.main === module) {
    fetchAemet().catch(e => {
        console.error('El script de AEMET falló:', e);
        process.exit(1);
    });
}

module.exports = {
    fetchAemet,
    getMadridSlot,
    pruneOldForecasts
};
