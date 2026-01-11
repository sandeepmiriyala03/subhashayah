const CACHE_NAME = 'akshara-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  // Add other local assets like images/css here
];

// 1. Install Event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // we use cache.add instead of addAll for individual files to prevent 
      // the whole thing failing if one file is missing
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. Fetch Event (The Fix for your Response error)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached file OR fetch from network
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        // Only cache valid successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback if both fail (e.g., offline and not in cache)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // This MUST return a Response object, even if empty
        return new Response('Offline content not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});