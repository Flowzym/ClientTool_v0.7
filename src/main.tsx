import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Lade Network Guard sofort beim App-Start
console.log('🚀 Klient:innendaten-Tool wird gestartet...');
console.log('🛡️ Local-Only Modus: Externe Netzwerkzugriffe werden blockiert');

// Crypto-Key früh initialisieren (garantiert verfügbaren Key)
import { cryptoManager } from './data/crypto';
import { registerSW } from 'virtual:pwa-register'
cryptoManager.getActiveKey().catch(err => {
  console.warn('⚠️ Crypto: Key initialization failed:', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerSW({ immediate: true });


// /* PWA: dynamic registration */
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  (async () => {
    try {
      const id = 'virtual:pwa-register';
      // @ts-ignore - Vite will ignore transforming this dynamic path
      const mod = await import(/* @vite-ignore */ id);
      if (mod && typeof mod.registerSW === 'function') {
        mod.registerSW({ immediate: true });
      }
    } catch (e) {
      // Fallback: try classic service worker under /sw.js if available
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch {}
    }
  })();
}
