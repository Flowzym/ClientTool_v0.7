# Test Plan - Klient:innendaten-Tool

## Übersicht

Dieser Testplan dokumentiert die wichtigsten Testszenarien für manuelle und automatisierte Tests der Anwendung.

## Automatisierte Tests

### Unit Tests
- **Abdeckung**: 85%+ lines, 85%+ functions, 80% branches
- **Framework**: Vitest mit React Testing Library
- **Ausführung**: `npm test`

### Integration Tests
- **Board Rendering**: `src/features/board/__tests__/board.rendering.test.tsx`
- **Optimistic Updates**: `src/features/board/__tests__/integration/optimistic-flow.integration.test.tsx`
- **Selection & Batch**: `src/features/board/__tests__/integration/selection-batch.integration.test.tsx`
- **Status ↔ Follow-up**: `src/features/board/__tests__/integration/status-followup.integration.test.tsx`
- **Undo/Redo Flow**: `src/features/board/__tests__/integration/undo-redo.integration.test.tsx`

### Pin Functionality Tests
- **Shift-Range Operations**: `src/features/board/__tests__/pin.shift-range.test.tsx`
  - Single pin/unpin toggle
  - Shift-click range pinning with consistent target state
  - Reverse range handling (higher to lower index)
  - Mixed pin states in range
  - Accessibility with aria-pressed states

### Accessibility Tests
- **Header Accessibility**: `src/features/board/__tests__/a11y.headers.test.tsx`
  - aria-sort correctness for all column states
  - Header checkbox tri-state behavior (false/true/mixed)
  - Keyboard navigation through sortable headers
  - Screen reader support validation

### Board Header Tests
- **Header Rendering**: `src/features/board/__tests__/board.header.render.test.tsx`
  - No duplicate "Offer" headers
  - Bold font headers
  - Select-all checkbox functionality
  - Grid layout consistency

### Board Sorting Tests
- **Sorting Contract**: `src/features/board/__tests__/board.sorting.contract.test.tsx`
  - All sortable columns cycle through none → asc → desc → none
  - Non-sortable columns remain non-interactive
  - Pinned-first sorting preservation
  - No crashes on header clicks

### Board Selection Tests
- **Header Checkbox**: `src/features/board/__tests__/board.selection.header-checkbox.test.tsx`
  - Tri-state behavior (unchecked/checked/indeterminate)
  - Select-all affects only visible/filtered clients
  - Keyboard accessibility
  - Performance with large datasets

### Performance Tests
- **Virtual Rows**: `src/features/board/__tests__/perf.flag.test.ts`
- **Hook Order Guards**: `src/features/board/__tests__/board.hookOrder.guard.test.tsx`
- **Virtualization Toggle**: `src/features/board/__tests__/virtualRows.toggle.test.tsx`

### Export/Import Tests
- **CSV Utils**: `src/features/export/csv/__tests__/csvUtils.test.ts`
- **ZIP Utils**: `src/features/export/zip/__tests__/zipUtils.test.ts`
- **Excel Routing**: `src/features/import/__tests__/excelRouting.test.ts`

## Manuelle Testszenarien

### Board-Funktionalität

#### Header-Sortierung & Accessibility ⭐ NEU
1. **Spalten-Sortierung**
   - Alle Spalten sortierbar (außer Zubuchung, Aktivität, Aktionen)
   - Sortier-Zyklus: none → asc → desc → none
   - Kein Crash bei fehlendem setView (lokaler Fallback)
   - Pinned-first Pipeline in allen Modi

2. **Header-Design**
   - Alle Header in fett (font-bold)
   - Kein doppeltes "Offer" mehr
   - Konsistente Grid-Layout-Ausrichtung
   - Sort-Pfeile nur bei aktiver Spalte

3. **Header-Checkbox Tri-State** ⭐ NEU
   - Keine Auswahl: aria-checked="false", nicht indeterminate
   - Alle ausgewählt: aria-checked="true", checked=true
   - Teilauswahl: aria-checked="mixed", indeterminate=true
   - Klick-Verhalten: false→true→false Zyklus

4. **Accessibility**
   - Tab-Navigation durch sortierbare Header
   - aria-sort="none/ascending/descending" korrekt
   - Enter/Space aktiviert Sortierung
   - Nicht-sortierbare Header haben aria-sort="none"

