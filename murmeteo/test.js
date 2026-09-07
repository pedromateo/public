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

// 2. Test Badge Logic Simulation
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const tConfig = config.thresholds;
function evaluateBadges(hourData) {
  let badges = [];
  if (hourData.temp >= tConfig.heat.min_temp_c) badges.push(tConfig.heat.icon);
  if (hourData.temp <= tConfig.cold.max_temp_c) badges.push(tConfig.cold.icon);
  if (hourData.precip >= tConfig.rain.min_precip_mm) badges.push(tConfig.rain.icon);
  if (hourData.windSpeed >= tConfig.wind.min_speed_kmh || hourData.windGust >= tConfig.wind.min_gust_kmh) badges.push(tConfig.wind.icon);
  return badges;
}

const mockHour = { temp: 32, precip: 0, windSpeed: 10, windGust: 12 };
const res1 = evaluateBadges(mockHour);
console.assert(res1.includes(tConfig.heat.icon) && res1.length === 1, "Error evaluando calor");

const mockHour2 = { temp: 8, precip: 2.5, windSpeed: 5, windGust: 8 };
const res2 = evaluateBadges(mockHour2);
console.assert(res2.includes(tConfig.cold.icon) && res2.includes(tConfig.rain.icon) && res2.length === 2, "Error evaluando frío + lluvia");

console.log("✅ Lógica condicional de iconos validada correctamente.");

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
  console.log("Todas las pruebas pasaron satisfactoriamente.");
}).catch(err => {
  console.error("❌ Error en prueba de AemetService", err);
  process.exit(1);
});
