# Klient:innendaten-Tool (Local-Only PWA)

## Übersicht

Diese Progressive Web App (PWA) wurde speziell für die sichere, lokale Verarbeitung von personenbezogenen Klient:innendaten entwickelt. Die Anwendung funktioniert **komplett offline** und erlaubt **keine externen Netzwerkzugriffe**.

## ⚠️ Wichtiger Sicherheitshinweis

**Verwenden Sie keine echten, sensiblen Daten in dieser Entwicklungsumgebung!**

Diese App ist für den produktiven Einsatz auf lokalen, abgesicherten Systemen konzipiert.

## 🛡️ Sicherheitsfeatures

### Local-Only Modus

Die App implementiert mehrere Sicherheitsebenen:

1. **Content Security Policy (CSP)**: Strikte CSP verhindert das Laden externer Ressourcen
2. **Network Guard**: Monkey-Patch von `fetch` und `XMLHttpRequest` blockiert alle externen URLs
3. **Service Worker**: Precaching für komplette Offline-Funktionalität
4. **Lokale Assets**: Alle Icons, Fonts und Libraries sind im Bundle enthalten

### Überprüfung der Netzwerk-Isolation

So können Sie den Local-Only Modus überprüfen:

1. **Developer Tools öffnen** (F12)
2. **Network-Tab aktivieren**
3. **App navigieren** - Sie sollten nur Requests zu `localhost` oder `blob:` URLs sehen
4. **Sicherheits-Seite besuchen** und "Network Guard testen" klicken
5. **Konsole prüfen** - Blockierte externe Requests werden geloggt

### Erwartete Netzwerk-Aktivität

✅ **Erlaubt:**
- `http://localhost:*` (lokaler Dev-Server)
- `blob:` URLs (lokale Dateien)
- `data:` URLs (inline Assets)

❌ **Blockiert:**
- Alle anderen Domains und URLs
- CDNs, APIs, Webfonts, Analytics

## 🏗️ Architektur

### Ordnerstruktur

```
src/
├── app/              # Routen, Layout, PWA-Konfiguration
├── components/       # Wiederverwendbare UI-Komponenten  
├── features/         # Feature-Module (Dashboard, Import, etc.)
├── utils/            # Network Guard, PWA-Utils
├── styles/           # Design-System (CSS Custom Properties)
└── data/             # (Zukünftig) Lokale Datenbank
```

### Technologie-Stack

- **React 18** + **TypeScript**: UI-Framework
- **Vite**: Build-Tool und Dev-Server
- **Tailwind CSS**: Utility-First CSS mit Custom Properties
- **React Router**: Client-Side Routing
- **Service Worker**: Offline-First Architektur
- **Lucide React**: Icon-System (lokal gebundelt)

## 🎨 Design-Prinzipien

- **Utilitaristisch**: Ruhige, professionelle Ästhetik ohne "KI-App"-Look
- **System Fonts**: Verwendet Betriebssystem-Fonts für maximale Kompatibilität
- **Hoher Kontrast**: Optimiert für Accessibility und Lesbarkeit
- **8px-Spacing-System**: Konsistente Abstände und Proportionen
- **Fokus-Management**: Klare Tastaturbedienung und sichtbare Fokus-States

## 📱 PWA-Features

- **Offline-First**: App funktioniert komplett ohne Internet
- **Installierbar**: Kann als native App auf dem Desktop/Homescreen installiert werden
- **Service Worker**: Precacht alle App-Ressourcen für sofortiges Laden
- **Responsive**: Optimiert für Desktop, Tablet und Mobile

## 🚀 Entwicklung

### Lokaler Start

```bash
npm run dev
```

Die App startet unter `http://localhost:5173` und ist sofort einsatzbereit.

### PWA in Entwicklungsumgebungen

**Wichtiger Hinweis**: In Bolt/StackBlitz und ähnlichen Online-Umgebungen ist der Service Worker absichtlich deaktiviert, da diese Plattformen Service Worker nicht vollständig unterstützen. Die App zeigt dann "Local-Only (SW deaktiviert in dieser Umgebung)" an.

**Für vollständige PWA-Funktionalität:**
1. Lokalen Build erstellen: `npm run build`
2. Über HTTPS oder localhost:// bereitstellen
3. Service Worker wird automatisch registriert und die App ist vollständig offline-fähig

Der **Network Guard bleibt in allen Umgebungen aktiv** und blockiert externe Requests unabhängig vom Service Worker-Status.

### Build für Produktion

```bash
npm run build
```

Erstellt eine optimierte Version in `dist/` für die Bereitstellung auf lokalen Systemen.

## 📋 Roadmap (Zukünftige Phasen)