#### Pin-Operationen
1. **Einzelnes Pinnen/Entpinnen**
   - Klick auf Pin-Button → Client wird gepinnt/entpinnt
   - Gepinnte Clients bleiben oben in allen Sortierungen
   - Pin-Status visuell korrekt (📌 vs 📍)

2. **Shift-Range Pinning** ⭐ NEU
   - Ersten Client anklicken (Anker setzen)
   - Shift+Klick auf anderen Client → Bereich wird gepinnt/entpinnt
   - Zielzustand bestimmt Aktion (geklicktes Element → alle im Bereich)
   - Funktioniert in beide Richtungen (aufwärts/abwärts)

3. **Pinned-First Sorting**
   - Sortierung nach Name → Gepinnte bleiben oben, dann alphabetisch
   - Sortierung nach Status → Gepinnte bleiben oben, dann nach Status
   - Sortierung nach Priorität → Gepinnte bleiben oben, dann nach Priorität

5. **Pin-Button Accessibility**
   - aria-pressed="true/false" je nach Pin-Status
   - Keyboard-Navigation (Tab + Enter/Space)
   - Beschreibende title-Attribute

#### Cell-Komponenten ⭐ NEU
1. **NameCell Format**
   - "Nachname, Vorname (Titel)" Format
   - Telefon-Untertitel oder "—"
   - Notiz-Badge nur bei count >= 1
   - PencilLine Icon mit Badge-Overlay

2. **FollowupCell Icon-Only**
   - Kein Datum: nur Kalendersymbol (Tooltip "Termin hinzufügen")
   - Datum gesetzt: Input + formatierte Anzeige + Clear-Button
   - Auto-Status: Setzen → terminVereinbart, Entfernen → offen

3. **ContactAttemptsCell**
   - Größere Icons (18px) für bessere Sichtbarkeit
   - CounterBadge nur bei count >= 1
   - Vier Kanäle: Telefon, SMS, E-Mail, Proxy

4. **PriorityCell Single-Dot**
   - Genau ein farbiger Dot je Level
   - Farben: niedrig=grün, normal=grau, hoch=gelb, dringend=rot
   - Klick-Cycle durch alle Level
   - Tooltip mit Level-Namen

### Import-Pipeline

#### Excel/CSV-Import
1. **Datei-Upload**
   - .xlsx, .xls, .csv Dateien
   - HTML-Tabellen-Fallback für Web-Portal-Downloads
   - Magic-Bytes-Erkennung vs. falsche Extensions

2. **Mapping & Validierung**
   - Auto-Mapping deutscher Spaltennamen
   - Mapping-Presets pro Source-ID
   - Validierungsfehler-Anzeige

3. **Delta-Sync**
   - Anhängen vs. Synchronisieren
   - Neue/Aktualisierte/Entfallene Erkennung
   - Geschützte Felder respektieren

#### PDF-Import
1. **Text-Extraktion**
   - PDF-Seiten-Auswahl
   - Regex-Erkennung (AMS-ID, Namen, Kontakte)
   - OCR-Hinweis für Scan-PDFs

2. **Mapping-Korrektur**
   - Automatische Feld-Zuordnung
   - Manuelle Korrektur-Möglichkeit
   - Vorschau vor Import

### Verschlüsselung & Sicherheit

#### Encryption-Modi
1. **PLAIN-Modus** (nur localhost)
   - Guardrail: Blockiert auf Nicht-localhost
   - Export-Sperre aktiv
   - Warnung in UI

2. **DEV-ENC-Modus**
   - DEV-Key aus ENV oder localStorage
   - Automatische Key-Generierung
   - Sicherheits-Panel zeigt Key-Quelle

3. **PROD-ENC-Modus**
   - Passphrase-Gate vor Datenzugriff
   - Argon2id Key-Derivation
   - Envelope v1 Verschlüsselung

#### Network Guard
1. **Local-Only Verhalten**
   - Externe Requests blockiert
   - Same-Origin erlaubt
   - Blocked-Requests-Log

2. **SharePoint-Integration** (optional)
   - Feature-Flag aktiviert externe Domains
   - Network Guard zeigt erlaubte Domains
   - Sicherheitswarnung in UI

### PWA & Offline

#### Service Worker
1. **Cache-Strategien**
   - Navigation: Network-First → Cache-Fallback
   - Assets: Cache-First
   - Offline-Fallback-Seite

