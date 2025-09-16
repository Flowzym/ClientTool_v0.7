# Implementation Log

## v0.7.4 - Dexie Hook Persistence Fix (2025-01-27)

### P14: Critical Dexie Hook Corrections
**Files**: `src/data/db.ts` (updating/creating hooks for clients/users/importSessions)
**Impact**: Fixed fundamental persistence failure affecting all Board mutations

**Root Cause**: Dexie `updating` hooks incorrectly used `mods` (partial modifications) + `oldVal` merge instead of `obj` (complete new object passed to put()). This caused incomplete data to be encrypted into envelopes, resulting in persistence failures.

**Technical Details**:
- **Before**: `const nextPlain = { ...plainOld, ...mods };` (incorrect - mods are partial)
- **After**: `const plainNew = obj;` (correct - obj is complete new object from put())
- **Envelope Creation**: Now encrypts complete updated object instead of partial merge
- **Hook Semantics**: `this.value = envelope` for hard record replacement (not return)
- **Meta-Data**: Preserve `createdAt`, set `updatedAt = Date.now()` on modifications

**Affected Operations**: All Board mutations (pin/unpin, priority cycling, status changes, contact attempts, assignments, follow-up dates) now persist correctly.

**Testing**: Added minimal persistence tests (`src/__tests__/db.persist.clients.test.ts`) and UI smoke tests (`src/features/board/__tests__/board.persist.smoke.test.tsx`) to validate fix.

## v0.7.1 - Board Stabilization & Testing (2025-01-27)

### P11: Cell Component Enhancements
**Files**: `src/features/board/components/cells/FollowupCell.tsx`, `ContactAttemptsCell.tsx`, `PriorityCell.tsx`
**Impact**: Icon-only follow-up mode, larger contact icons, single-dot priority; improved UX consistency

### P12: Export Policy Enforcement
**Files**: `tests/contracts/exports.contract.test.ts`, `tests/contracts/imports.usage.test.ts`, `eslint.config.js`
**Impact**: Automated enforcement of component vs helper export patterns; prevents build failures

### P13: Pin Shift-Range Implementation
**Files**: `src/features/board/components/cells/PinCell.tsx`, `Board.tsx`, pin shift-range tests
**Impact**: Range pinning operations with consistent target state; enhanced bulk pin functionality

### P6: Export Policy Guards & Contract Testing
**Files**: `src/__tests__/exports.contract.test.ts`, `src/__tests__/imports.usage.test.ts`, `eslint.config.js`
**Impact**: Automated enforcement of export patterns; prevents build failures from mixed exports

### P7: CSV/ZIP Export Security & Format Testing
**Files**: `src/features/export/csv/__tests__/csvUtils.test.ts`, `src/features/export/zip/__tests__/zipUtils.test.ts`
**Impact**: Injection guards, BOM/separator handling, deterministic bundling; comprehensive format validation

### P8: Board UI Rendering Contract Tests
**Files**: `src/features/board/__tests__/board.rendering.test.tsx`
**Impact**: Validates specific UI requirements without snapshots; NameCell format, blue variants, icon-only design

### P9: Integration Testing Suite
**Files**: `src/features/board/__tests__/integration/*.test.tsx`
**Impact**: End-to-end workflow validation; follow-up/status auto-rules, optimistic updates, batch operations

### P10: Performance Flag Safeguards
**Files**: `src/features/board/__tests__/perf.flag.test.ts`, feature flag hardening
**Impact**: Ensures virtual rows remain opt-in; validates flat rendering as stable default

### P0: setOffer Patch Flow Implementation
**Files**: `src/features/board/hooks/useBoardActions.ts`, `src/features/board/components/cells/OfferCell.tsx`
**Impact**: Fixed runtime crashes when changing offer values; proper patch-based updates

### P1: React Hook Order Stabilization  
**Files**: `src/features/board/Board.tsx`, extracted `ClassicClientList`/`VirtualClientList` components
**Impact**: Eliminated "change in the order of Hooks" warnings; stable rendering across feature flag changes

### P2: React.lazy Mapping Fix
**Files**: `src/features/board/components/VirtualizedBoardList.tsx`, `src/features/board/components/ClientRow.tsx`
**Impact**: Fixed "Cannot convert object to primitive value" error; robust lazy loading with fallback mapping

### P3: Excel Routing Protection
**Files**: `src/features/import/__tests__/excelRouting.test.ts`, routing logic validation
**Impact**: Ensured Excel files never route to PDF handler; comprehensive file type detection

### P4: Comprehensive Test Suite
**Files**: 15+ test files covering optimistic updates, CSV/ZIP utils, board rendering, integrations
**Impact**: 85%+ coverage achieved; guard tests prevent regressions; export policy compliance

### P5: CI/CD & Quality Gates
**Files**: `.github/workflows/status.yml`, `vitest.config.ts`, `scripts/status-gate.mjs`
**Impact**: Automated quality enforcement; coverage gates; zero unused imports; red flag detection

---

## Previous Phases

### Phase 4 - PWA & Offline (2025-01-27)
**Files**: `public/sw.js`, `src/sw/logic.ts`, `public/offline.html`, `docs/OFFLINE.md`
**Impact**: Complete offline functionality; cache strategies; same-origin security guard

### Phase 3 - Crypto Envelope v1 (2025-01-27)
**Files**: `src/data/envelope.ts`, `src/data/crypto.ts`, `src/data/codec.ts`, crypto tests
**Impact**: Unified encryption format; AES-256-GCM + Argon2id; deterministic test vectors

### Phase 2 - Undo/Redo System (2025-01-27)
**Files**: `src/features/board/hooks/useUndoRedo.ts`, `src/features/board/components/UndoRedoButtons.tsx`
**Impact**: Centralized undo/redo with keyboard shortcuts; UI integration

### Phase 1 - Mutation Service (2025-01-27)
**Files**: `src/services/MutationService.ts`, `src/types/patch.ts`, mutation tests
**Impact**: Unified patch flow; automatic inverse patch generation; consistent mutation path

### Phase 0 - Build Foundation (2025-01-27)
**Files**: `src/domain/zod.ts`, `src/domain/models.ts`, `src/features/board/FollowupPicker.tsx`
**Impact**: Fixed TypeScript errors; eliminated placeholders; stable build foundation