const fs = require('fs');
const path = require('path');

async function fetchAemet() {
    const apiKey = process.env.AEMET_API_KEY;
    const municipio = '30030'; // Murcia
    
    if (!apiKey) {
        console.error('Error: Variable de entorno AEMET_API_KEY no encontrada.');
        process.exit(1);
    }

    console.log('Solicitando URL de datos a AEMET...');
    const metadataUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${municipio}/?api_key=${apiKey}`;
    
    const metaRes = await fetch(metadataUrl, { headers: { 'Accept': 'application/json' } });
    if (!metaRes.ok) throw new Error(`HTTP Error ${metaRes.status} al pedir metadatos`);
    
    const metaData = await metaRes.json();
    if (metaData.estado !== 200) throw new Error(`AEMET Error: ${metaData.descripcion}`);
    
    const dataUrl = metaData.datos;
    console.log('Descargando JSON de pronóstico real...');
    
    const dataRes = await fetch(dataUrl);
    if (!dataRes.ok) throw new Error(`HTTP Error en descarga de datos ${dataRes.status}`);
    
    const forecastData = await dataRes.json();
    
    const outputPath = path.join(__dirname, 'forecast.json');
    fs.writeFileSync(outputPath, JSON.stringify(forecastData, null, 2));
    console.log('Pronóstico guardado exitosamente en forecast.json');
}

fetchAemet().catch(e => {
    console.error('El script de AEMET falló:', e);
    process.exit(1);
});