2. **Installation**
   - PWA-Installation möglich
   - Manifest korrekt
   - Icons verfügbar

## Kritische Pfade

### 1. Daten-Import → Board → Export
1. Excel-Datei importieren (Anhängen-Modus)
2. Board öffnen → Daten sichtbar
3. Status/Zuweisungen ändern
4. CSV exportieren → Daten korrekt

### 2. Verschlüsselung Roundtrip
1. PROD-ENC: Passphrase eingeben
2. Daten importieren
3. App schließen/neu öffnen
4. Passphrase erneut eingeben → Daten verfügbar

### 3. Pin-Operationen mit Sortierung
1. Mehrere Clients pinnen (einzeln + Shift-Range)
2. Nach verschiedenen Spalten sortieren
3. Gepinnte Clients bleiben immer oben
4. Entpinnen funktioniert korrekt

### 4. Batch-Operationen
1. Mehrere Clients auswählen (Checkbox + Shift-Range)
2. Batch-Status/Zuweisung ändern
3. Undo/Redo funktioniert
4. Optimistic Updates korrekt

### 5. Header-Sortierung ⭐ NEU
1. Spalten-Header klicken → Sortierung wechselt
2. aria-sort korrekt für Screen Reader
3. Pinned-first bleibt in allen Modi erhalten
4. Kein Crash bei fehlendem setView

### 6. Header-Checkbox Tri-State ⭐ NEU
1. Keine Auswahl → unchecked, aria-checked="false"
2. Teilauswahl → indeterminate, aria-checked="mixed"
3. Alle ausgewählt → checked, aria-checked="true"
4. Klick-Verhalten funktioniert in allen Zuständen

### 7. Cell-Komponenten Interaktion ⭐ NEU
1. NameCell → Kundeninfo-Dialog öffnen
2. FollowupCell → Icon-only Modus, Auto-Status
3. ContactAttemptsCell → Kontaktversuche inkrementieren
4. PriorityCell → Single-Dot Cycle
5. PinCell → Shift-Range Pinning

### 8. Pin Shift-Range Operations ⭐ NEU
1. Ersten Client anklicken (Anker setzen)
2. Shift+Klick auf anderen Client → Bereich-Operation
3. Zielzustand vom geklickten Element bestimmt Aktion
4. Funktioniert aufwärts und abwärts
5. Gepinnte bleiben in allen Sortierungen oben

## Browser-Kompatibilität

### Unterstützte Browser
- **Chrome/Edge**: 90+ (File System Access API)
- **Firefox**: 88+ (Standard File Input)
- **Safari**: 14+ (Standard File Input)

### Feature-Detection
- File System Access API → System-Dateidialoge
- Service Worker → PWA-Funktionalität
- IndexedDB → Lokale Datenbank
- WebCrypto → Verschlüsselung

## Performance-Benchmarks

### Virtual Rows (opt-in)
- **DOM-Reduktion**: >90% bei 1000+ Datensätzen
- **Scroll-Performance**: 45+ FPS bei großen Datasets
- **Mount-Zeit**: Vergleichbar mit klassischer Darstellung
- **Memory-Effizienz**: Nur sichtbare Zeilen im DOM

### Encryption-Performance
- **AES-GCM**: <10ms für typische Client-Datensätze
- **Argon2id**: ~100ms für Key-Derivation (akzeptabel)
- **IndexedDB**: <50ms für CRUD-Operationen

## Fehlerbehandlung

### Graceful Degradation
- **Offline**: App funktioniert ohne Netzwerk
- **Crypto-Fehler**: Klare Fehlermeldungen
- **Import-Fehler**: Validierung mit Korrektur-Hinweisen
- **Browser-Limits**: Fallbacks für fehlende APIs
- **Sort-Fehler**: Lokaler Fallback bei fehlendem setView

### Error Boundaries
- **React Error Boundaries**: Verhindern kompletten App-Crash
- **Service Worker**: Robuste Cache-Strategien
- **Database**: Transaktionale Operationen

## Deployment-Tests

### Build-Validierung
- **TypeScript**: Strict mode, 0 Fehler
- **ESLint**: 0 Fehler, 0 Warnungen
- **Vite Build**: Erfolgreiche Produktion
- **Bundle-Size**: <2MB gzipped

