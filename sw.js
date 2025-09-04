const CACHE_NAME = 'fs-inventory-v3';
const urlsToCache = [
  './',
  './index.html',
  './app.js?v=2',
  './styles.css',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-96x96.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://kit.fontawesome.com/48bbc1dc8c.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache files one by one to handle failures gracefully
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url))
        );
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle navigation requests - ensure index.html is served for all navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .catch(() => {
              return caches.match('./index.html');
            });
        })
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 