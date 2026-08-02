const APP_SHELL_CACHE = 'mb-vykaznictvi-shell-v2';
const CACHEABLE_DESTINATIONS = new Set(['document', 'script', 'style', 'image', 'font', 'video']);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('mb-vykaznictvi-shell-') && key !== APP_SHELL_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isPrivateApi = url.pathname.startsWith('/api/') || url.pathname === '/healthz';

  if (request.method !== 'GET' || url.origin !== self.location.origin || isPrivateApi) return;
  if (!CACHEABLE_DESTINATIONS.has(request.destination) && request.mode !== 'navigate') return;

  const isVersionedAsset = /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(url.pathname);
  if (isVersionedAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/');
        return Response.error();
      })
  );
});
