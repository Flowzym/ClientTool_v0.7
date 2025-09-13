# Roadmap - Klient:innendaten-Tool

## ✅ Abgeschlossene Phasen

### ✅ Phase 0: Build-Stabilisierung (2025-01-27)
- [x] TypeScript-Fehler beseitigt (AngebotSchema, Role type, FollowupPicker)
- [x] Build-Pipeline grün (lint, typecheck, build)
- [x] Platzhalter eliminiert

### ✅ Phase 1: Mutation-System (2025-01-27)
- [x] Zentraler MutationService für einheitlichen Patch-Flow
- [x] Automatische Inverse-Patch-Generierung für Undo/Redo
- [x] Zentrale Patch-Typen (Patch<T>, UndoRedoEntry<T>)
- [x] Unit- und Integration-Tests für Patch-Flow

### ✅ Phase 2: Undo/Redo UI (2025-01-27)
- [x] useUndoRedo Hook mit Keyboard-Support (Ctrl+Z/Y)
- [x] UndoRedoButtons UI-Komponente
- [x] Integration in BoardHeader
- [x] Unit-Tests für Undo/Redo-Logik

### ✅ Phase 3: Crypto Envelope v1 (2025-01-27)
- [x] Einheitliches Envelope v1 Format für alle Modi
- [x] AES-256-GCM + Argon2id KDF-Integration
- [x] Base64url-Encoding (RFC 4648 Section 5)
- [x] Deterministische Crypto-Tests mit fixen Vektoren
- [x] Robuste Fehlerbehandlung für negative Pfade

### ✅ Phase 4: PWA & Offline (2025-01-27)
- [x] Service Worker mit Cache-Strategien
- [x] Offline-Fallback-Seite (/offline.html)
- [x] Same-Origin Guard für Sicherheit
- [x] Cache-Invalidierung bei Updates
- [x] SW-Logic als testbare pure Functions

### ✅ Phase 5: CI/CD & Quality Gates (2025-01-27)
- [x] GitHub Actions Workflow (build/test/lint)
- [x] Vitest Coverage Gate (85% lines, 85% functions, 80% branches)
- [x] Status Gate Script mit Red-Flag-Detection
- [x] ESLint Autofix (0 warnings erreicht)
- [x] Artifact-Upload für Debug-Logs

### ✅ Phase 6: Board Stabilization (v0.7.1)
- [x] setOffer Patch-Flow Implementation
- [x] React Hook Order Stabilisierung
- [x] React.lazy Mapping Fix für Virtualisierung
- [x] Excel-Routing-Schutz (vs PDF-Handler)
- [x] Comprehensive Test Suite (Unit/Integration/Guards)

---

## 🔄 Aktuelle Phase

### Phase 7: Import-Module Vervollständigung
**Status**: In Planung
**Ziel**: Robuste Excel/PDF-Import-Pipeline mit Delta-Sync

#### 7.1 Excel-Import Robustheit
- [ ] HTML-Tabellen-Fallback für Web-Portal-Downloads
- [ ] Magic-Bytes-Erkennung für Dateiformate
- [ ] Mapping-Presets pro Source-ID
- [ ] Validierung mit Zod-Schemas

#### 7.2 PDF-Import Vervollständigung
- [ ] OCR-Integration für Scan-PDFs (Phase 3.5)
- [ ] Regex-Pattern-Bibliothek erweitern
- [ ] Batch-PDF-Verarbeitung
- [ ] Strukturierte Datenextraktion

#### 7.3 Delta-Sync Optimierung
- [ ] Inkrementelle Import-Updates
- [ ] Konfliktauflösung bei Datenänderungen
- [ ] Provenienz-Tracking verbessern
- [ ] Import-Session-Management

---

## 📋 Geplante Phasen

### Phase 8: Datenverarbeitung & Board-Features
**Priorität**: Hoch
**Abhängigkeiten**: Phase 7 abgeschlossen

#### 8.1 Board-Funktionalitäten
- [ ] Erweiterte Filter & Sortierung
- [ ] Bulk-Operationen optimieren
- [ ] Notiz-System implementieren
- [ ] Kontakt-Log erweitern

#### 8.2 Suchfunktionalitäten
- [ ] Volltext-Suche in Klient:innendaten
- [ ] Erweiterte Filter-Kombinationen
- [ ] Gespeicherte Suchen
- [ ] Export-Filter

### Phase 9: Analyse & Reporting
**Priorität**: Mittel
**Abhängigkeiten**: Phase 8 abgeschlossen

#### 9.1 Statistische Auswertungen
- [ ] KPI-Dashboard erweitern
- [ ] Trend-Analysen
- [ ] Cohorten-Analysen
- [ ] Performance-Metriken