### Phase 1: Import-Module
- Excel-Dateien sicher einlesen und verarbeiten
- PDF-Textextraktion ohne externe Services
- Datenvalidierung und Strukturierung

### Phase 2: Datenverarbeitung
- Lokale Datenbank (IndexedDB/Dexie)
- Kanban-Board für Fallbearbeitung
- Suchfunktionalitäten

### Phase 3: Analyse & Export
- Statistische Auswertungen
- Sichere Export-Formate
- Berichtsgenerierung

### Phase 4: Erweiterte Sicherheit
- Client-seitige Verschlüsselung
- Audit-Logs
- Backup-Funktionen

## 🔒 DSGVO-Konformität

- **Datenminimierung**: Keine überflüssigen Datenerhebungen
- **Lokale Verarbeitung**: Daten verlassen niemals das lokale System
- **Transparenz**: Vollständig nachvollziehbare Datenverarbeitung
- **Technische Sicherheit**: Mehrschichtige Sicherheitsmaßnahmen

## 🔐 Speicher & Verschlüsselung

### Verschlüsselungsarchitektur

Die App implementiert eine robuste Client-seitige Verschlüsselung:

- **Key-Derivation**: Argon2id mit konfigurierbaren Parametern (timeCost=3, memory=64MB)
- **Verschlüsselung**: AES-GCM mit 256-bit Keys und 96-bit Nonces
- **Storage**: IndexedDB mit automatischen Encrypt/Decrypt-Hooks
- **Salt-Management**: Persistenter, zufälliger Salt pro Installation

### Datenmodelle

- **Client**: Vollständige Klient:innendaten mit Provenienz-Tracking
- **User**: Benutzer-Management mit Rollen (admin/sb)
- **ImportSession**: Delta-Sync-Unterstützung für Batch-Imports
- **Zod-Validierung**: Typsichere Schemas für alle Domänenobjekte

### Sicherheitsfeatures

- **Passphrase-Gate**: Vollbild-Authentifizierung vor Datenzugriff
- **Memory-Only Keys**: Keine Persistierung von Schlüsseln oder Passphrasen
- **Encrypted Indices**: Suchbare Felder bleiben unverschlüsselt für Performance
- **Provenienz-Tracking**: Vollständige Nachverfolgung von Datenherkunft und -änderungen

**Hinweis**: Delta-Sync-Funktionalität folgt in Phase 2.1 für inkrementelle Import-Updates.

## 📂 Datei-Upload im Bolt-Preview

### Upload-Verhalten je Umgebung

**Bolt-Embed/StackBlitz**: 
- Nur Standard-Datei-Input verfügbar
- System-Dateidialoge sind eingeschränkt
- Funktioniert zuverlässig mit Excel/CSV-Dateien bis ~15MB

**Lokaler Build/PWA**:
- Standard-Datei-Input + optionaler System-Picker
- Vollständige File System Access API-Unterstützung
- Keine Größenbeschränkungen

### Unterstützte Formate

- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003) 
- `.csv` (UTF-8 empfohlen)

### Troubleshooting

Bei Upload-Problemen:
1. Datei-Größe reduzieren (< 15MB für Embeds)
2. Format prüfen (.xlsx/.csv bevorzugt)
3. Bei persistenten Problemen: lokalen Build verwenden

### Häufiger Import-Fehler: HTML statt Excel

**Problem**: Beim Download aus Web-Portalen wird manchmal HTML statt der echten Excel-Datei geliefert.

**Lösungen**:
1. **HTML mit Tabellen**: Wird automatisch konvertiert (Fallback-Modus)
2. **HTML ohne Tabellen** (Login/Fehlerseiten): 
   - Im Quellsystem direkt als .xlsx/.csv exportieren
   - Datei in Excel/LibreOffice öffnen und neu speichern
   - Prüfen ob Download-Link korrekt ist

**Erkennung**: Magic-Bytes werden in Fehlermeldungen angezeigt (z.B. `3c 21 44 4f` für HTML)

Der Import kann jetzt auch HTML-Dateien mit Tabellen verarbeiten, die oft bei Web-Portal-Downloads entstehen.

## 📄 PDF-Import mit Text-Extraktion

### PDF-Verarbeitung

Die App kann PDF-Dateien lokal verarbeiten und strukturierte Daten extrahieren:

- **Lokale pdf.js-Integration**: Keine externen CDNs, Worker wird lokal gebundelt
- **Text-Extraktion**: Automatische Extraktion von Text aus ausgewählten PDF-Seiten
- **Regex-Analyse**: Erkennt typische Felder wie AMS-ID, Namen, Telefon, E-Mail, Adressen
- **Intelligentes Mapping**: Automatische Zuordnung zu Domänenfeldern mit manueller Korrektur

