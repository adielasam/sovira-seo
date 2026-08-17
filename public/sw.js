self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first caching strategy for simple offline support
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