### Quality Gates
- **Status Gate**: `npm run status` → grün
- **Coverage**: Schwellenwerte erfüllt
- **Performance**: Lighthouse-Score >90

## Regression-Tests

### Nach Updates prüfen
1. **Board-Funktionalität**: Pin, Sort, Filter, Selection
2. **Import-Pipeline**: Excel, PDF, HTML-Fallback
3. **Verschlüsselung**: Alle Modi, Roundtrip-Tests
4. **PWA**: Offline-Funktionalität, Cache-Strategien
5. **Export**: CSV, ZIP, Injection-Guards

### Breaking-Change-Detection
- **Export Policy**: Contract-Tests
- **Hook Order**: Guard-Tests
- **API-Kompatibilität**: Integration-Tests

## Contract-Tests (Export-Policy)

### Export Policy Compliance
- **Datei**: `src/__tests__/exports.contract.test.ts`
- **Abdeckung**: Default-Export bei Komponenten; Barrels re-exportieren named; Hooks/Services/Utils nur named
- **Validierung**: Automatische Überprüfung der Export-Patterns
- **Verweis**: ADR-00xx Export-Policy

### Import Usage Validation
- **Datei**: `src/__tests__/imports.usage.test.ts`
- **Abdeckung**: Konsumenten importieren korrekt, keine doppelten Re-Exports
- **Szenarien**: Mixed-Pattern Prevention, Named-Import Validation
- **Verweis**: ADR-00xx Export-Policy

## Visual Regression (Storybook/Snapshots)

### Minimal-Stories
- **NameCell**: Name-Format, Telefon-Untertitel, Notiz-Badge
- **StatusCell**: Status-Chips, Blue-Variants, Dropdown-Interaktion
- **ContactAttemptsCell**: CounterBadge-Sichtbarkeit, Icon-Größe, Kanal-Buttons
- **FollowUpCell**: Icon-only Modus, Date-Picker, Auto-Status
- **PriorityCell**: Single-Dot Rendering, Level-Farben, Cycle-Funktionalität

### Screenshot-Baselines
- **CI-Check**: Automatische Screenshot-Vergleiche
- **A11y-Check**: Accessibility-Tests pro Story
- **Responsive**: Mobile/Desktop-Varianten

## Seeds & Admin (E2E)

### Deterministische Fixtures
- **Seed-Funktion**: `seedTestData()` mit fixen Timestamps
- **Reproduzierbare IDs**: Deterministische Client-/User-IDs
- **Stabile States**: Konsistente Status/Priorität/Angebot-Verteilung

### Admin-Wechsel
- **User-Switcher**: Stabiler Rollenwechsel (admin/editor/user)
- **Berechtigungen**: UI-Sichtbarkeit je Rolle
- **Session-Persistenz**: Reload-robuste Authentifizierung

## Coverage & Gates

### Coverage-Schwellen
- **Lines**: ≥85% minimum coverage
- **Functions**: ≥85% minimum coverage
- **Statements**: ≥85% minimum coverage
- **Branches**: ≥80% minimum coverage

### Status-Gate
- **Ein-Kommando**: `npm run status` (build/test/lint + Red-Flag-Scan)
- **Bruch bei Unterschreitung**: CI bricht ab bei Coverage-/Quality-Problemen
- **Red-Flag-Detection**: Hook-Order-Violations, Import-Resolver-Fehler, Duplicate-Declarations
- **Verweis**: Model Context Summary, `scripts/status-gate.mjs`

## Performance (Virtual Rows, Feature-Flag)

### Test-Szenarien
- **Datasets**: 1k–5k Clients für Virtualisierung-Tests
- **A/B-Vergleich**: Virtual Rows ON/OFF
- **Messsetup**: `/dev/perf` Performance-Playground

### Akzeptanz-Metriken
- **FPS**: ≥50 bei Scroll-Performance
- **Commit-Zeit**: ≤16ms Median für Render-Updates
- **Jank-Vermeidung**: Keine Frames >50ms
- **DOM-Reduktion**: >90% bei Virtual Rows (1000+ Datensätze)

### Vergleich mit/ohne Virtual Rows
- **Mount-Zeit**: Vergleichbar oder besser
- **Memory-Effizienz**: Nur sichtbare Zeilen im DOM
- **Scroll-Smoothness**: Konsistente Frame-Rates
- **Verweis**: ADR-00xy Virtual Rows

## Testdaten

