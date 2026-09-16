class AemetService {
  constructor(config) {
    this.config = config;
  }

  static getCandidateForecastFiles(count = 5, now = new Date()) {
    const candidates = [];
    const getParts = (d) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false
      }).formatToParts(d);
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month').value;
      const dStr = parts.find(p => p.type === 'day').value;
      const rawHour = parseInt(parts.find(p => p.type === 'hour').value, 10);
      const hour = rawHour === 24 ? 0 : rawHour;
      return { y, m, d: dStr, hour };
    };

    const initial = getParts(now);
    let currentIsPm = initial.hour >= 12;
    let currentDate = new Date(Date.UTC(parseInt(initial.y, 10), parseInt(initial.m, 10) - 1, parseInt(initial.d, 10), 12, 0, 0));

    for (let i = 0; i < count; i++) {
      const y = currentDate.getUTCFullYear();
      const m = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getUTCDate()).padStart(2, '0');
      const period = currentIsPm ? 'pm' : 'am';
      candidates.push(`forecast_${y}${m}${d}_${period}.json`);

      if (currentIsPm) {
        currentIsPm = false;
      } else {
        currentIsPm = true;
        currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      }
    }
    return candidates;
  }

  async getForecast() {
    // 1. Intentar cargar los archivos estáticos rotativos (forecasts/forecast_YYYYMMDD_xx.json)
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const candidates = AemetService.getCandidateForecastFiles(5);
      const cacheBuster = Date.now();

      for (const filename of candidates) {
        try {
          const res = await fetch(`./forecasts/${filename}?t=${cacheBuster}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          if (res.ok) {
            const lastModified = res.headers.get('last-modified');
            const data = await res.json();
            return this._parseAemetResponse(data, lastModified);
          }
        } catch (e) {
          // Continuar con el siguiente candidato si hay error de red o 404
        }
      }

      // Fallback a forecast.json tradicional en la raíz si ninguno de los rotativos responde
      try {
        const res = await fetch(`./forecast.json?t=${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (res.ok) {
          const lastModified = res.headers.get('last-modified');
          const data = await res.json();
          return this._parseAemetResponse(data, lastModified);
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
  _parseAemetResponse(rawData, fileCreatedAt) {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error("Formato de respuesta de AEMET no reconocido");
    }

    const root = rawData[0];
    const dias = root.prediccion?.dia || [];
    const locationName = root.nombre || this.config.location.name || "Murcia";
    
    // Extraer la hora exacta almacenada en el fichero (elaborado por AEMET o ficheroCreado)
    let updatedAt = null;
    if (root.elaborado) {
      const match = root.elaborado.match(/T?(\d{1,2}):(\d{2})/);
      if (match) {
        updatedAt = match[1].padStart(2, '0') + ':' + match[2];
      }
    }
    if (!updatedAt && root.ficheroCreado) {
      const match = root.ficheroCreado.match(/T?(\d{1,2}):(\d{2})/);
      if (match) {
        updatedAt = match[1].padStart(2, '0') + ':' + match[2];
      } else {
        const d = new Date(root.ficheroCreado);
        if (!isNaN(d.getTime())) {
          updatedAt = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        }
      }
    }
    if (!updatedAt && fileCreatedAt) {
      const d = new Date(fileCreatedAt);
      if (!isNaN(d.getTime())) {
        updatedAt = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
      }
    }
    
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
      storeValues(d.nieve, 'nieve');

      // AEMET OpenData puede devolver viento y racha en vientoAndRachaMax con múltiples entradas por periodo
      // (una entrada con 'velocidad' y otra con 'value' para la racha máxima), o en arrays separados (viento, rachaMax).
      if (Array.isArray(d.vientoAndRachaMax)) {
        for (const item of d.vientoAndRachaMax) {
          const p = parseInt(item.periodo, 10);
          if (isNaN(p)) continue;
          if (!mapByPeriod[p]) mapByPeriod[p] = {};
          if (item.velocidad !== undefined) {
            mapByPeriod[p].viento = item;
          }
          if (item.value !== undefined || item.rachaMax !== undefined) {
            mapByPeriod[p].racha = item;
          }
        }
      }
      storeValues(d.viento, 'viento');
      storeValues(d.rachaMax, 'racha');

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
        if (dataHour.viento) {
          const vel = Array.isArray(dataHour.viento.velocidad) ? dataHour.viento.velocidad[0] : dataHour.viento.velocidad;
          windSpeed = vel !== undefined && vel !== "" ? parseInt(vel, 10) || 0 : 0;
        }
        if (dataHour.racha) {
          const rawRacha = dataHour.racha.value !== undefined ? dataHour.racha.value : dataHour.racha.rachaMax;
          const rachaVal = Array.isArray(rawRacha) ? rawRacha[0] : rawRacha;
          windGust = rachaVal !== undefined && rachaVal !== "" ? parseInt(rachaVal, 10) || windSpeed : windSpeed;
        } else {
          windGust = windSpeed;
        }
        if (windGust < windSpeed) {
          windGust = windSpeed;
        }

        // Condition, icon & dynamic background image
        const cielo = dataHour.cielo || {};
        const { desc, icon, bgImage } = this._resolveCondition(cielo, h, precip, d.orto, d.ocaso, windGust);

        hourlyList.push({
          date: itemDate,
          hour: h,
          temp: temp,
          feels_like: feelsLike,
          desc: desc,
          icon: icon,
          bgImage: bgImage,
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
      updatedAt: updatedAt,
      current: {
        temp: first.temp,
        feels_like: first.feels_like,
        desc: first.desc,
        icon: first.icon,
        bgImage: first.bgImage,
        wind: first.windSpeed,
        windGust: first.windGust,
        temp_min: temps24h.length > 0 ? Math.min(...temps24h) : first.temp,
        temp_max: temps24h.length > 0 ? Math.max(...temps24h) : first.temp,
        orto: todayDia.orto || "07:35",
        ocaso: todayDia.ocaso || "20:30"
      },
      hourly: hourlyList
    };
  }

  // Parse HH:MM to decimal hour
  _parseTime(timeStr, fallbackHour) {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return fallbackHour;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return fallbackHour;
    return h + m / 60;
  }

  // Check whether it is night considering orto, ocaso and AEMET code
  _isNight(hour, orto = "07:35", ocaso = "20:30", codeVal = "") {
    if (typeof codeVal === 'string' && codeVal.endsWith('n')) {
      return true;
    }
    const ortoDec = this._parseTime(orto, 7.58);
    const ocasoDec = this._parseTime(ocaso, 20.5);
    return hour < (ortoDec - 0.5) || hour >= (ocasoDec + 0.5);
  }

  // Check whether current hour is in dawn/dusk twilight window
  _isTwilight(hour, orto = "07:35", ocaso = "20:30") {
    const ortoDec = this._parseTime(orto, 7.58);
    const ocasoDec = this._parseTime(ocaso, 20.5);
    return Math.abs(hour - ortoDec) <= 0.75 || Math.abs(hour - ocasoDec) <= 0.75;
  }

  // Resolves the best-matching card background image from the 19 available illustrations
  _resolveCardBackground({ val = "", desc = "", hour = 12, orto = "07:35", ocaso = "20:30", windGust = 0 }) {
    const isNight = this._isNight(hour, orto, ocaso, val);
    const isTwilight = !isNight && this._isTwilight(hour, orto, ocaso);
    const cleanVal = typeof val === 'string' ? val.replace('n', '') : String(val);
    const lower = (desc || "").toLowerCase();

    // 1. Calima / Polvo en suspensión (Fenómeno típico en la Región de Murcia)
    if (lower.includes("calima") || lower.includes("polvo")) {
      return isNight ? "19_calima_noche" : "18_calima_dia";
    }

    // 2. Tormenta (Códigos 51-54, 61-64 o descripción con tormenta)
    if (cleanVal.startsWith("51") || cleanVal.startsWith("52") || cleanVal.startsWith("53") || cleanVal.startsWith("54") ||
        cleanVal.startsWith("61") || cleanVal.startsWith("62") || cleanVal.startsWith("63") || cleanVal.startsWith("64") ||
        lower.includes("tormenta")) {
      return isNight ? "14_tormenta_noche" : "07_tormenta";
    }

    // 3. Nieve (Códigos 33-36, 71-74 o descripción con nieve)
    if (cleanVal.startsWith("33") || cleanVal.startsWith("34") || cleanVal.startsWith("35") || cleanVal.startsWith("36") ||
        cleanVal.startsWith("71") || cleanVal.startsWith("72") || cleanVal.startsWith("73") || cleanVal.startsWith("74") ||
        lower.includes("nieve")) {
      return isNight ? "17_nieve_noche" : "10_nieve";
    }

    // 4. Lluvia / Chubascos (Códigos 23-26, 43-46 o descripción con lluvia/chubasco)
    if (cleanVal.startsWith("23") || cleanVal.startsWith("24") || cleanVal.startsWith("25") || cleanVal.startsWith("26") ||
        cleanVal.startsWith("43") || cleanVal.startsWith("44") || cleanVal.startsWith("45") || cleanVal.startsWith("46") ||
        lower.includes("lluvia") || lower.includes("chubasco") || lower.includes("llovizna")) {
      return isNight ? "13_lluvia_noche" : "06_lluvia";
    }

    // 5. Niebla / Bruma (Códigos 81/82 o descripción con niebla/bruma)
    if (cleanVal === "81" || cleanVal === "82" || lower.includes("niebla") || lower.includes("bruma")) {
      return isNight ? "15_niebla_noche" : "08_niebla";
    }

    // 6. Viento fuerte / rachas destacadas (>= 50 km/h o descripción de viento)
    if (windGust >= 50 || lower.includes("viento")) {
      return isNight ? "16_viento_noche" : "09_viento";
    }

    // 7. Atardecer / Amanecer (Ventana crepuscular con cielos mayormente despejados)
    if (isTwilight && (cleanVal === "11" || cleanVal === "12" || cleanVal === "13" || cleanVal === "" || lower.includes("despejado") || lower.includes("poco nuboso"))) {
      return "11_atardecer_amanecer";
    }

    // 8. Muy nublado / Cubierto (Códigos 14-17 o descripción con cubierto/nublado)
    if (cleanVal.startsWith("14") || cleanVal.startsWith("15") || cleanVal.startsWith("16") || cleanVal.startsWith("17") ||
        lower.includes("cubierto") || lower.includes("muy nuboso") || lower === "nublado" || lower === "nuboso") {
      return isNight ? "12_nublado_noche" : "05_nublado";
    }

    // 9. Parcialmente nublado / Intervalos nubosos (Códigos 12, 13 o descripción)
    if (cleanVal === "12" || cleanVal === "13" || lower.includes("intervalos") || lower.includes("poco nuboso") || lower.includes("parcialmente")) {
      return isNight ? "04_parcialmente_nublado_noche" : "03_parcialmente_nublado_dia";
    }

    // 10. Despejado por defecto
    return isNight ? "02_despejado_noche" : "01_despejado_dia";
  }

  // Resolve condition description, icon and background image
  _resolveCondition(cielo, hour, precip, orto = "07:35", ocaso = "20:30", windGust = 0) {
    const val = cielo.value || "";
    let desc = cielo.descripcion || "Despejado";

    if (desc) {
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    const isNight = this._isNight(hour, orto, ocaso, val);
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
      } else if (lower.includes("niebla") || lower.includes("bruma") || lower.includes("calima") || lower.includes("polvo")) {
        icon = "🌫️";
      } else {
        icon = isNight ? "🌙" : "☀️";
      }
    }

    const bgImage = this._resolveCardBackground({ val, desc, hour, orto, ocaso, windGust });

    return { desc, icon, bgImage };
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

    const today = data.daily;
    const formatTime = (isoStr) => {
      if (!isoStr) return "--:--";
      const d = new Date(isoStr);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const sunriseStr = today.sunrise?.[0] ? formatTime(today.sunrise[0]) : "07:35";
    const sunsetStr = today.sunset?.[0] ? formatTime(today.sunset[0]) : "20:30";

    for (let i = 0; i < data.hourly.time.length; i++) {
      const dt = new Date(data.hourly.time[i]);
      if (dt.getTime() < currentHourTime - 3600000) continue; // Skip past hours
      if (hourlyList.length >= 56) break; // Limit to full AEMET window (56h)
      
      const hour = dt.getHours();
      const temp = Math.round(data.hourly.temperature_2m[i]);
      const precip = data.hourly.precipitation[i] || 0;
      const desc = codeToDesc(data.hourly.weather_code[i]);
      const windSpeed = Math.round(data.hourly.wind_speed_10m[i]);
      const windGust = Math.round(data.hourly.wind_gusts_10m[i]);
      
      const { icon, bgImage } = this._resolveCondition(
        { descripcion: desc, value: "" },
        hour,
        precip,
        sunriseStr,
        sunsetStr,
        windGust
      );
      
      hourlyList.push({
        date: dt,
        hour: hour,
        temp: temp,
        feels_like: Math.round(data.hourly.apparent_temperature[i]),
        desc: desc,
        icon: icon,
        bgImage: bgImage,
        precip: precip,
        windSpeed: windSpeed,
        windGust: windGust
      });
    }

    const first = hourlyList[0];

    return {
      location: this.config.location?.name || "Murcia",
      updatedAt: new Date().toISOString(),
      current: {
        temp: first.temp,
        feels_like: first.feels_like,
        desc: first.desc,
        icon: first.icon,
        bgImage: first.bgImage,
        wind: first.windSpeed,
        windGust: first.windGust,
        temp_min: Math.round(today.temperature_2m_min[0]),
        temp_max: Math.round(today.temperature_2m_max[0]),
        orto: sunriseStr,
        ocaso: sunsetStr
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
      updatedAt: new Date().toISOString(),
      current: {
        temp: 0,
        feels_like: 0,
        desc: "Despejado",
        icon: "☀️",
        bgImage: "01_despejado_dia",
        wind: 0,
        windGust: 0,
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
      
      const { desc: mDesc, icon: mIcon, bgImage: mBgImage } = this._resolveCondition(
        { descripcion: conditions[condIndex].desc, value: "" },
        h,
        precip,
        "07:34",
        "20:32",
        windGust
      );

      mockData.hourly.push({
        date: d,
        hour: h,
        temp: temp,
        feels_like: temp >= 30 ? temp + 2 : temp + 1,
        desc: mDesc,
        icon: mIcon,
        bgImage: mBgImage,
        precip: precip,
        windSpeed: windSpeed,
        windGust: windGust
      });
    }

    const first = mockData.hourly[0];
    mockData.current.temp = first.temp;
    mockData.current.feels_like = first.feels_like;
    mockData.current.desc = first.desc;
    mockData.current.icon = first.icon;
    mockData.current.bgImage = first.bgImage;
    mockData.current.wind = first.windSpeed;
    mockData.current.windGust = first.windGust;
    
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
