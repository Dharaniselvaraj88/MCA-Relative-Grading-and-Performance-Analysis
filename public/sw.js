// Service Worker for CIT Cognitive Portal Offline Capabilities
const CACHE_NAME = 'cit-cognitive-portal-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/cit_logo.svg',
  '/CIT_Cognitive_Portal_Homepage.jpg',
  '/CIT_Cognitive_Portal_Homepage.svg'
];

// Install Event: Cache static shell assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker & Caching Static Shell...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Non-critical error caching initial assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event: Network first, fallback to Cache for assets, ensuring seamless offline test execution
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests or browser extension requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Handle HTML navigation requests or static bundle requests
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Clone and put response into cache if valid
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          !event.request.url.includes('firestore') &&
          !event.request.url.includes('identitytoolkit')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Offline fallback
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If navigation request fails offline, serve root page from cache
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline - Asset unavailable', {
          status: 503,
          statusText: 'Service Unavailable (Offline)'
        });
      })
  );
});