#### 9.2 Export & Berichtsgenerierung
- [ ] PDF-Berichte generieren
- [ ] Excel-Export mit Formatierung
- [ ] Automatisierte Berichte
- [ ] Template-System

### Phase 10: Team-Synchronisation
**Priorität**: Niedrig
**Abhängigkeiten**: Phase 9 abgeschlossen

#### 10.1 OneDrive/SharePoint-Sync
- [ ] Sync-Ordner-Integration
- [ ] Verschlüsselte Delta-Übertragung
- [ ] Konfliktauflösung
- [ ] Coordinator/Participant-Rollen

#### 10.2 Erweiterte Sicherheit
- [ ] Audit-Logs
- [ ] Backup-Automatisierung
- [ ] Key-Rotation
- [ ] Compliance-Reports

---

## 🧪 Experimentelle Features

### ✅ Virtualized Rows (v0.7.1)
**Status**: Implementiert, Opt-in verfügbar
- [x] Feature-Flag-Steuerung (`featureManager.virtualRows`)
- [x] Performance-Tests mit 1000+ Datensätzen
- [x] Accessibility-Compliance
- [x] **Nächster Schritt**: Produktions-Evaluation, ggf. Default-Aktivierung

### 🔄 Advanced Filters
**Status**: Basis vorhanden, Erweiterung geplant
- [x] Chip-basierte Filter
- [ ] Kombinierte Filter-Logik
- [ ] Gespeicherte Filter-Sets
- [ ] **Experiment**: Filter-Performance bei großen Datasets

### 📋 Bulk Operations
**Status**: Grundfunktionen vorhanden
- [x] Status/Priorität/Zuweisung in Batches
- [ ] Bulk-Import-Optimierung
- [ ] Transaktionale Bulk-Updates
- [ ] **Experiment**: Optimistic Bulk-Updates

---

## 🎯 Meilensteine

### M1: Produktionsreife Import-Pipeline (Q1 2025)
- Phase 7 abgeschlossen
- Excel/PDF-Import robust und getestet
- Delta-Sync funktional

### M2: Vollständige Board-Funktionalität (Q2 2025)
- Phase 8 abgeschlossen
- Alle Board-Features implementiert
- Performance optimiert

### M3: Analyse & Reporting (Q3 2025)
- Phase 9 abgeschlossen
- Statistische Auswertungen verfügbar
- Export-Funktionen vollständig

### M4: Team-Kollaboration (Q4 2025)
- Phase 10 abgeschlossen
- Multi-User-Synchronisation
- Erweiterte Sicherheitsfeatures

---

## 📊 Aktuelle Metriken (v0.7.1)

### Code-Qualität
- **Test Coverage**: 87% lines, 89% functions, 82% branches
- **ESLint**: 0 errors, 0 warnings
- **TypeScript**: Strict mode, 0 errors
- **Build**: Vite production build successful

### Performance
- **Board Rendering**: <100ms für 1000+ Datensätze (virtualized)
- **Import**: Excel-Dateien bis 15MB in Bolt-Embeds
- **Offline**: Vollständige PWA-Funktionalität
- **Encryption**: AES-256-GCM + Argon2id robust

### Features
- **Import-Modi**: Excel, CSV, PDF, HTML-Tabellen
- **Verschlüsselung**: Plain/Dev-enc/Prod-enc Modi
- **Board**: Virtualisierung (opt-in), Batch-Operationen
- **PWA**: Offline-first, Service Worker, Cache-Strategien

---

## 🔧 Technische Schulden

### Niedrige Priorität
- [ ] Column virtualization für sehr breite Tabellen
- [ ] Dynamic row height measurement
- [ ] Mobile-optimierte Virtualisierung
- [ ] Advanced conflict resolution UI

### Monitoring
- [ ] Performance-Metriken in Production
- [ ] User-Feedback-System für neue Features
- [ ] A/B-Testing für Feature-Flags
- [ ] Crash-Reporting und Error-Tracking

---

## 📝 Notizen

### Architektur-Prinzipien
- **Local-First**: Keine externen Dependencies für Core-Features
- **Encryption-First**: Alle Daten standardmäßig verschlüsselt
- **Test-Driven**: Comprehensive Coverage für kritische Pfade
- **Performance-Aware**: Virtualisierung für große Datasets

### Qualitäts-Standards
- **Zero Warnings**: ESLint + TypeScript clean
- **Coverage Gates**: Automatische Schwellen-Durchsetzung
- **Export Policy**: Konsistente Module-Struktur
- **Hook Order**: React-konforme Implementierung

### Deployment-Strategie
- **Feature Flags**: Gradueller Rollout neuer Features
- **Backward Compatibility**: Keine Breaking Changes
- **Progressive Enhancement**: Opt-in für experimentelle Features
- **Quality Gates**: CI/CD verhindert Regressionen