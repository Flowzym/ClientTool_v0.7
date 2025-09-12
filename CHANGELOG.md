# Changelog

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