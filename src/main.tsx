import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Lade Network Guard sofort beim App-Start
console.log('🚀 Klient:innendaten-Tool wird gestartet...');
console.log('🛡️ Local-Only Modus: Externe Netzwerkzugriffe werden blockiert');

// Crypto-Key früh initialisieren (garantiert verfügbaren Key)
import { cryptoManager } from './data/crypto';
import { registerSW } from 'virtual:pwa-register';

cryptoManager.getActiveKey().catch(err => {
  console.warn('⚠️ Crypto: Key initialization failed:', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA Service Worker Registration (vite-plugin-pwa)
registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log('✅ Service Worker registered:', registration);
  },
  onRegisterError(error) {
    console.warn('⚠️ Service Worker registration failed:', error);
  }
});
