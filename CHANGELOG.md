# Changelog

## [v0.7.3] - 2025-01-27

### Added
- feat(board): Shift-Range Pin/Unpin functionality with consistent target state application
- feat(board): Enhanced accessibility with proper aria-sort and tri-state header checkbox
- feat(board): Pinned-first sorting preservation across all sort modes
- feat(board): Stable sort pipeline with view-shim fallback for missing setView
- test(board): Comprehensive pin shift-range and accessibility header tests

### Fixed
- fix(board): Pin toggle now supports shift-click range operations
- fix(board): Header checkbox tri-state behavior with aria-checked="mixed"
- fix(board): Column headers now have correct aria-sort states for screen readers
- fix(board): Pinned clients maintain top position in all sorting scenarios
- fix(board): No more crashes on column header clicks when setView is missing
- fix(board): Removed duplicate "Offer" header, now shows single "Angebot"

### Changed
- improve(board): PinCell component now passes mouse events for shift detection
- improve(board): ColumnHeader component enhanced with proper accessibility attributes
- improve(board): Board component maintains pin anchor index for range operations
- improve(board): Headers now render in bold font for better visual hierarchy
- improve(board): Sort state management with local fallback and view shim

### Technical
- Pin range operations use consistent target state (clicked element determines range action)
- Accessibility compliance improved with proper ARIA attributes
- Pinned-first sorting pipeline preserved across all column sorts
- Sort fallback prevents crashes when view management is unavailable
- Zero breaking changes to existing pin functionality

## [v0.7.2] - 2025-01-27

### Added
- feat(board): Shift-Range Pin/Unpin functionality with consistent target state application
- feat(board): Enhanced accessibility with proper aria-sort and tri-state header checkbox
- feat(board): Pinned-first sorting preservation across all sort modes
- test(board): Comprehensive pin shift-range and accessibility header tests

### Fixed
- fix(board): Pin toggle now supports shift-click range operations
- fix(board): Header checkbox tri-state behavior with aria-checked="mixed"
- fix(board): Column headers now have correct aria-sort states for screen readers
- fix(board): Pinned clients maintain top position in all sorting scenarios

### Changed
- improve(board): PinCell component now passes mouse events for shift detection
- improve(board): ColumnHeader component enhanced with proper accessibility attributes
- improve(board): Board component maintains pin anchor index for range operations

### Technical
- Pin range operations use consistent target state (clicked element determines range action)
- Accessibility compliance improved with proper ARIA attributes
- Pinned-first sorting pipeline preserved across all column sorts
- Zero breaking changes to existing pin functionality

## [v0.7.1] - 2025-01-27

### Added
- test(export): CSV injection guards, separator/escaping/UTF8+BOM, deterministic ZIP bundling
- test(ui): Board rendering contracts (NameCell, notes badge, blue booked chip, offer column, archive icon, ARIA pin, hover/RTL)
- test(integration): Follow-up↔status auto & undo/redo pending→reconcile with service mocks
- test(policy): Export policy guards (tests + ESLint); components=default, helpers=named-only; barrel re-exports
- chore(dx): Board cleanup, ESLint harden, validators try/catch stabilize, excel-route verify, deterministic seeds
- feat(ci): GitHub Actions status workflow with build/test/lint gates
- feat(test): Vitest coverage gate with thresholds (85% lines, 85% functions, 80% branches)
- feat(tools): Status gate script with automated red/yellow flag detection
- test(board): Comprehensive test suite for optimistic updates, CSV/ZIP utils, rendering
- test(integration): Status↔Follow-up, Undo/Redo, Selection/Batch operation tests
- test(guards): Export policy contract tests and import usage validation
- test(perf): Virtual rows behind feature flag (default off) + sticky/focus smokes

### Fixed
- fix(board): setOffer patch flow implementation and OfferCell wiring
- fix(board): React hook order violations by extracting helpers into components
- fix(board): React.lazy mapping for ClientRowVirtualized with robust default export
- fix(import): Excel file routing to prevent PDF handler conflicts
- fix(lint): Removed all unused imports across codebase (0 warnings achieved)
- fix(types): Import resolution errors for canUndo/canRedo functions

### Changed
- refactor(board): Extracted ClassicClientList and VirtualClientList components
- refactor(board): Improved virtualization with proper Suspense boundaries
- improve(test): Enhanced test coverage with unit, integration, and guard tests
- improve(ci): Automated ESLint fixes in CI pipeline

