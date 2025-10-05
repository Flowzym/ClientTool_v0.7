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
  // Warte kurz damit Crypto-Manager initialisieren kann
  setTimeout(async () => {
    try {
      console.log('🔑 Crypto-Key wird initialisiert...');

      // Versuche Crypto-Key zu laden
      let keyAvailable = false;
      try {
        await cryptoManager.getActiveKey();
        keyAvailable = true;
        console.log('✅ Crypto-Key erfolgreich geladen');
      } catch (error) {
        console.warn('⚠️ Crypto-Key nicht verfügbar:', error);
        console.log('💡 Versuche mit dev-enc Fallback...');
      }

      // Ensure demo users exist (funktioniert auch ohne Crypto in dev-enc mode)
      const usersCreated = await ensureDemoUsersIfEmpty();
      if (usersCreated > 0) {
        console.log(`✅ ${usersCreated} Demo-User erstellt`);
      }

      // Check if clients exist
      const clientCount = await db.clients.count();
      console.log(`📊 Aktuelle Client-Anzahl: ${clientCount}`);

      if (clientCount === 0) {
        console.log('📦 Datenbank ist leer - erstelle Test-Daten...');
        try {
          const result = await seedTestData('newIds');
          console.log(`✅ ${result.clients} Test-Clients erstellt`);
          console.log(`✅ ${result.users} Demo-Users erstellt`);

          // Verifikation
          const verifyCount = await db.clients.count();
          console.log(`🔍 Verifikation: ${verifyCount} Clients in DB`);
        } catch (seedError) {
          console.error('❌ Seed-Fehler:', seedError);
          console.error('Fehler-Details:', seedError instanceof Error ? seedError.message : seedError);
        }
      } else {
        console.log(`✅ ${clientCount} Clients in Datenbank gefunden`);

        // Zeige erste 3 Client-IDs zur Verifikation
        const sampleClients = await db.clients.limit(3).toArray();
        console.log('📋 Sample Clients:', sampleClients.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
      }
    } catch (error) {
      console.error('❌ Auto-seed komplett fehlgeschlagen:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'Keine Stack-Trace');
    }
  }, 500); // 500ms delay für Crypto-Init
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
