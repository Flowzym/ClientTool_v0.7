# TODOs - Klient:innendaten-Tool

## 🚀 2025-09-14 — Konsistenz & Qualität (P0–P2)

### P0: Kritische Fixes & Validierung
- [x] Excel-Import Routing **bestätigt korrigiert** (kein PDF-Redirect; Verweis auf CHANGELOG 0.7.2 und Model Context Summary)
- [ ] TESTPLAN um **Contract-Tests für Export-Policy** erweitert (ADR-00xx)
- [ ] TESTPLAN **Coverage-Gates** explizit dokumentieren (≥85% lines/functions/statements, ≥80% branches)

### P1: Test-Infrastruktur
- [ ] Storybook-Minimal-Stories (Name/Status/ContactAttempts/Follow-up/Priority)
- [ ] Snapshots in CI
- [ ] Seeds/Admin-E2E

### P2: Performance & Monitoring
- [ ] Perf-Playground /dev/perf (Metriken/Criteria)
- [ ] Virtual Rows (>1000 Zeilen, Sticky Header)
- [ ] Status-Gate prüfen & verlinken

## 🚀 Sofortige Prioritäten (v0.7.2)

### Board-Features finalisieren
- [ ] **Notiz-System implementieren**: Dialog für Notiz-Bearbeitung (NameCell → NotesDialog)
- [ ] **Kontakt-Log erweitern**: ContactDialog mit Channel-Auswahl und Notiz-Feld
- [ ] **Follow-up-Reminder**: Überfällige Termine im Dashboard hervorheben
- [ ] **Bulk-Notizen**: Batch-Notiz-Hinzufügung für ausgewählte Clients

### Import-Pipeline robuster machen
- [ ] **HTML-Tabellen-Fallback**: Web-Portal-Downloads automatisch konvertieren
- [ ] **Magic-Bytes-Validation**: Dateiformate sicher erkennen (vs. falsche Extensions)
- [ ] **Mapping-Presets**: Pro Source-ID gespeicherte Spalten-Zuordnungen
- [ ] **Import-Fehler-CSV**: Validierungsfehler als CSV exportieren

---

## 🧪 Experimentelle Features (Opt-in)

### ✅ Virtualized Rows (v0.7.1 - Implementiert)
- [x] Feature-Flag-Steuerung aktiviert
- [x] Performance-Tests mit 1000+ Datensätzen
- [x] **Nächster Schritt**: Produktions-Evaluation → ggf. Default-Aktivierung

### 🔄 Advanced Filters (Basis vorhanden)
- [x] Chip-basierte Filter implementiert
- [ ] **Experiment**: Kombinierte Filter-Logik (AND/OR-Verknüpfungen)
- [ ] **Experiment**: Gespeicherte Filter-Sets pro Benutzer
- [ ] **Experiment**: Filter-Performance bei 5000+ Datensätzen

### 📊 Real-time Statistics (Geplant)
- [ ] **Experiment**: Live-KPI-Updates bei Board-Änderungen
- [ ] **Experiment**: Trend-Visualisierung (Chart.js lokal gebundelt)
- [ ] **Experiment**: Cohorten-Analyse nach Import-Quellen

---

## 🔧 Technische Verbesserungen

### Code-Qualität
- [ ] **Type-Coverage erhöhen**: Verbleibende `any`-Typen eliminieren
- [ ] **Bundle-Size optimieren**: Tree-shaking für Lucide-Icons
- [ ] **Memory-Leaks prüfen**: Event-Listener-Cleanup in Komponenten
- [ ] **Performance-Profiling**: React DevTools Profiler-Integration

### Testing-Lücken schließen
- [ ] **E2E-Tests**: Playwright für kritische User-Journeys
- [ ] **Visual Regression**: Screenshot-Tests für UI-Komponenten
- [ ] **Accessibility Tests**: axe-core Integration
- [ ] **Performance Tests**: Lighthouse CI für PWA-Metriken

