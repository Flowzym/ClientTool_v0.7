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
import { db } from './data/db';
import { ensureDemoUsersIfEmpty, seedTestData } from './data/seed';

cryptoManager.getActiveKey().catch(err => {
  console.warn('⚠️ Crypto: Key initialization failed:', err);
});

// Auto-seed in DEV-Modus wenn DB leer ist
if (import.meta.env.DEV) {
  cryptoManager.getActiveKey().then(async () => {
    try {
      // Ensure demo users exist
      const usersCreated = await ensureDemoUsersIfEmpty();
      if (usersCreated > 0) {
        console.log(`✅ ${usersCreated} Demo-User erstellt`);
      }

      // Check if clients exist
      const clientCount = await db.clients.count();
      if (clientCount === 0) {
        console.log('📦 Datenbank ist leer - erstelle Test-Daten...');
        const result = await seedTestData('newIds');
        console.log(`✅ ${result.clients} Test-Clients erstellt`);
      } else {
        console.log(`📊 ${clientCount} Clients in Datenbank gefunden`);
      }
    } catch (error) {
      console.warn('⚠️ Auto-seed fehlgeschlagen:', error);
    }
  }).catch(() => {
    console.log('⏭️ Auto-seed übersprungen (kein Crypto-Key verfügbar)');
  });
}

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
