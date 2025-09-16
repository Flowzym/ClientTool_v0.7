/**
 * Service Worker Logic - Pure Functions für Unit-Tests
 * Extrahiert aus SW-Kontext für bessere Testbarkeit
 */

export const isSameOrigin = (url: string, origin: string): boolean => {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
};

export const isNavigation = (request: Request): boolean => {
  return (request as any).mode === 'navigate';
};

export const isStaticAsset = (request: Request): boolean => {
  const destination = (request as any).destination;
  return ['style', 'script', 'font', 'image'].includes(destination);
};

export const isSafeScheme = (url: string): boolean => {
  return url.startsWith('blob:') || url.startsWith('data:');
};

export const generateCacheNames = (version: string) => ({
  static: `ct-static-${version}`,
  pages: `ct-pages-${version}`
});

export const isOldCache = (cacheName: string, currentCaches: string[]): boolean => {
  return !currentCaches.includes(cacheName);
};