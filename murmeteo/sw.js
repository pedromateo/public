const CACHE_NAME = 'murmeteo-static-v3';
const DATA_CACHE_NAME = 'murmeteo-data-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.json',
  './app.js',
  './aemetService.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          return caches.delete(key);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Data API calls (AEMET or mock endpoints)
  if (url.hostname.includes('aemet.es') || url.hostname.includes('open-meteo')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const responseToCache = networkResponse.clone();
          caches.open(DATA_CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(async () => {
          // If network fails, try to return cached data
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
             return cachedResponse;
          }
          throw new Error('Network and cache both failed');
        })
    );
  } else {
    // Static assets
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
