const CACHE_NAME = 'medimind-cache-v1';
const ASSETS = [
  'index.html',
  'medicines.html',
  'add-medicine.html',
  'edit-medicine.html',
  'history.html',
  'css/style.css',
  'js/db.js',
  'js/reminder-service.js',
  'manifest.json',
  'img/icon-192.png',
  'img/icon-512.png'
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
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    })
  );
});
