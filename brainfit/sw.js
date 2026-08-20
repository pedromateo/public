const CACHE_NAME = 'brainfit-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/data.js',
  './js/engine.js',
  './js/games.js',
  './js/main.js',
  './assets/icon.svg',
  './manifest.json',
  './config.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
