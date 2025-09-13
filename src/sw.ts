/// <reference lib="webworker" />
self.addEventListener('install', () => {
  // @ts-expect-error
  self.skipWaiting && self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  // @ts-expect-error
  self.clients && self.clients.claim && event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
  }
});
