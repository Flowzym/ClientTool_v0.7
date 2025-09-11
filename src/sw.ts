/// <reference lib="webworker" />
self.addEventListener('install', () => {
  // @ts-ignore
  self.skipWaiting && self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  // @ts-ignore
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
