// Service Worker für komplett lokale PWA
const CT_SW_VERSION = 'v0.8-pwa-1';
const CT_CACHE_STATIC = `ct-static-${CT_SW_VERSION}`;
const CT_CACHE_PAGES = `ct-pages-${CT_SW_VERSION}`;

// Statische Ressourcen für Precaching
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Install - Precache kritischer Ressourcen
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing version', CT_SW_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CT_CACHE_STATIC);
        
        // Nur existierende Ressourcen precachen
        const validResources = [];
        for (const resource of STATIC_RESOURCES) {
          try {
            const response = await fetch(resource);
            if (response.ok) {
              validResources.push(resource);
            }
          } catch {
            console.warn('SW: Resource not available for precache:', resource);
          }
        }
        
        if (validResources.length > 0) {
          await cache.addAll(validResources);
          console.log('✅ Service Worker: Precached', validResources.length, 'resources');
        }
        
        await self.skipWaiting();
      } catch (error) {
        console.error('❌ Service Worker: Install failed:', error);
      }
    })()
  );
});

// Activate - Cleanup alter Caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating version', CT_SW_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const currentCaches = [CT_CACHE_STATIC, CT_CACHE_PAGES];
        
        // Alte Caches löschen
        const oldCaches = cacheNames.filter(name => !currentCaches.includes(name));
        await Promise.all(oldCaches.map(name => caches.delete(name)));
        
        if (oldCaches.length > 0) {
          console.log('🧹 Service Worker: Deleted', oldCaches.length, 'old caches');
        }
        
        await self.clients.claim();
        console.log('✅ Service Worker: Activated successfully');
      } catch (error) {
        console.error('❌ Service Worker: Activation failed:', error);
      }
    })()
  );
});

// Fetch - Cache-Strategien mit Same-Origin Guard
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Nur GET-Requests behandeln
  if (request.method !== 'GET') {
    return;
  }
  
  // Same-Origin Guard - nur lokale Ressourcen cachen
  if (url.origin !== self.location.origin) {
    // Sichere Schemes durchlassen ohne Caching
    if (url.protocol === 'blob:' || url.protocol === 'data:') {
      return;
    }
    
    console.warn('🚫 Service Worker: External request not cached:', url.href);
    return; // Browser macht normalen Fetch
  }
  
  event.respondWith(
    (async () => {
      try {
        // Navigation - Network-First mit Fallback
        if (request.mode === 'navigate') {
          try {
            const networkResponse = await fetch(request);
            
            // Bei Erfolg: Response cachen und zurückgeben
            if (networkResponse.ok) {
              const cache = await caches.open(CT_CACHE_PAGES);
              cache.put(request, networkResponse.clone()).catch(() => {
                // Cache-Fehler nicht fatal
              });
              return networkResponse;
            }
          } catch {
            // Network-Fehler - Fallback auf Cache
          }
          
          // Fallback-Kette für Navigation
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) {
            console.log('📱 Service Worker: Serving cached index.html');
            return cachedIndex;
          }
          
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            console.log('📱 Service Worker: Serving offline.html');
            return offlinePage;
          }
          
          // Letzter Fallback
          return new Response('Offline - App nicht verfügbar', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
        
        // Statische Assets - Cache-First
        const destination = request.destination;
        if (['style', 'script', 'font', 'image'].includes(destination)) {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const cache = await caches.open(CT_CACHE_STATIC);
              cache.put(request, networkResponse.clone()).catch(() => {
                // Cache-Fehler nicht fatal
              });
            }
            return networkResponse;
          } catch (error) {
            console.warn('SW: Network failed for static asset:', request.url);
            throw error;
          }
        }
        
        // Alles andere - Direct Fetch (keine Cache-Strategie)
        return await fetch(request);
        
      } catch (error) {
        console.error('❌ Service Worker: Fetch failed:', error);
        
        // Fallback nur für Navigation
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
        }
        
        return new Response('Ressource nicht verfügbar', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});