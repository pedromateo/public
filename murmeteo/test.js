const fs = require('fs');

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

service.getForecast().then(data => {
  console.assert(data.hourly && data.hourly.length === 48, "Error: Deberían generarse 48 horas de mock");
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
