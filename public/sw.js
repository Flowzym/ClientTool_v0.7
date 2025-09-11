// Service Worker für komplett lokale PWA
const CACHE_NAME = 'klient-tool-v1';
const OFFLINE_CACHE = 'klient-tool-offline-v1';

// Alle App-Ressourcen für Precaching
const APP_STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Install - Precache aller statischen Ressourcen
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing and precaching app shell');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_STATIC_RESOURCES);
        console.log('✅ Service Worker: App shell precached successfully');
        await self.skipWaiting();
      } catch (error) {
        console.error('❌ Service Worker: Precache failed:', error);
      }
    })()
  );
});

// Activate - Cleanup alter Caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating');
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const oldCacheNames = cacheNames.filter(
          (cacheName) => cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE
        );
        
        await Promise.all(
          oldCacheNames.map((cacheName) => caches.delete(cacheName))
        );
        
        await self.clients.claim();
        console.log('✅ Service Worker: Activated successfully');
      } catch (error) {
        console.error('❌ Service Worker: Activation failed:', error);
      }
    })()
  );
});

// Fetch - Nur lokale Ressourcen, strikte Cache-Strategie
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Nur lokale Origins erlaubt
  if (url.origin !== self.location.origin) {
    console.warn('🚫 Service Worker: Blocked external request to:', url.href);
    event.respondWith(
      new Response('External requests blocked by Local-Only policy', {
        status: 403,
        statusText: 'Forbidden'
      })
    );
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Cache-First-Strategie für lokale Ressourcen
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Falls nicht im Cache, versuche Netzwerk (nur für self)
        const networkResponse = await fetch(event.request);
        
        // Cache für zukünftige Nutzung
        if (networkResponse.ok) {
          const cache = await caches.open(OFFLINE_CACHE);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.error('❌ Service Worker: Fetch failed:', error);
        
        // Offline-Fallback nur für Navigation
        if (event.request.mode === 'navigate') {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) {
            return cachedIndex;
          }
        }
        
        return new Response('Offline - Ressource nicht verfügbar', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});