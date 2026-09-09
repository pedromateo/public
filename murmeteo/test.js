const fs = require('fs');
const path = require('path');

console.log("Iniciando pruebas unitarias de MurMeteo...");

// 1. Test Config Loading
try {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.assert(config.location.name === "Murcia", "Error: Location is not Murcia");
  console.assert(config.thresholds.heat.min_temp_c === 30, "Error: Heat threshold changed");
  console.log("✅ Configuración JSON válida y leída correctamente.");
} catch(e) {
  console.error("❌ Error leyendo config.json", e);
  process.exit(1);
}

// 2. Test Badge Generation in Application (generateHourBadges from app.js)
const { generateHourBadges } = require('./app.js');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const tConfig = config.thresholds;

console.assert(typeof generateHourBadges === 'function', "Error: generateHourBadges debe exportarse desde app.js");

// 2.1 Test individual badge HTML structures and classes
// Calor (heat-badge)
const testHeatOnly = { temp: 35, precip: 0, windSpeed: 10, windGust: 14 };
const badgesHeat = generateHourBadges(testHeatOnly, tConfig);
console.assert(badgesHeat.length === 1, "Debe haber exactamente 1 badge de calor");
console.assert(badgesHeat[0].includes(`class="badge ${tConfig.heat.badge_class}"`), "Badge debe contener clase heat-badge");
console.assert(badgesHeat[0].includes(tConfig.heat.icon), "Badge debe contener icono SVG de calor");

// Frío (cold-badge)
const testColdOnly = { temp: 5, precip: 0, windSpeed: 8, windGust: 10 };
const badgesCold = generateHourBadges(testColdOnly, tConfig);
console.assert(badgesCold.length === 1, "Debe haber exactamente 1 badge de frío");
console.assert(badgesCold[0].includes(`class="badge ${tConfig.cold.badge_class}"`), "Badge debe contener clase cold-badge");
console.assert(badgesCold[0].includes(tConfig.cold.icon), "Badge debe contener icono SVG de frío");

// Lluvia (rain-badge con texto formateado)
const testRainOnly = { temp: 18, precip: 3.5, windSpeed: 5, windGust: 8 };
const badgesRain = generateHourBadges(testRainOnly, tConfig);
console.assert(badgesRain.length === 1, "Debe haber exactamente 1 badge de lluvia");
console.assert(badgesRain[0].includes(`class="badge ${tConfig.rain.badge_class}"`), "Badge debe contener clase rain-badge");
console.assert(badgesRain[0].includes(tConfig.rain.icon), "Badge debe contener icono SVG de lluvia");
console.assert(badgesRain[0].includes('<span class="badge-text">3.5 mm</span>'), "Badge de lluvia debe mostrar texto '3.5 mm'");

// Viento por velocidad sostenida (wind-badge)
const testWindSpeed = { temp: 22, precip: 0, windSpeed: 21, windGust: 22 };
const badgesWindSpeed = generateHourBadges(testWindSpeed, tConfig);
console.assert(badgesWindSpeed.length === 1, "Debe haber 1 badge de viento");
console.assert(badgesWindSpeed[0].includes(`class="badge ${tConfig.wind.badge_class}"`), "Badge debe contener clase wind-badge");
console.assert(badgesWindSpeed[0].includes(tConfig.wind.icon), "Badge debe contener icono SVG de viento");
console.assert(badgesWindSpeed[0].includes('<span class="badge-text">21 km/h</span>'), "Badge de viento debe mostrar '21 km/h'");

// Viento por racha máxima con viento bajo
const testWindGust = { temp: 22, precip: 0, windSpeed: 12, windGust: 28 };
const badgesWindGust = generateHourBadges(testWindGust, tConfig);
console.assert(badgesWindGust.length === 1, "Racha de 28 km/h debe activar el badge de viento");
console.assert(badgesWindGust[0].includes('<span class="badge-text">Racha 28 km/h</span>'), "Badge activado por racha debe indicar 'Racha 28 km/h'");
console.assert(badgesWindGust[0].includes('title="Viento sostenido: 12 km/h, Racha máxima: 28 km/h"'), "Badge debe tener tooltip explicativo");

