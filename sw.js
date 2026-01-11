// sw.js
const CACHE_NAME = 'akshara-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
      .then((response) => {
        // ఇక్కడ ఎప్పుడూ ఒక Response ఆబ్జెక్ట్ ఉండేలా చూసుకోవాలి
        return response || new Response('Offline content missing', {
          status: 404,
          statusText: 'Not Found'
        });
      })
  );
});