# Offline-Funktionalität

## Was funktioniert offline

✅ **App starten**: Vollständige UI lädt aus Cache
✅ **Board anzeigen**: Alle Klient:innendaten aus lokaler IndexedDB
✅ **Lokale Edits**: Status, Zuweisungen, Notizen (Dexie-basiert)
✅ **Suche & Filter**: Clientseitige Operationen
✅ **Undo/Redo**: Patch-Stack funktioniert lokal
✅ **Verschlüsselung**: AES-GCM läuft im Browser

## Was nicht offline geht

❌ **Import neuer Dateien**: Datei-Upload erfordert aktive Session
❌ **Export**: File System Access API benötigt Netzwerk-Kontext
❌ **SharePoint-Sync**: Externe API-Calls (falls aktiviert)

## Cache-Strategien

- **Navigation** (Seitenaufrufe): Network-First mit Cache-Fallback
- **Statische Assets** (CSS/JS/Fonts/Bilder): Cache-First
- **API-Calls**: Direct Fetch (kein Caching)

## Offline-Test in DevTools

1. **DevTools öffnen** (F12)
2. **Network-Tab** → "Offline" aktivieren
3. **Seite neu laden** → App sollte aus Cache laden
4. **Board öffnen** → Daten aus IndexedDB verfügbar
5. **Edits testen** → Lokale Änderungen funktionieren
6. **"Online" aktivieren** → Normale Funktion wiederhergestellt

## Cache-Invalidierung

Bei App-Updates werden alte Caches automatisch gelöscht:
- Neue Version aktiviert → alte `ct-static-*` und `ct-pages-*` Caches entfernt
- Nur Same-Origin Ressourcen werden gecacht
- Externe Requests werden nicht gecacht (Security)

## Troubleshooting

**App lädt nicht offline:**
- Prüfen ob Service Worker registriert: DevTools → Application → Service Workers
- Cache-Inhalt prüfen: DevTools → Application → Storage → Cache Storage

**Veraltete Inhalte:**
- Hard-Refresh (Ctrl+Shift+R) erzwingt Netzwerk-Fetch
- Cache manuell leeren: DevTools → Application → Clear Storage