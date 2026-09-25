// Sistema centralizado de SVG limpios, vectoriales y consistentes
const SVG_ICONS = {
  sun: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="#f59e0b"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  sunCloud: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="3.2" fill="#f59e0b"/><path d="M9 3.5V5M3.5 9H5M5.1 5.1l1.1 1.1M12.9 5.1l-1.1 1.1" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/><path d="M8 18h8a3.5 3.5 0 0 0 0-7 5.2 5.2 0 0 0-9.8 1.5A3 3 0 0 0 8 18z" fill="#94a3b8" stroke="#fff" stroke-width="1"/></svg>`,
  partlyCloudy: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="3" fill="#f59e0b"/><path d="M8 3v1.5M3 8h1.5M4.5 4.5l1 1" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.8A3.5 3.5 0 0 0 7 18z" fill="#94a3b8"/></svg>`,
  cloud: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6.5 18h11a4.5 4.5 0 0 0 0-9 6.5 6.5 0 0 0-12.8 1.8A4 4 0 0 0 6.5 18z" fill="#94a3b8"/></svg>`,
  fog: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"><path d="M4 10h16M3 14h18M6 18h12"/></svg>`,
  drizzle: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.8A3.5 3.5 0 0 0 7 14z" fill="#94a3b8"/><path d="M8 17l-1 2m5-2l-1 2m5-2l-1 2" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>`,
  rain: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 13h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.8A3.5 3.5 0 0 0 7 13z" fill="#64748b"/><path d="M7 16l-1.5 3.5m5-3.5l-1.5 3.5m5-3.5l-1.5 3.5" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  snow: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 13h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.8A3.5 3.5 0 0 0 7 13z" fill="#94a3b8"/><g stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"><path d="M8 17v3m-1.5-1.5l3-3m0 3l-3-3"/><path d="M16 17v3m-1.5-1.5l3-3m0 3l-3-3"/></g></svg>`,
  storm: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 12h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.8A3.5 3.5 0 0 0 7 12z" fill="#475569"/><polygon points="12,12 8.5,17 12,17 10.5,22 16,15.5 13,15.5" fill="#f59e0b"/></svg>`,
  wind: `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
  hot: `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2c1.5 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2.5-5 4-8z" fill="#ef4444"/><circle cx="12" cy="11.5" r="1.8" fill="#fef08a"/></svg>`,
  cold: `<svg class="icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2.5" fill="#06b6d4"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/></svg>`,
  thermometer: `<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`,
  drop: `<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  umbrella: `<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12A10 10 0 0 0 2 12h20z"/><path d="M12 12v7a2 2 0 0 0 4 0"/><path d="M12 2v2"/></svg>`,
  sunCycle: `<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3m-7.07.93l2.12 2.12M19.07 5.93l-2.12 2.12M2 16h20M7 16a5 5 0 0 1 10 0"/></svg>`,
  themeSun: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  themeMoon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  moon: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#facc15" stroke="#eab308" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  moonCloud: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none"><g transform="translate(5, -2) scale(0.65)"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#facc15" stroke="#eab308" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.8A3.5 3.5 0 0 0 7 18z" fill="#94a3b8"/></svg>`,
  unknown: `<svg class="icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0 3.5h.01"/></svg>`
};

const lugares = {
  murcia: { nombre: "Murcia", lat: 37.9833, lon: -1.1333 },
  pozo: { nombre: "Pozo del Esparto", lat: 37.2750, lon: -1.6880 },
  puerto: { nombre: "Puerto Lumbreras", lat: 37.5630, lon: -1.8090 }
};

