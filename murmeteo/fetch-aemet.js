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
    
    const outputPath = path.join(__dirname, 'forecast.json');
    fs.writeFileSync(outputPath, JSON.stringify(forecastData, null, 2));
    console.log('Pronóstico guardado exitosamente en forecast.json');
}

fetchAemet().catch(e => {
    console.error('El script de AEMET falló:', e);
    process.exit(1);
});