### Developer Experience
- [ ] **Storybook**: Komponenten-Dokumentation und Isolation
- [ ] **Hot-Reload**: Vite HMR für bessere DX
- [ ] **Debug-Tools**: Redux DevTools für State-Management
- [ ] **Error Boundaries**: Graceful Error-Handling in UI

---

## 📱 PWA-Erweiterungen

### Offline-Funktionalität
- [x] Service Worker mit Cache-Strategien
- [x] Offline-Fallback-Seite
- [ ] **Background Sync**: Änderungen synchronisieren wenn online
- [ ] **Push Notifications**: Reminder für Follow-up-Termine
- [ ] **App Shortcuts**: Schnellzugriff auf häufige Aktionen

### Installation & Updates
- [ ] **Install Prompt**: Benutzerfreundliche PWA-Installation
- [ ] **Update Notifications**: Neue Versionen automatisch anzeigen
- [ ] **Offline Indicator**: Netzwerk-Status in UI
- [ ] **Storage Management**: Speicherplatz-Überwachung

---

## 🔐 Sicherheit & Compliance

### Verschlüsselung
- [x] Envelope v1 mit AES-256-GCM + Argon2id
- [x] Prod-enc/Dev-enc/Plain Modi
- [ ] **Key-Rotation**: Periodischer Schlüssel-Wechsel
- [ ] **Backup-Encryption**: Verschlüsselte Backup-Dateien
- [ ] **Audit-Trail**: Verschlüsselte Änderungs-Logs

### DSGVO-Compliance
- [x] Local-Only Verarbeitung
- [x] Network Guard gegen externe Requests
- [ ] **Löschkonzept**: Automatische Archivierung nach Zeitraum
- [ ] **Einwilligungsmanagement**: Consent für optionale Features
- [ ] **Datenminimierung**: Unnötige Felder identifizieren

---

## 🌐 Team-Synchronisation (Zukunft)

### OneDrive/SharePoint-Integration
- [x] Basis-Architektur geplant (docs/SHAREPOINT_SYNC_PLAN.md)
- [ ] **Sync-Manager**: Verschlüsselte Ordner-Synchronisation
- [ ] **Conflict Resolution**: UI für Merge-Konflikte
- [ ] **Coordinator-Rolle**: Master-Slave-Synchronisation
- [ ] **Delta-Compression**: Effiziente Änderungs-Übertragung

### Multi-User-Features
- [ ] **User-Management**: Erweiterte Rollen und Berechtigungen
- [ ] **Activity-Feed**: Änderungs-Historie pro Benutzer
- [ ] **Collaborative Editing**: Gleichzeitige Bearbeitung
- [ ] **Presence Indicators**: Wer arbeitet gerade an welchem Client

---

## 📈 Performance-Optimierungen

### Rendering-Performance
- [x] Virtualized Rows (opt-in, v0.7.1)
- [ ] **Column Virtualization**: Für sehr breite Tabellen
- [ ] **Infinite Scrolling**: Für sehr große Datasets
- [ ] **Memoization**: React.memo für teure Komponenten

### Data-Performance
- [ ] **IndexedDB-Optimierung**: Compound-Indices für Suchen
- [ ] **Lazy Loading**: Daten on-demand laden
- [ ] **Caching-Layer**: In-Memory-Cache für häufige Abfragen
- [ ] **Background Processing**: Web Workers für schwere Operationen

---

## 🎨 UI/UX-Verbesserungen

### Accessibility
- [ ] **Keyboard Navigation**: Vollständige Tastatur-Bedienung
- [ ] **Screen Reader**: ARIA-Labels und Semantik
- [ ] **High Contrast**: Themes für Sehbehinderungen
- [ ] **Focus Management**: Sichtbare Fokus-Indikatoren

### Mobile-Optimierung
- [ ] **Responsive Design**: Tablet/Mobile-Layout
- [ ] **Touch-Gestures**: Swipe-Aktionen für Mobile
- [ ] **Offline-Mobile**: PWA auf Smartphones
- [ ] **Performance**: Mobile-spezifische Optimierungen