const codes = {
  0: [SVG_ICONS.sun, "Despejado"],
  1: [SVG_ICONS.sunCloud, "Principalmente despejado"],
  2: [SVG_ICONS.partlyCloudy, "Parcialmente nublado"],
  3: [SVG_ICONS.cloud, "Nublado"],
  45: [SVG_ICONS.fog, "Niebla"],
  48: [SVG_ICONS.fog, "Niebla con escarcha"],
  51: [SVG_ICONS.drizzle, "Llovizna ligera"],
  53: [SVG_ICONS.drizzle, "Llovizna moderada"],
  55: [SVG_ICONS.rain, "Llovizna intensa"],
  56: [SVG_ICONS.rain, "Llovizna helada ligera"],
  57: [SVG_ICONS.rain, "Llovizna helada intensa"],
  61: [SVG_ICONS.drizzle, "Lluvia ligera"],
  63: [SVG_ICONS.rain, "Lluvia moderada"],
  65: [SVG_ICONS.rain, "Lluvia intensa"],
  66: [SVG_ICONS.rain, "Lluvia helada ligera"],
  67: [SVG_ICONS.rain, "Lluvia helada intensa"],
  71: [SVG_ICONS.snow, "Nieve ligera"],
  73: [SVG_ICONS.snow, "Nieve moderada"],
  75: [SVG_ICONS.snow, "Nieve intensa"],
  77: [SVG_ICONS.snow, "Granos de nieve"],
  80: [SVG_ICONS.drizzle, "Chubascos ligeros"],
  81: [SVG_ICONS.rain, "Chubascos moderados"],
  82: [SVG_ICONS.storm, "Chubascos fuertes"],
  85: [SVG_ICONS.snow, "Chubascos de nieve ligeros"],
  86: [SVG_ICONS.snow, "Chubascos de nieve fuertes"],
  95: [SVG_ICONS.storm, "Tormenta"],
  96: [SVG_ICONS.storm, "Tormenta con granizo"],
  99: [SVG_ICONS.storm, "Tormenta fuerte"]
};

const info = (c, isDay = 1) => {
  if (isDay === 0) {
    if (c === 0) return [SVG_ICONS.moon, "Despejado"];
    if (c === 1) return [SVG_ICONS.moonCloud, "Principalmente despejado"];
    if (c === 2) return [SVG_ICONS.moonCloud, "Parcialmente nublado"];
  }
  return codes[c] || [SVG_ICONS.unknown, "Desconocido"];
};
const hour = s => new Date(s).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const day = s => new Date(s + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
const r1 = x => Math.round(x * 10) / 10;


function next24(d) {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 86400000);
  const a = [];
  for (let i = 0; i < d.hourly.time.length; i++) {
    const t = new Date(d.hourly.time[i]);
    if (t >= start && t < end) {
      a.push({
        time: d.hourly.time[i],
        temp: d.hourly.temperature_2m[i],
        rain: d.hourly.precipitation[i] || 0,
        prob: d.hourly.precipitation_probability?.[i] || 0,
        wind: d.hourly.wind_speed_10m[i] || 0,
        code: d.hourly.weather_code[i],
        isDay: d.hourly.is_day ? d.hourly.is_day[i] : 1
      });
    }
  }
  return a.slice(0, 24);
}

function severity(a, b) {
  const score = c => (c >= 95 ? 7 : c >= 80 ? 6 : c >= 60 ? 5 : c >= 50 ? 4 : c >= 45 ? 3 : c >= 3 ? 2 : 1);
  return score(b) > score(a) ? b : a;
}

function pairs(a) {
  const out = [];
  for (let i = 0; i < a.length; i += 2) {
    const x = a[i];
    const y = a[i + 1] || x;
    out.push({
      time: x.time,
      temp: Math.round((x.temp + y.temp) / 2),
      rain: r1(x.rain + y.rain),
      prob: Math.max(x.prob, y.prob),
      wind: Math.max(x.wind, y.wind),
      code: severity(x.code, y.code),
      isDay: x.isDay !== undefined ? x.isDay : 1
    });
  }
  return out;
}

function renderSummary(a) {
  const el = document.getElementById("summary");
  if (!el) return;
  if (!a.length) {
    el.innerHTML = "<div class='loading'>Sin datos.</div>";
    return;
  }
  const max = Math.max(...a.map(x => x.temp));
  const min = Math.min(...a.map(x => x.temp));
  const rain = a.reduce((s, x) => s + x.rain, 0);
  const prob = Math.max(...a.map(x => x.prob));
  const wind = Math.max(...a.map(x => x.wind));

  const maxClass = max >= 30 ? "temp-hot" : "";
  const minClass = min <= 10 ? "temp-cold" : "";
  const windWarning = wind > 20 ? `<span class="compact-subval" style="color:#0284c7">(&gt;20 km/h)</span>` : "";

  el.innerHTML = `
    <div class="compact-metric">
      <span class="compact-icon">${SVG_ICONS.thermometer}</span>
      <div class="compact-text">
        <div class="compact-label">Temp. máx / mín</div>
        <div class="compact-value">
          <span class="${maxClass}">${Math.round(max)}°</span>
          <span class="temp-separator">/</span>
          <span class="${minClass}">${Math.round(min)}°</span>
        </div>
      </div>
    </div>
    <div class="compact-metric">
      <span class="compact-icon">${SVG_ICONS.wind}</span>
      <div class="compact-text">
        <div class="compact-label">Viento máximo</div>
        <div class="compact-value">
          ${Math.round(wind)} km/h ${windWarning}
        </div>
      </div>
    </div>
    <div class="compact-metric">
      <span class="compact-icon">${SVG_ICONS.drop}</span>
      <div class="compact-text">
        <div class="compact-label">Lluvia acumulada</div>
        <div class="compact-value">
          ${rain.toFixed(1)} mm
        </div>
      </div>
    </div>
    <div class="compact-metric">
      <span class="compact-icon">${SVG_ICONS.umbrella}</span>
      <div class="compact-text">
        <div class="compact-label">Prob. de lluvia</div>
        <div class="compact-value">
          ${Math.round(prob)}%
        </div>
      </div>
    </div>
  `;
}

