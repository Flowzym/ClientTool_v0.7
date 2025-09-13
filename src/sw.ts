/// <reference lib="webworker" />
self.addEventListener('install', () => {
  // @ts-expect-error Service Worker global scope
  void (self.skipWaiting && self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  // @ts-expect-error Service Worker global scope
  void (self.clients && self.clients.claim && event.waitUntil(self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
  }
});