### Demo-Clients
- **Seed-Funktion**: `seedTestData()` in PassphraseGate
- **16 Test-Clients**: Verschiedene Status, Prioritäten, Angebote
- **Deterministische Daten**: Feste Timestamps für Tests

### Sample-Dateien
- **Excel**: `sample-data/clients.xlsx`
- **CSV**: `sample-data/clients.csv`
- **PDF**: `public/sample/clients.pdf`

## Monitoring

### Development
- **Performance Playground**: `/dev/perf` für Virtualisierung-Tests
- **Status Gate**: Automatische Quality-Checks
- **Console-Logs**: Strukturierte Debug-Ausgaben

### Production
- **Error Tracking**: Lokale Error-Logs
- **Performance**: Web Vitals Monitoring
- **Usage**: Feature-Flag-Nutzung

---

## Neue Testfälle (v0.7.3)

### Cell Component Tests
- **Datei**: `src/features/board/__tests__/followup.icononly.test.tsx`
- **Abdeckung**: Icon-only Modus, Auto-Status, Date-Picker
- **Szenarien**: Kein Datum → Icon, Datum → Input+Clear, Status-Sync

- **Datei**: `src/features/board/__tests__/contact.badge-visibility.test.tsx`
- **Abdeckung**: CounterBadge Sichtbarkeit, größere Icons
- **Szenarien**: Badge nur bei count>=1, Icon-Größe 18px, Interaktion

- **Datei**: `src/features/board/__tests__/priority.single-dot.test.tsx`
- **Abdeckung**: Single-Dot Rendering, Level-Farben, Cycle
- **Szenarien**: Ein Dot je Level, Farb-Mapping, Klick-Cycle

### Pin Shift-Range Tests
- **Datei**: `src/features/board/__tests__/pin.shift-range.test.tsx`
- **Abdeckung**: Shift-Range Pinning, Entpinnen, Bereich-Konsistenz
- **Szenarien**: Einzeln, Range, Reverse-Range, Mixed-States

### Accessibility Header Tests
- **Datei**: `src/features/board/__tests__/a11y.headers.test.tsx`
- **Abdeckung**: aria-sort Korrektheit, Header-Checkbox Tri-State
- **Szenarien**: Sortable/Non-sortable Headers, Keyboard-Navigation, Screen-Reader-Support

### Board Header Rendering Tests
- **Datei**: `src/features/board/__tests__/board.header.render.test.tsx`
- **Abdeckung**: Kein doppeltes "Offer", fette Header, Select-All
- **Szenarien**: Header-Struktur, Grid-Layout, Font-Styling

### Board Sorting Contract Tests
- **Datei**: `src/features/board/__tests__/board.sorting.contract.test.tsx`
- **Abdeckung**: Sortier-Zyklen, Pinned-First, Crash-Resistenz
- **Szenarien**: Alle Spalten, Sort-States, Edge-Cases

### Board Selection Header Tests
- **Datei**: `src/features/board/__tests__/board.selection.header-checkbox.test.tsx`
- **Abdeckung**: Tri-State Checkbox, Filtered Selection, Performance
- **Szenarien**: Partial/Full Selection, Filter-Interaktion, Large Datasets

### Export Policy Tests
- **Datei**: `tests/contracts/exports.contract.test.ts`
- **Abdeckung**: Component Default-Exports, Hook/Service Named-Only
- **Szenarien**: Export-Pattern Validation, Barrel Re-Export Consistency

- **Datei**: `tests/contracts/imports.usage.test.ts`
- **Abdeckung**: Import-Pattern Enforcement, Mixed-Pattern Prevention
- **Szenarien**: Default-Import Blocking, Named-Import Validation

---

## Neue Testfälle (v0.7.2)

### Pin Shift-Range Tests
- **Datei**: `src/features/board/__tests__/pin.shift-range.test.tsx`
- **Abdeckung**: Shift-Range Pinning, Entpinnen, Bereich-Konsistenz
- **Szenarien**: Einzeln, Range, Reverse-Range, Mixed-States

### Accessibility Header Tests
- **Datei**: `src/features/board/__tests__/a11y.headers.test.tsx`
- **Abdeckung**: aria-sort Korrektheit, Header-Checkbox Tri-State
- **Szenarien**: Sortable/Non-sortable Headers, Keyboard-Navigation, Screen-Reader-Support