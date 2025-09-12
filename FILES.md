# Geänderte Dateien - Phase 3

## Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/data/envelope.ts` | Envelope v1 Format, Base64url Utils, Validierung |
| `tests/crypto/envelope.test.ts` | Deterministische Crypto-Tests mit fixen Vektoren |
| `tests/crypto/roundtrip.test.ts` | Cross-Mode Roundtrip-Tests |

## Modifizierte Dateien

| Datei | Änderung | Grund |
|-------|----------|-------|
| `src/data/crypto.ts` | Envelope v1 Support, KDF-Methoden | Einheitliche Verschlüsselung |
| `src/data/codec.ts` | Vereinheitlichter Codec für alle Modi | Envelope v1 Integration |
| `src/utils/devKey.ts` | Base64url statt Base64 | RFC 4648 Section 5 Konformität |
| `src/features/auth/PassphraseGate.tsx` | EnvelopeError Support | Robuste Fehlerbehandlung |
| `src/data/db.ts` | Envelope v1 Validierung | Strukturvalidierung |
| `docs/SECURITY.md` | Crypto-Parameter dokumentiert | Transparenz |
| `CHANGELOG.md` | Phase 3 Eintrag | Dokumentation |
| `RUNLOG.md` | Phase 3 Logs | Dokumentation |

## Build-Status Phase 3
- ✅ ESLint: Keine Fehler
- ✅ TypeScript: Keine Fehler  
- ✅ Vite Build: Erfolgreich
- ✅ Tests: 32 passed (12 neue Crypto-Tests)
- ✅ Envelope v1 implementiert
- ✅ Plain/Dev-enc/Prod-enc Roundtrip grün
- ✅ Negative Pfade definiert

---

# Geänderte Dateien - Phase 2

## Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/features/board/hooks/useUndoRedo.ts` | Zentraler Undo/Redo Hook mit Keyboard-Support |
| `src/features/board/components/UndoRedoButtons.tsx` | UI-Komponente für Undo/Redo |
| `src/features/board/hooks/useUndoRedo.test.ts` | Unit-Tests für useUndoRedo |

## Modifizierte Dateien

| Datei | Änderung | Grund |
|-------|----------|-------|
| `src/features/board/components/BoardHeader.tsx` | UndoRedoButtons Integration | UI-Integration |
| `src/features/board/hooks/useBoardActions.ts` | useUndoRedo Integration | Zentraler Undo/Redo |
| `src/services/MutationService.ts` | Keyboard-Event Support | Undo/Redo Shortcuts |
| `CHANGELOG.md` | Phase 2 Eintrag | Dokumentation |
| `RUNLOG.md` | Phase 2 Logs | Dokumentation |

## Build-Status Phase 2
- ✅ ESLint: Keine Fehler
- ✅ TypeScript: Keine Fehler  
- ✅ Vite Build: Erfolgreich
- ✅ Tests: 15 passed (3 neue Tests)
- ✅ Undo/Redo UI implementiert
- ✅ Keyboard-Shortcuts (Ctrl+Z/Y) funktional

---

# Geänderte Dateien - Phase 1

## Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/types/patch.ts` | Zentrale Patch-Typen (Patch<T>, UndoRedoEntry<T>) |
| `src/services/MutationService.ts` | Einheitlicher Mutationsservice mit Undo/Redo |
| `src/services/MutationService.test.ts` | Unit-Tests für MutationService |
| `src/types/patch.test.ts` | Integration-Tests für Patch-Flow |

## Modifizierte Dateien

| Datei | Änderung | Grund |
|-------|----------|-------|
| `src/features/board/services/BoardService.ts` | Umleitung auf MutationService | Einheitlicher Mutationspfad |
| `src/features/board/services/PatchBuilder.ts` | Import zentrale Patch-Typen | Typ-Konsistenz |
| `src/features/board/hooks/useBoardActions.ts` | MutationService-Integration | Einheitlicher Patch-Flow |
| `src/features/board/hooks/useOptimisticOverlay.ts` | Zentrale Patch-Typen | Typ-Konsistenz |
| `src/features/board/components/BatchActionsBar.tsx` | Import zentrale Patch-Typen | Typ-Konsistenz |
| `CHANGELOG.md` | Phase 1 Eintrag | Dokumentation |
| `RUNLOG.md` | Phase 1 Logs | Dokumentation |

## Build-Status Phase 1
- ✅ ESLint: Keine Fehler
- ✅ TypeScript: Keine Fehler  
- ✅ Vite Build: Erfolgreich
- ✅ Tests: 12 passed (8 neue Tests)
- ✅ Einheitlicher Patch-Flow etabliert
- ✅ Undo/Redo konsolidiert

---

# Geänderte Dateien - Phase 0

## Modifizierte Dateien

| Datei | Änderung | Grund |
|-------|----------|-------|
| `src/domain/zod.ts` | AngebotSchema hinzugefügt | TypeScript-Fehler: Schema war referenziert aber nicht definiert |
| `src/domain/models.ts` | Role type Duplikat entfernt | TypeScript-Fehler: doppelte Type-Definition |
| `src/features/board/FollowupPicker.tsx` | Neue Datei erstellt | Import-Fehler: Komponente war referenziert aber fehlte |

## Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `CHANGELOG.md` | Changelog für Phase 0 |
| `RUNLOG.md` | Kommando-Log und Ergebnisse |
| `FILES.md` | Diese Datei - Übersicht der Änderungen |

## Build-Status
- ✅ ESLint: Keine Fehler
- ✅ TypeScript: Keine Fehler  
- ✅ Vite Build: Erfolgreich
- ✅ Alle Platzhalter beseitigt