// 2.2 Test límites y umbrales estrictos (límites exactos y justo debajo)
// Calor: 29°C no activa, 30°C sí activa
console.assert(generateHourBadges({ temp: 29, precip: 0, windSpeed: 0, windGust: 0 }, tConfig).length === 0, "29°C no debe activar calor");
console.assert(generateHourBadges({ temp: 30, precip: 0, windSpeed: 0, windGust: 0 }, tConfig).length === 1, "30°C debe activar calor");

// Frío: 10°C no activa, 9°C sí activa
console.assert(generateHourBadges({ temp: 10, precip: 0, windSpeed: 0, windGust: 0 }, tConfig).length === 0, "10°C no debe activar frío");
console.assert(generateHourBadges({ temp: 9, precip: 0, windSpeed: 0, windGust: 0 }, tConfig).length === 1, "9°C debe activar frío");

// Lluvia: 0.05 mm no activa, 0.1 mm sí activa
console.assert(generateHourBadges({ temp: 20, precip: 0.05, windSpeed: 0, windGust: 0 }, tConfig).length === 0, "0.05 mm no debe activar lluvia");
console.assert(generateHourBadges({ temp: 20, precip: 0.1, windSpeed: 0, windGust: 0 }, tConfig).length === 1, "0.1 mm debe activar lluvia");

// Viento: 19 km/h con racha de 24 km/h no activa, 20 km/h o racha 25 km/h sí activa
const testWindJustBelow = { temp: 20, precip: 0, windSpeed: 19, windGust: 24 };
console.assert(generateHourBadges(testWindJustBelow, tConfig).length === 0, "Viento 19 km/h y racha 24 km/h no deben activar badge");

const testWindAtSpeedLimit = { temp: 20, precip: 0, windSpeed: 20, windGust: 15 };
console.assert(generateHourBadges(testWindAtSpeedLimit, tConfig).length === 1, "Viento 20 km/h exacto debe activar badge");

const testWindAtGustLimit = { temp: 20, precip: 0, windSpeed: 10, windGust: 25 };
console.assert(generateHourBadges(testWindAtGustLimit, tConfig).length === 1, "Racha 25 km/h exacta debe activar badge");

// 2.3 Test combinaciones simultáneas de badges
// Calor + Lluvia + Viento
const testSummerStorm = { temp: 34, precip: 4.8, windSpeed: 24, windGust: 40 };
const badgesStorm = generateHourBadges(testSummerStorm, tConfig);
console.assert(badgesStorm.length === 3, "Tormenta de verano debe generar 3 badges (calor, lluvia, viento)");
console.assert(badgesStorm.some(b => b.includes(tConfig.heat.badge_class)), "Debe incluir heat-badge");
console.assert(badgesStorm.some(b => b.includes(tConfig.rain.badge_class)), "Debe incluir rain-badge");
console.assert(badgesStorm.some(b => b.includes(tConfig.wind.badge_class)), "Debe incluir wind-badge");

// Frío + Lluvia + Viento
const testWinterGale = { temp: 6, precip: 7.2, windSpeed: 22, windGust: 35 };
const badgesGale = generateHourBadges(testWinterGale, tConfig);
console.assert(badgesGale.length === 3, "Temporal invernal debe generar 3 badges (frío, lluvia, viento)");
console.assert(badgesGale.some(b => b.includes(tConfig.cold.badge_class)), "Debe incluir cold-badge");
console.assert(badgesGale.some(b => b.includes(tConfig.rain.badge_class)), "Debe incluir rain-badge");
console.assert(badgesGale.some(b => b.includes(tConfig.wind.badge_class)), "Debe incluir wind-badge");

// Día templado en calma (0 badges)
const testCalm = { temp: 21, precip: 0, windSpeed: 8, windGust: 12 };
console.assert(generateHourBadges(testCalm, tConfig).length === 0, "Día templado y en calma no debe generar ningún badge");

