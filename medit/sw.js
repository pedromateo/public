const CACHE_NAME = 'medit-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/audio.js',
  './js/voice.js',
  './js/data.js',
  './js/storage.js',
  './js/icons.js',
  './js/app.js',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './audio/voice/zen_inicio.mp3',
  './audio/voice/zen_cierre.mp3',
  './audio/voice/resp_inhala.mp3',
  './audio/voice/resp_inhala_extra.mp3',
  './audio/voice/resp_sosten.mp3',
  './audio/voice/resp_exhala.mp3',
  './audio/voice/resp_vacio.mp3',
  './audio/voice/stop_s.mp3',
  './audio/voice/stop_t.mp3',
  './audio/voice/stop_o.mp3',
  './audio/voice/stop_p.mp3',
  './audio/voice/zen_fase1.mp3',
  './audio/voice/zen_fase2.mp3',
  './audio/voice/zen_fase3.mp3',
  './audio/voice/zen_fase4.mp3',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigation requests
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
