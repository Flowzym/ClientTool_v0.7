import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 Klient:innendaten-Tool wird gestartet...');
console.log('🛡️ Local-Only Modus: Externe Netzwerkzugriffe werden blockiert');

import { registerSW } from 'virtual:pwa-register';
import { db } from './data/db';
import { ensureDemoUsersIfEmpty, seedTestData } from './data/seed';

if (import.meta.env.DEV) {
  setTimeout(async () => {
    try {
      const usersCreated = await ensureDemoUsersIfEmpty();
      if (usersCreated > 0) {
        console.log(`✅ ${usersCreated} Demo-User erstellt`);
      }

      const clientCount = await db.clients.count();
      console.log(`📊 Aktuelle Client-Anzahl: ${clientCount}`);

      if (clientCount === 0) {
        console.log('📦 Datenbank ist leer - erstelle Test-Daten...');
        try {
          const result = await seedTestData('newIds');
          console.log(`✅ ${result.clients} Test-Clients erstellt`);
          console.log(`✅ ${result.users} Demo-Users erstellt`);

          const verifyCount = await db.clients.count();
          console.log(`🔍 Verifikation: ${verifyCount} Clients in DB`);
        } catch (seedError) {
          console.error('❌ Seed-Fehler:', seedError);
          console.error('Fehler-Details:', seedError instanceof Error ? seedError.message : seedError);
        }
      } else {
        console.log(`✅ ${clientCount} Clients in Datenbank gefunden`);

        const sampleClients = await db.clients.limit(3).toArray();
        console.log('📋 Sample Clients:', sampleClients.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
      }
    } catch (error) {
      console.error('❌ Auto-seed fehlgeschlagen:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'Keine Stack-Trace');
    }
  }, 100);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log('✅ Service Worker registered:', registration);
  },
  onRegisterError(error) {
    console.warn('⚠️ Service Worker registration failed:', error);
  }
});