// 2.4 Test con dataset completo de 24 horas simuladas
const mock24HoursDataset = [
  { hour: 0, temp: 8, precip: 0, windSpeed: 5, windGust: 7, expected: ['cold-badge'] },
  { hour: 1, temp: 8, precip: 0, windSpeed: 4, windGust: 6, expected: ['cold-badge'] },
  { hour: 2, temp: 7, precip: 1.2, windSpeed: 6, windGust: 8, expected: ['cold-badge', 'rain-badge'] },
  { hour: 3, temp: 7, precip: 0.5, windSpeed: 5, windGust: 7, expected: ['cold-badge', 'rain-badge'] },
  { hour: 4, temp: 6, precip: 0, windSpeed: 8, windGust: 10, expected: ['cold-badge'] },
  { hour: 5, temp: 6, precip: 0, windSpeed: 7, windGust: 9, expected: ['cold-badge'] },
  { hour: 6, temp: 9, precip: 0, windSpeed: 10, windGust: 14, expected: ['cold-badge'] },
  { hour: 7, temp: 12, precip: 0, windSpeed: 8, windGust: 11, expected: [] },
  { hour: 8, temp: 15, precip: 0, windSpeed: 11, windGust: 15, expected: [] },
  { hour: 9, temp: 19, precip: 0, windSpeed: 14, windGust: 18, expected: [] },
  { hour: 10, temp: 23, precip: 0, windSpeed: 12, windGust: 16, expected: [] },
  { hour: 11, temp: 27, precip: 0, windSpeed: 15, windGust: 22, expected: [] },
  { hour: 12, temp: 30, precip: 0, windSpeed: 16, windGust: 23, expected: ['heat-badge'] },
  { hour: 13, temp: 32, precip: 0, windSpeed: 18, windGust: 24, expected: ['heat-badge'] },
  { hour: 14, temp: 33, precip: 0, windSpeed: 19, windGust: 26, expected: ['heat-badge', 'wind-badge'] },
  { hour: 15, temp: 35, precip: 0, windSpeed: 21, windGust: 38, expected: ['heat-badge', 'wind-badge'] },
  { hour: 16, temp: 31, precip: 2.8, windSpeed: 24, windGust: 42, expected: ['heat-badge', 'rain-badge', 'wind-badge'] },
  { hour: 17, temp: 28, precip: 5.0, windSpeed: 22, windGust: 35, expected: ['rain-badge', 'wind-badge'] },
  { hour: 18, temp: 25, precip: 0.2, windSpeed: 18, windGust: 25, expected: ['rain-badge', 'wind-badge'] },
  { hour: 19, temp: 22, precip: 0, windSpeed: 15, windGust: 20, expected: [] },
  { hour: 20, temp: 20, precip: 0, windSpeed: 10, windGust: 14, expected: [] },
  { hour: 21, temp: 17, precip: 0, windSpeed: 8, windGust: 11, expected: [] },
  { hour: 22, temp: 15, precip: 0, windSpeed: 7, windGust: 9, expected: [] },
  { hour: 23, temp: 12, precip: 0, windSpeed: 6, windGust: 8, expected: [] }
];

mock24HoursDataset.forEach(h => {
  const resultBadges = generateHourBadges(h, tConfig);
  console.assert(
    resultBadges.length === h.expected.length,
    `Error en hora ${h.hour}:00 - Se esperaban ${h.expected.length} badges, se obtuvieron ${resultBadges.length}`
  );
  h.expected.forEach(expectedClass => {
    const found = resultBadges.some(b => b.includes(expectedClass));
    console.assert(found, `Error en hora ${h.hour}:00 - No se encontró el badge esperado: ${expectedClass}`);
  });
});

console.log("✅ Generación de badges y dataset de prueba de 24h validados correctamente.");

// 3. Test AemetService Mock Mode
const AemetService = require('./aemetService.js');
const service = new AemetService({ ...config, api: { ...config.api, mock_mode: true } });

// 4. Test Madrid Slot Generation & Candidates
const { getMadridSlot, pruneOldForecasts } = require('./fetch-aemet.js');

// Test morning vs afternoon in Madrid timezone
const morningDate = new Date('2026-09-07T08:00:00Z'); // 10:00 CEST (AM)
const afternoonDate = new Date('2026-09-07T14:00:00Z'); // 16:00 CEST (PM)

const morningSlot = getMadridSlot(morningDate);
const afternoonSlot = getMadridSlot(afternoonDate);

console.assert(morningSlot.slot === '20260907_am', `Error en slot matutino: ${morningSlot.slot}`);
console.assert(morningSlot.filename === 'forecast_20260907_am.json', `Error en nombre de archivo matutino: ${morningSlot.filename}`);
console.assert(afternoonSlot.slot === '20260907_pm', `Error en slot vespertino: ${afternoonSlot.slot}`);
console.assert(afternoonSlot.filename === 'forecast_20260907_pm.json', `Error en nombre de archivo vespertino: ${afternoonSlot.filename}`);

