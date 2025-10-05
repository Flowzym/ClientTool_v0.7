# Troubleshooting Guide

## Board zeigt keine Daten

### Problem
Das Board lädt, zeigt aber leere Zeilen oder "Keine Klient:innen gefunden".

### Diagnose

Öffnen Sie die Browser-Konsole (F12) und prüfen Sie die Ausgaben:

1. **Crypto-Initialisierung prüfen**
   ```
   🔑 Crypto-Key wird initialisiert...
   ✅ Crypto-Key erfolgreich geladen
   ```
   Wenn dieser Schritt fehlt oder fehlschlägt, ist der Encryption-Key nicht verfügbar.

2. **Auto-Seed prüfen** (nur DEV-Mode)
   ```
   📦 Datenbank ist leer - erstelle Test-Daten...
   ✅ 16 Test-Clients erstellt
   🔍 Verifikation: 16 Clients in DB
   ```

3. **Board-Daten-Ladung prüfen**
   ```
   📊 useBoardData: Loaded X clients from DB
   🔍 Board Debug: { clientsLength: X, ... }
   ```

### Lösungen

#### A. Datenbank ist leer (DEV-Mode)

1. **Automatisch**: Seite neu laden - Auto-Seed sollte automatisch laufen
2. **Manuell**: Im Board auf "Test-Daten erstellen (DEV)" klicken

#### B. Crypto-Key-Problem

**Symptome**:
- Konsole zeigt: "⚠️ Crypto-Key nicht verfügbar"
- Board zeigt leere Rows mit Struktur aber ohne Inhalte
- `_decodeError: true` in Client-Objekten

**Lösung**:

1. Prüfen Sie `.env` Datei:
   ```env
   VITE_ENCRYPTION_MODE=dev-enc
   ```

2. Browser-Daten löschen:
   - IndexedDB löschen (F12 → Application → IndexedDB → `clienttool_dev_enc` löschen)
   - localStorage löschen
   - Seite neu laden

3. Falls das Problem weiterhin besteht:
   ```bash
   # Dev-Server neu starten
   npm run dev
   ```

#### C. Decode-Errors

**Symptom**: Roter Banner "Entschlüsselungsfehler"

**Ursache**: Daten wurden mit anderem Key verschlüsselt als der aktuelle

**Lösung**:
1. Browser-Daten komplett löschen (siehe oben)
2. Neu starten und Daten neu importieren

#### D. Supabase-Integration fehlt

**Hinweis**: Die App nutzt derzeit KEINE Supabase-Datenbank, sondern ausschließlich lokale IndexedDB.

Die Supabase-Credentials in `.env` sind vorhanden, aber nicht aktiv integriert.

Alle Daten werden lokal im Browser gespeichert und verschlüsselt.

## Entwicklung-Tipps

### Datenbank zurücksetzen

1. Browser-Konsole öffnen (F12)
2. Ausführen:
   ```javascript
   // Alle Daten löschen
   await window.db.clearAllData()

   // Neue Test-Daten erstellen
   const { seedTestData } = await import('./src/data/seed')
   await seedTestData('newIds')

   // Seite neu laden
   location.reload()
   ```

### Encryption-Modes

- **`dev-enc`**: Development-Modus, automatischer Key (kein Passwort nötig)
- **`prod-enc`**: Production-Modus, Passphrase-basiert
- **`plain`**: Keine Verschlüsselung (nicht empfohlen)

In `.env` setzen:
```env
VITE_ENCRYPTION_MODE=dev-enc
```

### Debug-Logging aktivieren

Alle Debug-Logs sind bereits im DEV-Modus aktiv (`import.meta.env.DEV`).

Zusätzliche Logs:
```javascript
// In Browser-Konsole
localStorage.setItem('debug', 'true')
```

## Häufige Fehler

### "Cannot read properties of undefined"

**Ursache**: Client-Objekt hat fehlende Felder nach Decode-Fehler

**Lösung**: Siehe "B. Crypto-Key-Problem" oben

### "Dexie: Version X already exists"

**Ursache**: Datenbank-Migrations-Konflikt

**Lösung**:
1. IndexedDB komplett löschen (F12 → Application → IndexedDB)
2. Seite neu laden

### Performance-Probleme bei vielen Datensätzen

**Lösung**: Virtualized Rows aktivieren (DEV-Toggle im Board)

## Support

Bei weiteren Problemen:
1. Browser-Konsole-Output kopieren
2. Screenshots vom Problem
3. Schritte zur Reproduktion notieren
