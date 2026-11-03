// MenuM — sw.js: Service Worker con estrategia Network-First para actualización inmediata de recetas

const CACHE_NAME = 'menum-cache-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/recipes.json',
  './css/style.css',
  './js/data.js',
  './js/theme.js',
  './js/modal-recipe.js',
  './js/filters.js',
  './js/roulette.js',
  './js/app.js',
  './icons/favicon.svg',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

// Instalación: Pre-almacenar en caché los recursos básicos
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Advertencia en cache.addAll:', err);
      });
    })
  );
});

// Activación: Limpieza de cachés antiguas y toma de control inmediata
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('menum-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Estrategia Network-First con Fallback a Caché
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la respuesta de red es válida, actualizar la copia en caché
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si no hay red (offline o error de conexión), recurrir a la caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Para navegación de páginas HTML, devolver index.html
          if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
          // Para recetas JSON en offline
          if (event.request.url.includes('recipes.json')) {
            return caches.match('./data/recipes.json');
          }
        });
      })
  );
});
