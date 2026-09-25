const CACHE_NAME = 'elparte-shell-v13';
const STATIC_SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Instalación: Precarga únicamente los archivos estáticos de la interfaz (App Shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de versiones obsoletas de la caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Gestión de peticiones de red
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // REQUISITO ESTRICTO: NO cachear datos meteorológicos.
  // Cualquier llamada a APIs externas (como open-meteo) o peticiones que no sean GET
  // van DIRECTAMENTE a la red sin pasar por caché ni almacenar respuesta.
  if (url.hostname.includes('open-meteo.com') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para los recursos estáticos propios de la PWA (HTML, CSS, JS, imágenes locales):
  // Estrategia Network-First con fallback a Caché para mantener la app actualizada
  // permitiendo abrir la aplicación como PWA independiente.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          url.origin === self.location.origin
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