### Unterstützte PDF-Inhalte

✅ **Text-PDFs**: Werden vollständig analysiert und verarbeitet
❌ **Bild-PDFs/Scans**: Zeigen Hinweis "OCR folgt in Phase 3.5"

### PDF-Import-Workflow

1. **Datei-Upload**: PDF auswählen (nur lokale Dateien, keine externen URLs)
2. **Seiten-Auswahl**: Bestimmte Seiten für Extraktion auswählen
3. **Text-Extraktion**: Automatische Textextraktion mit pdf.js
4. **Regex-Analyse**: Erkennung strukturierter Daten (AMS-ID, Namen, etc.)
5. **Mapping**: Zuordnung und Korrektur der erkannten Felder
6. **Import**: Anhängen oder Synchronisieren wie beim Excel-Import

### Beispiel-PDF

Eine Test-PDF mit Beispieldaten finden Sie unter `public/sample/clients.pdf`:
- Enthält 3 Testfälle mit AMS-IDs, Namen, Kontaktdaten
- Demonstriert typische Regex-Erkennungsmuster
- Ideal zum Testen der PDF-Import-Funktionalität

### Regex-Patterns

Die App erkennt automatisch:
- **AMS-ID**: `A12345` (A + 4-6 Ziffern)
- **Namen**: `Max Mustermann` (Vor- und Nachname)
- **Geburtsdatum**: `15.03.1985` (dd.mm.yyyy Format)
- **Telefon**: `+43 664 1234567` (verschiedene Formate)
- **E-Mail**: `max@example.com` (Standard-E-Mail-Pattern)
- **Adresse**: `Hauptstraße 12, 1010 Wien` (Straße, PLZ, Ort)

## 📂 Datei-Upload im Bolt-Preview

### Upload-Verhalten je Umgebung

**Bolt-Embed/StackBlitz**: 
- Nur Standard-Datei-Input verfügbar
- System-Dateidialoge sind eingeschränkt
- Funktioniert zuverlässig mit Excel/CSV-Dateien bis ~15MB

**Lokaler Build/PWA**:
- Standard-Datei-Input + optionaler System-Picker
- Vollständige File System Access API-Unterstützung
- Keine Größenbeschränkungen

### Unterstützte Formate

- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003) 
- `.csv` (UTF-8 empfohlen)

### Troubleshooting

Bei Upload-Problemen:
1. Datei-Größe reduzieren (< 15MB für Embeds)
2. Format prüfen (.xlsx/.csv bevorzugt)
3. Bei persistenten Problemen: lokalen Build verwenden

## 📊 Excel-Import & Delta-Sync

### Import-Modi

**Anhängen**: Alle Datensätze aus der Excel-Datei werden als neue Einträge hinzugefügt.

**Synchronisieren**: Intelligenter Delta-Sync mit bestehenden Daten:
- **Neu**: Datensätze, die noch nicht in der Datenbank existieren
- **Aktualisiert**: Bestehende Datensätze mit geänderten Feldern
- **Entfallen**: Datensätze, die nicht mehr in der Import-Quelle vorhanden sind

### Sync-Optionen

- **Nur leere Felder füllen**: Überschreibt nur bisher leere/undefined Felder
- **Geschützte Felder respektieren**: Berücksichtigt `protectedFields` pro Client
- **Entfallene archivieren**: Setzt `isArchived=true` statt zu löschen (empfohlen)
- **Löschen nur bei Inaktivität**: Löscht nur Datensätze ohne Kontakthistorie oder Zuordnung

### Mapping-Presets

Spalten-Zuordnungen können pro Source-ID gespeichert und wiederverwendet werden. Auto-Mapping erkennt deutsche Spaltennamen automatisch.

### Dev-Key-Fallback

**Wichtiger Hinweis für Entwicklung**: Mit deaktiviertem Login nutzt die App einen temporären Dev-Key pro Tab-Session. Dieser Key:

- Existiert nur für die aktuelle Browser-Session
- Wird in sessionStorage gespeichert (Tab-Reload-robust)
- Ermöglicht nahtlose Entwicklung ohne Passphrase-Eingabe
- **Nur für Prototyping** - niemals mit echten, sensiblen Daten verwenden
- Wird durch Passphrase-Login automatisch ersetzt

Die Konsole zeigt "🔧 Dev key active (prototype mode)" wenn der Fallback aktiv ist. Alle Verschlüsselungsoperationen funktionieren transparent ohne manuelle Key-Verwaltung.

## 📞 Support

Bei Fragen zur Sicherheitskonfiguration oder Featureentwicklung wenden Sie sich an das Entwicklerteam.