### Technical
- Coverage thresholds enforced via Vitest V8 provider
- Export policy compliance with automated contract validation
- Hook order stability guards prevent React warnings
- Comprehensive Excel/PDF routing with edge case handling
- Zero new runtime dependencies

## [Phase 4] - 2025-01-27

### Added
- feat(pwa): offline-fallback, cache-strategien, cache-invalidierung; same-origin guard
- Offline-Fallback-Seite (/offline.html) für Netzwerkausfälle
- Service Worker mit Cache-Strategien: Network-First (Navigation), Cache-First (Assets)
- Same-Origin Guard verhindert Caching externer Ressourcen
- SW-Logic als pure Functions für Unit-Tests extrahiert
- Automatische Cache-Invalidierung bei Version-Updates

### Technical
- Cache-Namen versioniert (v0.8-pwa-1)
- Robuste Precaching mit Fehlertoleranz
- Offline-Tests für SW-Logic-Functions

## [Phase 3] - 2025-01-27

### Added
- feat(crypto): Envelope v1 implementiert mit AES-256-GCM und Argon2id-KDF
- Einheitliche Verschlüsselung für plain/dev-enc/prod-enc Modi
- Base64url-Encoding für alle binären Daten (RFC 4648 Section 5)
- Deterministische Crypto-Tests mit fixen Test-Vektoren
- Robuste Fehlerbehandlung für negative Pfade (falsche Passphrase, manipulierte Daten)

### Changed
- CryptoManager nutzt Envelope v1 Format
- Codec-Layer vereinheitlicht für alle Encryption-Modi
- PassphraseGate verwendet EnvelopeError für bessere Fehlerbehandlung

### Technical
- KDF-Parameter: Argon2id (t=3, m=64MB, p=1, 32-byte Output)
- AES-GCM: 256-bit Key, 96-bit IV, authentifizierte Verschlüsselung
- Keine API-Brüche: Legacy-Methoden bleiben kompatibel
- Roundtrip-Tests für alle Modi erfolgreich

## [Phase 2] - 2025-01-27

### Added
- feat(crypto): Envelope v1 implementiert mit AES-256-GCM und Argon2id-KDF
- Einheitliche Verschlüsselung für plain/dev-enc/prod-enc Modi
- Base64url-Encoding für alle binären Daten (RFC 4648 Section 5)
- Deterministische Crypto-Tests mit fixen Test-Vektoren
- Robuste Fehlerbehandlung für negative Pfade (falsche Passphrase, manipulierte Daten)

### Changed
- CryptoManager nutzt Envelope v1 Format
- Codec-Layer vereinheitlicht für alle Encryption-Modi
- PassphraseGate verwendet EnvelopeError für bessere Fehlerbehandlung

### Technical
- KDF-Parameter: Argon2id (t=3, m=64MB, p=1, 32-byte Output)
- AES-GCM: 256-bit Key, 96-bit IV, authentifizierte Verschlüsselung
- Keine API-Brüche: Legacy-Methoden bleiben kompatibel
- Roundtrip-Tests für alle Modi erfolgreich

## [Phase 1] - 2025-01-27

### Added
- feat(core): Patch-Flow vereinheitlicht, Undo/Redo konsolidiert
- Zentrale Patch-Typen in src/types/patch.ts
- MutationService als einziger Mutationspfad
- Undo/Redo-Stack-Management mit automatischer Inverse-Patch-Generierung
- Unit- und Integration-Tests für Patch-Flow

### Changed
- BoardService nutzt jetzt MutationService statt direkte DB-Zugriffe
- useBoardActions verwendet einheitliche Patch-Typen
- Alle UI-Mutationen laufen über zentralen Service

### Technical
- Keine API-Brüche: bestehende Signaturen bleiben kompatibel
- UI-Verhalten unverändert
- Encryption-Feature-Flags unverändert

## [Phase 0] - 2025-01-27

### Fixed
- fix(phase-0): build grün, platzhalter entfernt, sw minimal repariert
- Fehlende AngebotSchema in domain/zod.ts ergänzt
- Role type Duplikat in domain/models.ts bereinigt
- FollowupPicker.tsx implementiert (war referenziert aber fehlte)
- Build-Prozess erfolgreich: lint, typecheck, build → grün

### Technical
- Keine neuen Dependencies
- Keine API-Brüche
- Encryption-Feature-Flags unverändert
- Service Worker bleibt minimal funktional