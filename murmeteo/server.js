const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const AemetService = require('./aemetService.js');

// 1. Cargar variables de entorno desde .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT, 10) || 8080;

// Cargar configuración base
let baseConfig = {};
try {
  baseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (e) {
  console.error("Error cargando config.json:", e);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Endpoint API seguro: /api/forecast
  if (pathname === '/api/forecast') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    const apiKey = (process.env.AEMET_API_KEY || '').trim();
    const isMock = process.env.MOCK_MODE === 'true' || !apiKey || apiKey === 'DEMO' || apiKey === 'tu_api_key_aqui';

    const serviceConfig = {
      ...baseConfig,
      api: {
        ...baseConfig.api,
        api_key: isMock ? 'DEMO' : apiKey,
        mock_mode: isMock
      },
      location: {
        ...baseConfig.location,
        municipio_id: process.env.MUNICIPIO_ID || baseConfig.location?.municipio_id || '30030'
      }
    };

    const service = new AemetService(serviceConfig);
    try {
      const forecast = await service.getForecast();
      res.writeHead(200);
      res.end(JSON.stringify(forecast));
    } catch (err) {
      console.error("Error obteniendo previsión en el servidor:", err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message || "Error al consultar la previsión" }));
    }
    return;
  }

  // Servir archivos estáticos
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
      }
    } else {
      const headers = { 'Content-Type': contentType };
      // forecast.json nunca debe cachearse: es el dato dinámico principal
      if (safePath.endsWith('forecast.json')) {
        headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      } else if (safePath.endsWith('sw.js') || safePath.endsWith('manifest.json')) {
        // SW y manifest: no-cache para que el navegador revalide siempre
        headers['Cache-Control'] = 'no-cache';
      } else if (ext === '.html' || ext === '.css' || ext === '.js' || ext === '.json') {
        // Resto de estáticos: 1 hora con revalidación
        headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
      }
      res.writeHead(200, headers);
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MurMeteo server iniciado en http://localhost:${PORT}`);
  console.log(`Modo activo: ${process.env.MOCK_MODE === 'true' || !process.env.AEMET_API_KEY || process.env.AEMET_API_KEY === 'tu_api_key_aqui' ? 'Simulado (Mock)' : 'Datos reales AEMET'}`);
});
