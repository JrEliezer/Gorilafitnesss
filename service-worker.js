const CACHE_NAME = 'gorila-fitness-v2';

const ASSETS_TO_CACHE = [
  './index.html',
  './vestuario.html',
  './css/styles.css',
  './css/vestuario.css',
  './js/script.js',
  './data/products.json',
  './manifest.json',
  './assets/logo.png',
  './offline.html'
];

const CACHE_STRATEGIES = {
  default: 'network-first',
  fonts: 'cache-first',
  images: 'cache-first',
  html: 'network-first'
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
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
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Fonts - cache first
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }));
    return;
  }

  // Assets (images, CSS, JS, JSON) - cache first
  if (pathname.includes('/assets/') || pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.json')) {
    event.respondWith(caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (pathname.includes('/assets/') && pathname.endsWith('.png')) {
          return caches.match('./assets/logo.png');
        }
        return new Response('Not cached', { status: 404 });
      });
    }));
    return;
  }

  // HTML pages - network first with offline fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./offline.html')))
  );
});