function renderForecast(d) {
  const h = d.hourly, daily = d.daily, a = next24(d);
  renderSummary(a);

  const start = new Date(a[0]?.time || h.time[0]);
  const startDay = h.time[0].slice(0, 10);
  const groups = {};

  for (let i = 0; i < h.time.length; i++) {
    const t = new Date(h.time[i]);
    const date = h.time[i].slice(0, 10);
    if (t < start) continue;
    (groups[date] ??= []).push({
      time: h.time[i],
      temp: h.temperature_2m[i],
      rain: h.precipitation[i] || 0,
      prob: h.precipitation_probability?.[i] || 0,
      wind: h.wind_speed_10m[i] || 0,
      code: h.weather_code[i],
      isDay: h.is_day ? h.is_day[i] : 1
    });
  }

  const di = {};
  daily.time.forEach((x, i) => (di[x] = i));

  let out = "";
  Object.entries(groups).forEach(([date, rows]) => {
    if (date === startDay) {
      rows = rows.filter(x => new Date(x.time) >= start);
    }
    if (!rows.length) return;

    const z = daily;
    const idx = di[date] ?? 0;
    const pr = pairs(rows);

    const sunriseStr = z.sunrise?.[idx] ? hour(z.sunrise[idx]) : "--:--";
    const sunsetStr = z.sunset?.[idx] ? hour(z.sunset[idx]) : "--:--";
    const rainSum = Number(z.precipitation_sum[idx] || 0).toFixed(1);
    const rainProb = Math.round(z.precipitation_probability_max?.[idx] || 0);

    out += `<section style="margin-bottom:18px"><div class="banner"><div class="dayhead"><div class="dayname-wrap"><span class="dayname">${day(date)}</span></div><div class="daystats"><span class="stat-pill" title="Orto y ocaso (salida / puesta)">${SVG_ICONS.sunCycle} ${sunriseStr} / ${sunsetStr}</span> <span class="stat-pill">${SVG_ICONS.thermometer} ${Math.round(z.temperature_2m_max[idx])}° / ${Math.round(z.temperature_2m_min[idx])}°</span> <span class="stat-pill">${SVG_ICONS.drop} ${rainSum} mm / ${rainProb}%</span> <span class="stat-pill">${SVG_ICONS.wind} ${Math.round(z.wind_speed_10m_max?.[idx] || 0)} km/h</span></div></div></div>
    <div class="tablewrap"><table><thead><tr><th>Hora</th><th>Estado</th><th>Temp.</th><th>Avisos</th></tr></thead><tbody>`;

    pr.forEach(x => {
      const ci = info(x.code, x.isDay);
      const badges = [];

      // Lluvia relevante: más de 0.1 mm
      if (x.rain > 0.1) {
        const probText = x.prob ? ` (${Math.round(x.prob)}%)` : "";
        badges.push(`<span class="badge badge-rain">${SVG_ICONS.drop} ${x.rain.toFixed(1)} mm${probText}</span>`);
      }

      // Viento relevante: más de 15 km/h
      if (x.wind > 15) {
        badges.push(`<span class="badge badge-wind">${SVG_ICONS.wind} ${Math.round(x.wind)} km/h</span>`);
      }

      // Avisos por fenómenos especiales (tormenta, nieve, niebla)
      if (x.code >= 95) {
        badges.push(`<span class="badge badge-storm">${SVG_ICONS.storm} Tormenta</span>`);
      } else if ((x.code >= 71 && x.code <= 77) || x.code === 85 || x.code === 86) {
        badges.push(`<span class="badge badge-snow">${SVG_ICONS.snow} Nieve</span>`);
      } else if (x.code === 45 || x.code === 48) {
        badges.push(`<span class="badge badge-fog">${SVG_ICONS.fog} Niebla</span>`);
      }

      // Color de temperatura: >= 30 rojo y negrita, <= 10 azul y negrita
      let tempClass = "temp";
      if (x.temp >= 30) {
        tempClass += " temp-hot";
      } else if (x.temp <= 10) {
        tempClass += " temp-cold";
      }

      const badgesHtml = badges.length
        ? `<div class="badges">${badges.join("")}</div>`
        : `<span class="empty-badge">—</span>`;

      out += `<tr><td class="hour">${hour(x.time)}</td><td><span class="weather-cell" title="${ci[1]}">${ci[0]}</span></td><td class="${tempClass}">${x.temp}°</td><td>${badgesHtml}</td></tr>`;
    });

    out += "</tbody></table></div></section>";
  });

  document.getElementById("forecast").innerHTML = out;
}

