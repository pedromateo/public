class AemetService {
  constructor(config) {
    this.config = config;
  }

  async getForecast() {
    // 1. Intentar cargar el archivo estático (forecast.json) generado por GitHub Actions
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      try {
        // Cache-busting para obligar al Service Worker a usar la regla NetworkFirst en lugar de la caché del navegador
        const cacheBuster = Date.now();
        const res = await fetch(`./forecast.json?t=${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (res.ok) {
          const data = await res.json();
          // El archivo forecast.json guarda la respuesta cruda de AEMET
          return this._parseAemetResponse(data);
        }
      } catch (e) {
        console.info("No se encontró forecast.json estático, usando método alternativo.");
      }
    }

    const apiKey = this.config.api?.api_key;
    const isMock = this.config.api?.mock_mode === true;
    const needsFallback = (!apiKey || apiKey === 'DEMO' || apiKey.trim() === '') && !isMock;
    
    if (isMock) {
      return this._generateMockData();
    }

    // Fallback a Open-Meteo (Sin API Key) si estamos en Github Pages sin clave
    if (needsFallback) {
      console.info("Usando Open-Meteo como fallback (No AEMET API Key detectada)");
      return this._fetchOpenMeteoFallback();
    }

    try {
      return await this._fetchAemetData();
    } catch (err) {
      console.error("Error al obtener datos reales de AEMET OpenData:", err);
      throw err;
    }
  }

  // Fetch real forecast from AEMET OpenData API
  async _fetchAemetData() {
    const municipioId = this.config.location.municipio_id || "30030";
    const apiKey = this.config.api.api_key;
    const timeoutMs = this.config.api.timeout_ms || 10000;
    
    const endpointUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${municipioId}/?api_key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Step 1: Request temporary data URL from AEMET OpenData API
      const response = await fetch(endpointUrl, {
        headers: {
          'cache-control': 'no-cache'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`API Key de AEMET inválida o no autorizada (HTTP ${response.status})`);
        } else if (response.status === 429) {
          throw new Error("Límite de peticiones de AEMET OpenData alcanzado (HTTP 429)");
        } else {
          throw new Error(`Error en el servidor de AEMET (HTTP ${response.status})`);
        }
      }

      const meta = await response.json();
      if (meta.estado !== 200 || !meta.datos) {
        throw new Error(meta.descripcion || "Respuesta inválida de AEMET OpenData");
      }

      // Step 2: Fetch actual data from the provided URL
      const dataResponse = await fetch(meta.datos, {
        signal: controller.signal
      });

      if (!dataResponse.ok) {
        throw new Error(`Error al descargar datos de AEMET (HTTP ${dataResponse.status})`);
      }

      const rawData = await dataResponse.json();
      return this._parseAemetResponse(rawData);
    } finally {
      clearTimeout(timer);
    }
  }

  // Parse AEMET OpenData JSON response into MurMeteo forecast model
  _parseAemetResponse(rawData) {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error("Formato de respuesta de AEMET no reconocido");
    }

    const root = rawData[0];
    const dias = root.prediccion?.dia || [];
    const locationName = root.nombre || this.config.location.name || "Murcia";
    
    const now = new Date();
    const currentHourTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();

    const hourlyList = [];

    for (const d of dias) {
      // Format: "YYYY-MM-DDT00:00:00"
      const dateStr = (d.fecha || "").split('T')[0];
      if (!dateStr) continue;
      const [year, month, day] = dateStr.split('-').map(Number);

      const mapByPeriod = {};

      const storeValues = (arr, key) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
          const p = parseInt(item.periodo, 10);
          if (isNaN(p)) continue;
          if (!mapByPeriod[p]) mapByPeriod[p] = {};
          mapByPeriod[p][key] = item;
        }
      };

      storeValues(d.estadoCielo, 'cielo');
      storeValues(d.precipitacion, 'precip');
      storeValues(d.temperatura, 'temp');
      storeValues(d.sensTermica, 'sensTermica');
      storeValues(d.humedadRelativa, 'humedad');
      storeValues(d.vientoAndRachaMax, 'vientoRacha');
      storeValues(d.viento, 'viento');
      storeValues(d.rachaMax, 'racha');
      storeValues(d.nieve, 'nieve');

      for (let h = 0; h < 24; h++) {
        const itemDate = new Date(year, month - 1, day, h);
        
        // Omit hours older than current hour
        if (itemDate.getTime() < currentHourTime) {
          continue;
        }

        const dataHour = mapByPeriod[h];
        if (!dataHour || (dataHour.temp === undefined && dataHour.cielo === undefined && dataHour.precip === undefined)) {
          continue;
        }
        
        // Temperature
        const rawTemp = dataHour.temp?.value;
        const temp = rawTemp !== undefined && rawTemp !== "" ? parseInt(rawTemp, 10) : 0;
        
        // Feels like
        const rawSens = dataHour.sensTermica?.value;
        const feelsLike = rawSens !== undefined && rawSens !== "" ? parseInt(rawSens, 10) : temp;

        // Precipitation
        let precip = 0;
        const rawPrecip = dataHour.precip?.value;
        if (rawPrecip === "Ip") {
          precip = 0.1; // Trace precipitation
        } else if (rawPrecip !== undefined && rawPrecip !== "") {
          precip = parseFloat(rawPrecip) || 0;
        }

        // Wind & gust
        let windSpeed = 0;
        let windGust = 0;
        if (dataHour.vientoRacha) {
          const v = dataHour.vientoRacha;
          const vel = Array.isArray(v.velocidad) ? v.velocidad[0] : v.velocidad;
          windSpeed = vel ? parseInt(vel, 10) || 0 : 0;
          const racha = Array.isArray(v.rachaMax) ? v.rachaMax[0] : v.rachaMax;
          windGust = racha ? parseInt(racha, 10) || windSpeed : windSpeed;
        } else {
          if (dataHour.viento) {
            const vel = Array.isArray(dataHour.viento.velocidad) ? dataHour.viento.velocidad[0] : dataHour.viento.velocidad;
            windSpeed = vel ? parseInt(vel, 10) || 0 : 0;
          }
          if (dataHour.racha) {
            const racha = Array.isArray(dataHour.racha.value) ? dataHour.racha.value[0] : dataHour.racha.value;
            windGust = racha ? parseInt(racha, 10) || windSpeed : windSpeed;
          }
        }

        // Condition & icon
        const cielo = dataHour.cielo || {};
        const { desc, icon } = this._resolveCondition(cielo, h, precip);

        hourlyList.push({
          date: itemDate,
          hour: h,
          temp: temp,
          feels_like: feelsLike,
          desc: desc,
          icon: icon,
          precip: precip,
          windSpeed: windSpeed,
          windGust: windGust
        });
      }
    }

    if (hourlyList.length === 0) {
      throw new Error("AEMET no devolvió horas futuras disponibles");
    }

    const first = hourlyList[0];
    const temps24h = hourlyList.slice(0, 24).map(h => h.temp);
    const todayDia = dias[0] || {};

    return {
      location: locationName,
      current: {
        temp: first.temp,
        feels_like: first.feels_like,
        desc: first.desc,
        wind: first.windSpeed,
        temp_min: temps24h.length > 0 ? Math.min(...temps24h) : first.temp,
        temp_max: temps24h.length > 0 ? Math.max(...temps24h) : first.temp,
        orto: todayDia.orto || "07:35",
        ocaso: todayDia.ocaso || "20:30"
      },
      hourly: hourlyList
    };
  }

  // Resolve condition description and appropriate icon
  _resolveCondition(cielo, hour, precip) {
    const isNight = hour >= 21 || hour <= 6;
    let desc = cielo.descripcion || "Despejado";
    const val = cielo.value || "";

    if (desc) {
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    let icon = isNight ? "🌙" : "☀️";

    if (val.startsWith("11")) {
      icon = isNight ? "🌙" : "☀️";
    } else if (val.startsWith("12") || val.startsWith("13")) {
      icon = isNight ? "☁️" : "🌤️";
    } else if (val.startsWith("14") || val.startsWith("15") || val.startsWith("16") || val.startsWith("17")) {
      icon = "☁️";
    } else if (val.startsWith("23") || val.startsWith("24") || val.startsWith("43") || val.startsWith("44")) {
      icon = "🌦️";
    } else if (val.startsWith("25") || val.startsWith("26") || val.startsWith("45") || val.startsWith("46")) {
      icon = "🌧️";
    } else if (val.startsWith("51") || val.startsWith("52") || val.startsWith("53") || val.startsWith("54") ||
               val.startsWith("61") || val.startsWith("62") || val.startsWith("63") || val.startsWith("64")) {
      icon = "⛈️";
    } else if (val.startsWith("33") || val.startsWith("34") || val.startsWith("35") || val.startsWith("36") ||
               val.startsWith("71") || val.startsWith("72") || val.startsWith("73") || val.startsWith("74")) {
      icon = "🌨️";
    } else if (val.startsWith("81") || val.startsWith("82")) {
      icon = "🌫️";
    } else {
      const lower = (desc || "").toLowerCase();
      if (lower.includes("tormenta")) icon = "⛈️";
      else if (lower.includes("nieve")) icon = "🌨️";
      else if (lower.includes("lluvia") || lower.includes("chubasco")) {
        icon = (lower.includes("débil") || lower.includes("escas") || precip < 1.0) ? "🌦️" : "🌧️";
      } else if (lower.includes("nub") || lower.includes("cubierto")) {
        icon = (lower.includes("poco") || lower.includes("intervalos")) ? (isNight ? "☁️" : "🌤️") : "☁️";
      } else if (lower.includes("niebla") || lower.includes("bruma")) {
        icon = "🌫️";
      } else {
        icon = isNight ? "🌙" : "☀️";
      }
    }

    return { desc, icon };
  }

  // Generates data from Open-Meteo as a free fallback when no AEMET API key is available (e.g., GitHub Pages)
  async _fetchOpenMeteoFallback() {
    // Murcia coords
    const lat = 37.9870;
    const lon = -1.1300;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_gusts_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Europe%2FMadrid`;
    
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error("Error obteniendo datos de Open-Meteo");
    
    const data = await res.json();
    const hourlyList = [];
    
    const currentHourTime = new Date().getTime();
    
    // Mapeo simple de WMO codes a descripciones de AEMET
    const codeToDesc = (code) => {
      if (code === 0) return "Despejado";
      if (code === 1 || code === 2) return "Poco nuboso";
      if (code === 3) return "Cubierto";
      if (code === 45 || code === 48) return "Niebla";
      if (code >= 51 && code <= 55) return "Llovizna";
      if (code >= 61 && code <= 65) return "Lluvia";
      if (code >= 71 && code <= 77) return "Nieve";
      if (code >= 80 && code <= 82) return "Chubasco";
      if (code >= 95) return "Tormenta";
      return "Despejado";
    };

    for (let i = 0; i < data.hourly.time.length; i++) {
      const dt = new Date(data.hourly.time[i]);
      if (dt.getTime() < currentHourTime - 3600000) continue; // Skip past hours
      if (hourlyList.length >= 56) break; // Limit to full AEMET window (56h)
      
      const hour = dt.getHours();
      const temp = Math.round(data.hourly.temperature_2m[i]);
      const precip = data.hourly.precipitation[i] || 0;
      const desc = codeToDesc(data.hourly.weather_code[i]);
      
      const { icon } = this._resolveCondition({ descripcion: desc, value: "" }, hour, precip);
      
      hourlyList.push({
        date: dt,
        hour: hour,
        temp: temp,
        feels_like: Math.round(data.hourly.apparent_temperature[i]),
        desc: desc,
        icon: icon,
        precip: precip,
        windSpeed: Math.round(data.hourly.wind_speed_10m[i]),
        windGust: Math.round(data.hourly.wind_gusts_10m[i])
      });
    }

    const first = hourlyList[0];
    const today = data.daily;
    const formatTime = (isoStr) => {
      if (!isoStr) return "--:--";
      const d = new Date(isoStr);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return {
      location: this.config.location?.name || "Murcia",
      current: {
        temp: first.temp,
        feels_like: first.feels_like,
        desc: first.desc,
        wind: first.windSpeed,
        temp_min: Math.round(today.temperature_2m_min[0]),
        temp_max: Math.round(today.temperature_2m_max[0]),
        orto: formatTime(today.sunrise[0]),
        ocaso: formatTime(today.sunset[0])
      },
      hourly: hourlyList
    };
  }

  // Generates 56 hours of mock data aligned with realistic Murcia AEMET observations
  async _generateMockData() {
    // Simulate slight network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const currentHour = new Date().getHours();
    const mockData = {
      location: this.config.location?.name || "Murcia",
      current: {
        temp: 0,
        feels_like: 0,
        desc: "Despejado",
        wind: 0,
        temp_min: 22,
        temp_max: 35,
        orto: "07:34",
        ocaso: "20:32"
      },
      hourly: []
    };

    const conditions = [
      { desc: "Despejado", icon: "☀️" },
      { desc: "Poco nuboso", icon: "🌤️" },
      { desc: "Nuboso", icon: "☁️" },
      { desc: "Cubierto", icon: "☁️" },
      { desc: "Lluvia débil", icon: "🌦️" }
    ];

    for (let i = 0; i < 56; i++) {
      let d = new Date();
      d.setHours(currentHour + i);
      let h = d.getHours();
      
      // Diurnal cycle for Murcia: min ~22°C around 07:00, max ~35°C around 16:00
      let baseTemp = 28.5 + Math.sin((h - 11.5) / 24 * Math.PI * 2) * 6.5; 
      
      let temp = Math.round(baseTemp + (Math.random() * 2 - 1));
      temp = Math.max(8, Math.min(35, temp));
      
      let precip = 0;
      let windSpeed = Math.floor(Math.random() * 12); // 0-11 km/h
      let windGust = windSpeed + Math.floor(Math.random() * 8);
      
      if (Math.random() < 0.08) {
        precip = parseFloat((Math.random() * 1.5).toFixed(1));
      }
      
      let condIndex = 0;
      if (precip > 0.5) condIndex = 4;
      else if (precip > 0) condIndex = 4;
      else if (Math.random() < 0.15) condIndex = 3;
      else if (Math.random() < 0.25) condIndex = 2;
      else if (Math.random() < 0.35) condIndex = 1;
      
      let icon = conditions[condIndex].icon;
      if (h >= 21 || h <= 6) {
        if (condIndex === 0) icon = "🌙";
        if (condIndex === 1) icon = "☁️";
      }

      mockData.hourly.push({
        date: d,
        hour: h,
        temp: temp,
        feels_like: temp >= 30 ? temp + 2 : temp + 1,
        desc: conditions[condIndex].desc,
        icon: icon,
        precip: precip,
        windSpeed: windSpeed,
        windGust: windGust
      });
    }

    const first = mockData.hourly[0];
    mockData.current.temp = first.temp;
    mockData.current.feels_like = first.feels_like;
    mockData.current.desc = first.desc;
    mockData.current.wind = first.windSpeed;
    
    let temps24h = mockData.hourly.slice(0, 24).map(h => h.temp);
    mockData.current.temp_min = Math.min(...temps24h);
    mockData.current.temp_max = Math.max(...temps24h);
    mockData.current.orto = "07:34";
    mockData.current.ocaso = "20:32";

    return mockData;
  }
}

if (typeof window !== 'undefined') {
  window.AemetService = AemetService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AemetService;
}
