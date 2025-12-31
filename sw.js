const CACHE_NAME = 'subhasayah-v1';
const FONT_CACHE = 'subhasayah-fonts-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Ramabhadra&display=swap',
  'https://fonts.googleapis.com/css2?family=Gidugu&display=swap',
  'https://fonts.googleapis.com/css2?family=Mandali&display=swap',
  'https://fonts.googleapis.com/css2?family=NTR&display=swap',
  'https://fonts.googleapis.com/css2?family=RaviPrakash&display=swap',
  'https://fonts.googleapis.com/css2?family=Tenali+Ramakrishna&display=swap',
  'https://fonts.googleapis.com/css2?family=Timmana&display=swap',
  'https://fonts.googleapis.com/css2?family=Chathura:wght@100;300;400;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Ramaraja&display=swap',
  'https://fonts.googleapis.com/css2?family=Ponnala&display=swap',
  'https://fonts.googleapis.com/css2?family=Sree+Krushnadevaraya&display=swap',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Merriweather:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Sanskrit&display=swap',
  'https://fonts.googleapis.com/css2?family=Hind:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap'
];

// Install event - cache app shell and fonts
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      }),
      // Cache fonts
      caches.open(FONT_CACHE).then(cache => {
        console.log('[SW] Caching fonts');
        return Promise.all(
          FONT_URLS.map(url => {
            return fetch(url, { mode: 'cors' })
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(err => console.log('[SW] Font cache error:', err));
          })
        );
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== FONT_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Google Fonts requests
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          return response;
        }
        return fetch(request, { mode: 'cors' }).then(fetchResponse => {
          return caches.open(FONT_CACHE).then(cache => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        }).catch(() => {
          console.log('[SW] Font fetch failed, using fallback');
        });
      })
    );
    return;
  }

  // Handle app requests
  event.respondWith(
    caches.match(request).then(response => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Otherwise fetch from network
      return fetch(request).then(fetchResponse => {
        // Don't cache non-successful responses
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type === 'error') {
          return fetchResponse;
        }

        // Cache successful responses (except for images - user uploads)
        if (!request.url.includes('blob:') && !request.url.includes('data:')) {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }

        return fetchResponse;
      }).catch(err => {
        console.log('[SW] Fetch failed:', err);
        
        // Return offline fallback page if available
        return caches.match('./index.html');
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});