const CACHE_NAME = 'brainfit-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/data.js',
  './js/engine.js',
  './js/games.js',
  './js/ranking.js',
  './js/firebase-config.js',
  './js/main.js',
  './assets/icon.svg',
  './manifest.json',
  './config.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  // Ignorar llamadas a autenticación y Firebase API para evitar interferencias en login
  if (url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
