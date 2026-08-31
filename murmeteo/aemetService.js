class AemetService {
  constructor(config) {
    this.config = config;
  }

  async getForecast() {
    if (this.config.api.mock_mode || this.config.api.api_key === 'DEMO') {
      return this._generateMockData();
    }
    
    // Real AEMET fetching logic would go here.
    // Example:
    // const url = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${this.config.location.municipio_id}/?api_key=${this.config.api.api_key}`;
    // Fetch, parse JSON, handle 429 limits, parse complex AEMET response, map to our format...
    // For now, if mock mode is true or key is missing, fallback to mock.
    throw new Error("AEMET integration requires a valid API key and mock_mode=false");
  }

  // Generates 48 hours of mock data starting from current hour
  async _generateMockData() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate random network failure for testing (5% chance)
    if (Math.random() < 0.05) {
       throw new Error("Simulated network failure");
    }

    const currentHour = new Date().getHours();
    const mockData = {
      location: this.config.location.name,
      current: {
        temp: 0,
        feels_like: 0,
        desc: "Soleado",
        wind: 0,
        temp_min: 15,
        temp_max: 32
      },
      hourly: []
    };

    const conditions = [
      { desc: "Despejado", icon: "☀️" },
      { desc: "Poco nuboso", icon: "🌤️" },
      { desc: "Nuboso", icon: "☁️" },
      { desc: "Lluvia débil", icon: "🌦️" },
      { desc: "Lluvia", icon: "🌧️" }
    ];

    for (let i = 0; i < 48; i++) {
      let d = new Date();
      d.setHours(currentHour + i);
      let h = d.getHours();
      
      // Simulate diurnal cycle
      let baseTemp = 22 + Math.sin((h - 8) / 24 * Math.PI * 2) * 10; 
      
      // Add some random variation
      let temp = Math.round(baseTemp + (Math.random() * 2 - 1));
      
      let precip = 0;
      let windSpeed = Math.floor(Math.random() * 20); // 0-19
      let windGust = windSpeed + Math.floor(Math.random() * 10);
      
      // Make some hours rain
      if (Math.random() < 0.15) {
        precip = (Math.random() * 3).toFixed(1);
      }
      
      // Determine condition icon
      let condIndex = 0;
      if (precip > 0.5) condIndex = 4;
      else if (precip > 0) condIndex = 3;
      else if (Math.random() < 0.2) condIndex = 2;
      else if (Math.random() < 0.3) condIndex = 1;
      
      // Night icons
      let icon = conditions[condIndex].icon;
      if (h >= 21 || h <= 6) {
        if (condIndex === 0) icon = "🌙";
        if (condIndex === 1) icon = "☁️";
      }

      mockData.hourly.push({
        date: d,
        hour: h,
        temp: temp,
        desc: conditions[condIndex].desc,
        icon: icon,
        precip: parseFloat(precip),
        windSpeed: windSpeed,
        windGust: windGust
      });
    }

    // Populate current summary using first hour
    const first = mockData.hourly[0];
    mockData.current.temp = first.temp;
    mockData.current.feels_like = first.temp + 1; // Simplification
    mockData.current.desc = first.desc;
    mockData.current.wind = first.windSpeed;
    
    // Compute min max from next 24h
    let temps24h = mockData.hourly.slice(0, 24).map(h => h.temp);
    mockData.current.temp_min = Math.min(...temps24h);
    mockData.current.temp_max = Math.max(...temps24h);

    return mockData;
  }
}
window.AemetService = AemetService;
