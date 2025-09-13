# Changelog

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