// Consulta meteorológica siempre fresca en tiempo real (sin caché)
async function cargar() {
  const loc = lugares[document.getElementById("lugar").value];
  document.getElementById("forecast").innerHTML = "";
  document.getElementById("summary").innerHTML = "<div class='loading'>Cargando previsión…</div>";

  const q = new URLSearchParams({
    latitude: loc.lat,
    longitude: loc.lon,
    hourly: "temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset",
    forecast_days: "7",
    timezone: "Europe/Madrid"
  });

  try {
    // Se fuerza siempre consulta a la red con { cache: 'no-store' }
    const r = await fetch("https://api.open-meteo.com/v1/forecast?" + q, {
      cache: "no-store"
    });
    if (!r.ok) throw new Error("No se pudo obtener la previsión del servidor.");
    const d = await r.json();
    renderForecast(d);
  } catch (e) {
    const msg = navigator.onLine === false
      ? "Sin conexión a internet. Los datos meteorológicos no se almacenan en caché y requieren conexión activa."
      : e.message;
    document.getElementById("summary").innerHTML = `<div class="loading">${msg}</div>`;
  }
}

// Inicialización de componentes y eventos con persistencia de ubicación
const STORAGE_KEY = "elparte_selected_location";
const selectEl = document.getElementById("lugar");

// Recuperar última ciudad guardada si existe y es válida
try {
  const savedLocation = localStorage.getItem(STORAGE_KEY);
  if (savedLocation && lugares[savedLocation]) {
    selectEl.value = savedLocation;
  }
} catch (err) {
  console.warn("No se pudo acceder a localStorage:", err);
}

selectEl.addEventListener("change", () => {
  try {
    localStorage.setItem(STORAGE_KEY, selectEl.value);
  } catch (err) {
    console.warn("No se pudo guardar en localStorage:", err);
  }
  cargar();
});

cargar();

// Gestión de Tema Claro / Oscuro con persistencia
const THEME_KEY = "elparte_theme";
const themeToggleBtn = document.getElementById("themeToggle");
const themeColorMeta = document.getElementById("themeColorMeta");

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = SVG_ICONS.themeSun;
      themeToggleBtn.setAttribute("aria-label", "Activar modo claro");
      themeToggleBtn.setAttribute("title", "Activar modo claro");
    }
    if (themeColorMeta) themeColorMeta.setAttribute("content", "#0b1120");
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = SVG_ICONS.themeMoon;
      themeToggleBtn.setAttribute("aria-label", "Activar modo oscuro");
      themeToggleBtn.setAttribute("title", "Activar modo oscuro");
    }
    if (themeColorMeta) themeColorMeta.setAttribute("content", "#2563eb");
  }
}

try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme === "dark" || (!savedTheme && prefersDark));
} catch (e) {
  applyTheme(false);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isCurrentlyDark = document.documentElement.getAttribute("data-theme") === "dark";
    const nextDark = !isCurrentlyDark;
    applyTheme(nextDark);
    try {
      localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
    } catch (err) {
      console.warn("No se pudo guardar la preferencia de tema:", err);
    }
  });
}

// Registro de Service Worker para PWA (únicamente para la shell estática)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(reg => {
        console.log("Service Worker registrado con éxito:", reg.scope);
      })
      .catch(err => {
        console.error("Fallo al registrar el Service Worker:", err);
      });
  });
}
