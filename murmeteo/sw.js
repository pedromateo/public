const CACHE_NAME = 'murmeteo-static-v8';
const DATA_CACHE_NAME = 'murmeteo-data-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.json',
  './app.js',
  './aemetService.js',
  './manifest.json',
  './icons/original_1024.png',
  './icons/android/play_store_512.png',
  './icons/android/mipmap-xxxhdpi/ic_launcher.png',
  './icons/android/mipmap-xxhdpi/ic_launcher.png',
  './icons/android/mipmap-xhdpi/ic_launcher.png',
  './icons/android/mipmap-hdpi/ic_launcher.png',
  './icons/android/mipmap-mdpi/ic_launcher.png',
  './icons/ios/Icon-App-60x60@3x.png'
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
  
  // Data API calls (Backend /api/ endpoints, AEMET, Open-Meteo, forecast.json static) -> Network first with data fallback
  if (url.pathname.includes('/api/') || url.hostname.includes('aemet.es') || url.hostname.includes('open-meteo') || url.pathname.endsWith('forecast.json')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network fails, return cached forecast if available
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
             return cachedResponse;
          }
          throw new Error('Network and cache both failed');
        })
    );
  } else {
    // Static assets (Network first for fresh config and scripts, fallback to cache)
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
