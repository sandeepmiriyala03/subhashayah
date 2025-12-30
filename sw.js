const CACHE = 'subhasayah-v1';
const urlsToCache = ['./'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

self.addEventListener('activate', e => {
  self.clients.claim();
});