const candidates = AemetService.getCandidateForecastFiles(5, afternoonDate);
console.assert(candidates.length === 5, "Error: Deben generarse 5 candidatos");
console.assert(candidates[0] === 'forecast_20260907_pm.json', `Error: Candidato 0 debe ser hoy PM, obtenido: ${candidates[0]}`);
console.assert(candidates[1] === 'forecast_20260907_am.json', `Error: Candidato 1 debe ser hoy AM, obtenido: ${candidates[1]}`);
console.assert(candidates[2] === 'forecast_20260906_pm.json', `Error: Candidato 2 debe ser ayer PM, obtenido: ${candidates[2]}`);
console.assert(candidates[3] === 'forecast_20260906_am.json', `Error: Candidato 3 debe ser ayer AM, obtenido: ${candidates[3]}`);
console.assert(candidates[4] === 'forecast_20260905_pm.json', `Error: Candidato 4 debe ser anteayer PM, obtenido: ${candidates[4]}`);

// 5. Test Pruning Logic
const testDir = path.join(__dirname, '.test_forecasts');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
const dummyFiles = [
  'forecast_20260901_am.json',
  'forecast_20260901_pm.json',
  'forecast_20260902_am.json',
  'forecast_20260902_pm.json',
  'forecast_20260903_am.json',
  'forecast_20260903_pm.json',
  'forecast_20260904_am.json'
];
dummyFiles.forEach(f => fs.writeFileSync(path.join(testDir, f), '{}'));
pruneOldForecasts(testDir, 5);

const remainingFiles = fs.readdirSync(testDir).sort();
console.assert(remainingFiles.length === 5, `Error: Debían quedar 5 archivos, quedaron ${remainingFiles.length}`);
console.assert(!remainingFiles.includes('forecast_20260901_am.json'), "Error: El archivo más antiguo no fue purgado");
console.assert(!remainingFiles.includes('forecast_20260901_pm.json'), "Error: El segundo archivo más antiguo no fue purgado");
console.assert(remainingFiles.includes('forecast_20260904_am.json'), "Error: El archivo más reciente debe conservarse");

// Cleanup test dir
remainingFiles.forEach(f => fs.unlinkSync(path.join(testDir, f)));
fs.rmdirSync(testDir);

console.log("✅ Lógica de slots AM/PM, fallback de candidatos y purga validada correctamente.");

service.getForecast().then(data => {
  console.assert(data.hourly && data.hourly.length === 56, "Error: Deberían generarse 56 horas de mock");
  const temps = data.hourly.map(h => h.temp);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  console.assert(minT >= 8 && maxT <= 35, `Error: Rango de temperaturas fuera de límites (min: ${minT}, max: ${maxT})`);
  console.log(`✅ AemetService mock validado (Rango: ${minT}°C a ${maxT}°C).`);

  // 6. Test AEMET OpenData vientoAndRachaMax parsing
  const mockAemetRaw = [{
    nombre: "Murcia",
    prediccion: {
      dia: [{
        fecha: "2099-01-01T00:00:00",
        temperatura: [{ periodo: "12", value: "22" }],
        estadoCielo: [{ periodo: "12", descripcion: "Despejado", value: "11" }],
        vientoAndRachaMax: [
          { direccion: ["NO"], velocidad: ["18"], periodo: "12" },
          { value: "32", periodo: "12" }
        ]
      }]
    }
  }];
  const parsedReal = service._parseAemetResponse(mockAemetRaw);
  const hour12 = parsedReal.hourly.find(h => h.hour === 12);
  console.assert(hour12 && hour12.windSpeed === 18, `Error parseando velocidad viento: ${hour12?.windSpeed}`);
  console.assert(hour12 && hour12.windGust === 32, `Error parseando racha viento: ${hour12?.windGust}`);
  console.log("✅ Parseo de vientoAndRachaMax de AEMET validado correctamente.");

  console.log("Todas las pruebas pasaron satisfactoriamente.");
}).catch(err => {
  console.error("❌ Error en prueba de AemetService", err);
  process.exit(1);
});
