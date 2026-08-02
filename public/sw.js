const CACHE_NAME = 'medimind-cache-v1';
const ASSETS = [
  '/',
  '/css/style.css',
  '/js/reminder-service.js',
  '/manifest.json',
  '/img/icon-192.png',
  '/img/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Pre-caching offline assets...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[Service Worker] Activated and running.');
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  // Let the browser handle standard non-GET requests (e.g. POST) natively
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // Return cached response if exists, otherwise fetch from server
      return cachedResponse || fetch(e.request);
    })
  );
});