---

## 🔍 Monitoring & Analytics

### Quality Metrics
- [x] Coverage Gates (85%+ erreicht)
- [x] ESLint 0 warnings
- [ ] **Bundle Size**: Tracking und Alerts
- [ ] **Performance Budget**: Lighthouse CI
- [ ] **Error Rates**: Crash-Reporting

### Usage Analytics
- [ ] **Feature Usage**: Welche Features werden genutzt
- [ ] **Performance Metrics**: Real-world Performance-Daten
- [ ] **Error Tracking**: Anonymisierte Fehler-Statistiken
- [ ] **A/B Testing**: Feature-Flag-basierte Experimente

---

## 🚫 Nicht-Ziele (Bewusst ausgeschlossen)

### Externe Dependencies
- ❌ **Cloud-Services**: Bleibt Local-Only
- ❌ **Analytics-Tracking**: Keine externen Analytics
- ❌ **CDN-Dependencies**: Alle Assets lokal gebundelt
- ❌ **Server-Backend**: Reine Client-Side-Anwendung

### Feature-Scope
- ❌ **CRM-Features**: Bleibt fokussiert auf Klient:innendaten
- ❌ **Billing/Invoicing**: Außerhalb des Scope
- ❌ **Document Management**: Nur Import, kein DMS
- ❌ **Communication Tools**: Keine E-Mail/SMS-Integration

---

## 📅 Zeitplan (Orientierung)

### Q1 2025: Import-Pipeline (Phase 7)
- **Januar**: Excel-Import robuster machen
- **Februar**: PDF-Import vervollständigen
- **März**: Delta-Sync optimieren

### Q2 2025: Board-Features (Phase 8)
- **April**: Notiz-System und Kontakt-Log
- **Mai**: Erweiterte Filter und Suche
- **Juni**: Performance-Optimierungen

### Q3 2025: Analytics (Phase 9)
- **Juli**: Statistische Auswertungen
- **August**: Export und Reporting
- **September**: Dashboard-Erweiterungen

### Q4 2025: Team-Features (Phase 10)
- **Oktober**: OneDrive-Sync Basis
- **November**: Conflict Resolution
- **Dezember**: Multi-User-Features

---

## 💡 Ideen-Backlog

### Innovative Features
- [ ] **AI-Assisted Mapping**: Automatische Spalten-Erkennung mit ML
- [ ] **Smart Deduplication**: Fuzzy-Matching für ähnliche Namen
- [ ] **Predictive Follow-ups**: Termine-Vorschläge basierend auf Mustern
- [ ] **Voice Notes**: Audio-Notizen mit lokaler Transkription

### Integration-Möglichkeiten
- [ ] **Calendar-Sync**: Follow-up-Termine in Outlook/Google Calendar
- [ ] **Print-Templates**: Professionelle Ausdrucke
- [ ] **QR-Codes**: Schneller Zugriff auf Client-Details
- [ ] **Barcode-Scanner**: AMS-ID-Erfassung per Kamera

---

## 🎯 Definition of Done

### Feature-Completion
- [ ] Unit-Tests mit 85%+ Coverage
- [ ] Integration-Tests für kritische Pfade
- [ ] Accessibility-Compliance (WCAG 2.1 AA)
- [ ] Performance-Budget eingehalten
- [ ] Dokumentation aktualisiert

### Quality Gates
- [ ] ESLint 0 errors, 0 warnings
- [ ] TypeScript strict mode clean
- [ ] Vitest coverage thresholds erfüllt
- [ ] Status Gate grün
- [ ] Manual QA durchgeführt

### Security & Privacy
- [ ] DSGVO-Compliance geprüft
- [ ] Encryption-Tests bestanden
- [ ] Network Guard aktiv
- [ ] Audit-Trail vollständig
- [ ] Backup/Restore getestet