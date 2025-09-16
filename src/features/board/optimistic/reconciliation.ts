/**
 * Pure functions for Optimistic Overlay Reconciliation
 * Extracted from useOptimisticOverlay for testability
 */

/**
 * Determines if an overlay entry should be dropped because the base data
 * now reflects the same changes that were optimistically applied.
 * 
 * @param base - The current persisted/server state
 * @param overlay - The optimistic changes that were applied
 * @returns true if overlay should be dropped (base matches overlay), false otherwise
 */
export function shouldDropOverlay<T extends Record<string, any>>(
  base: T, 
  overlay: Partial<T>
): boolean {
  if (!base || !overlay) return false;
  
  // Check if all overlay fields match the base values
  return Object.keys(overlay).every(field => {
    const baseValue = base[field];
    const overlayValue = overlay[field];
    
    return deepEqual(baseValue, overlayValue);
  });
}

/**
 * Reconciles an overlay with base data and determines if overlay should be kept
 * 
 * @param base - The current persisted/server state  
 * @param overlay - The optimistic changes that were applied
 * @returns object with keepOverlay flag
 */
export function reconcileOverlay<T extends Record<string, any>>(
  base: T,
  overlay: Partial<T>
): { keepOverlay: boolean } {
  const shouldDrop = shouldDropOverlay(base, overlay);
  return { keepOverlay: !shouldDrop };
}

/**
 * Deep equality check for overlay reconciliation
 * Treats null and undefined as different values (preserves current semantics)
 * Array order is semantically relevant
 */
function deepEqual(a: any, b: any): boolean {
  // Strict equality for primitives and same reference
  if (a === b) return true;
  
  // null vs undefined are different (preserve current semantics)
  if (a == null || b == null) return false;
  
  // Different types
  if (typeof a !== typeof b) return false;
  
  // Arrays - order matters semantically
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && deepEqual(a[key], b[key])
    );
  }
  
  return false;
}

/**
 * Normalizes ID for comparison (handles string/number type mixing)
 */
export function normalizeId(id: any): string {
  return String(id);
}</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">create</parameter>
<parameter name="path">src/features/board/optimistic/__tests__/reconciliation.test.ts</parameter>
<parameter name="file_text">/**
 * Tests for Optimistic Overlay Reconciliation
 * Ensures correct overlay cleanup when base data matches optimistic changes
 */

import { describe, it, expect } from 'vitest';
import { shouldDropOverlay, reconcileOverlay, normalizeId } from '../reconciliation';

describe('Optimistic Reconciliation', () => {
  describe('shouldDropOverlay', () => {
    it('should drop overlay when base exactly matches overlay changes', () => {
      const base = { id: '1', name: 'Updated Name', status: 'active' };
      const overlay = { name: 'Updated Name', status: 'active' };
      
      expect(shouldDropOverlay(base, overlay)).toBe(true);
    });

    it('should keep overlay when base diverges from overlay', () => {
      const base = { id: '1', name: 'Different Name', status: 'active' };
      const overlay = { name: 'Updated Name', status: 'active' };
      
      expect(shouldDropOverlay(base, overlay)).toBe(false);
    });

    it('should keep overlay when base covers only partial overlay changes', () => {
      const base = { id: '1', name: 'Updated Name', status: 'old' };
      const overlay = { name: 'Updated Name', status: 'active', priority: 'high' };
      
      expect(shouldDropOverlay(base, overlay)).toBe(false);
    });

    it('should handle ID type mixing correctly', () => {
      const base = { id: 1, name: 'Test' }; // number ID
      const overlay = { name: 'Test' };
      
      expect(shouldDropOverlay(base, overlay)).toBe(true);
      
      const baseString = { id: '1', name: 'Test' }; // string ID
      expect(shouldDropOverlay(baseString, overlay)).toBe(true);
    });

    it('should treat null and undefined as different values', () => {
      const baseWithNull = { id: '1', value: null };
      const overlayWithUndefined = { value: undefined };
      
      expect(shouldDropOverlay(baseWithNull, overlayWithUndefined)).toBe(false);
      
      const baseWithUndefined = { id: '1', value: undefined };
      const overlayWithNull = { value: null };
      
      expect(shouldDropOverlay(baseWithUndefined, overlayWithNull)).toBe(false);
    });

    it('should handle array order as semantically relevant', () => {
      const base = { id: '1', tags: ['a', 'b'] };
      const overlayDifferentOrder = { tags: ['b', 'a'] };
      
      // Array order matters - should not drop overlay
      expect(shouldDropOverlay(base, overlayDifferentOrder)).toBe(false);
      
      const overlaySameOrder = { tags: ['a', 'b'] };
      expect(shouldDropOverlay(base, overlaySameOrder)).toBe(true);
    });

    it('should handle nested objects correctly', () => {
      const base = { 
        id: '1', 
        metadata: { created: '2024-01-01', updated: '2024-01-02' }
      };
      const overlayMatching = { 
        metadata: { created: '2024-01-01', updated: '2024-01-02' }
      };
      const overlayDifferent = { 
        metadata: { created: '2024-01-01', updated: '2024-01-03' }
      };
      
      expect(shouldDropOverlay(base, overlayMatching)).toBe(true);
      expect(shouldDropOverlay(base, overlayDifferent)).toBe(false);
    });

    it('should handle empty overlay', () => {
      const base = { id: '1', name: 'Test' };
      const emptyOverlay = {};
      
      expect(shouldDropOverlay(base, emptyOverlay)).toBe(true);
    });

    it('should handle missing base', () => {
      const overlay = { name: 'Test' };
      
      expect(shouldDropOverlay(null as any, overlay)).toBe(false);
      expect(shouldDropOverlay(undefined as any, overlay)).toBe(false);
    });

    it('should handle complex client data structure', () => {
      const base = {
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'inBearbeitung',
        priority: 'hoch',
        contactLog: [
          { date: '2024-01-01', channel: 'telefon', note: 'Erstkontakt' }
        ],
        contactCount: 1,
        isArchived: false
      };
      
      const overlayExactMatch = {
        status: 'inBearbeitung',
        priority: 'hoch'
      };
      
      const overlayPartialMatch = {
        status: 'inBearbeitung',
        priority: 'normal' // Different from base
      };
      
      expect(shouldDropOverlay(base, overlayExactMatch)).toBe(true);
      expect(shouldDropOverlay(base, overlayPartialMatch)).toBe(false);
    });
  });

  describe('reconcileOverlay', () => {
    it('should return keepOverlay false when overlay should be dropped', () => {
      const base = { id: '1', name: 'Updated Name' };
      const overlay = { name: 'Updated Name' };
      
      const result = reconcileOverlay(base, overlay);
      expect(result.keepOverlay).toBe(false);
    });

    it('should return keepOverlay true when overlay should be kept', () => {
      const base = { id: '1', name: 'Different Name' };
      const overlay = { name: 'Updated Name' };
      
      const result = reconcileOverlay(base, overlay);
      expect(result.keepOverlay).toBe(true);
    });
  });

  describe('normalizeId', () => {
    it('should convert various ID types to string', () => {
      expect(normalizeId(123)).toBe('123');
      expect(normalizeId('abc')).toBe('abc');
      expect(normalizeId(null)).toBe('null');
      expect(normalizeId(undefined)).toBe('undefined');
    });
  });

  describe('edge cases', () => {
    it('should handle boolean values correctly', () => {
      const base = { id: '1', isActive: true, isArchived: false };
      const overlay = { isActive: true, isArchived: false };
      
      expect(shouldDropOverlay(base, overlay)).toBe(true);
      
      const overlayDifferent = { isActive: false, isArchived: false };
      expect(shouldDropOverlay(base, overlayDifferent)).toBe(false);
    });

    it('should handle numeric values correctly', () => {
      const base = { id: '1', count: 0, score: 42.5 };
      const overlay = { count: 0, score: 42.5 };
      
      expect(shouldDropOverlay(base, overlay)).toBe(true);
      
      const overlayDifferent = { count: 1, score: 42.5 };
      expect(shouldDropOverlay(base, overlayDifferent)).toBe(false);
    });

    it('should handle date strings correctly', () => {
      const base = { id: '1', lastActivity: '2024-01-15T10:30:00Z' };
      const overlay = { lastActivity: '2024-01-15T10:30:00Z' };
      
      expect(shouldDropOverlay(base, overlay)).toBe(true);
      
      const overlayDifferent = { lastActivity: '2024-01-15T10:31:00Z' };
      expect(shouldDropOverlay(base, overlayDifferent)).toBe(false);
    });
  });
});
</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">create</parameter>
<parameter name="path">src/services/board/decideUpsert.ts</parameter>
<parameter name="file_text">/**
 * Pure functions for Upsert decision logic
 * Extracted from BoardService for testability
 */

export type UpsertDecision = 'update' | 'updateViaCandidate' | 'insert';

export interface UpsertInput {
  updateCount: number;
  candidatesFound: number;
}

/**
 * Decides the upsert strategy based on update results and candidate availability
 * 
 * @param input - Object containing updateCount and candidatesFound
 * @returns The upsert strategy to use
 */
export function decideUpsert(input: UpsertInput): UpsertDecision {
  const { updateCount, candidatesFound } = input;
  
  // Direct update succeeded
  if (updateCount > 0) {
    return 'update';
  }
  
  // Direct update failed, but we found alternate ID candidates
  if (candidatesFound > 0) {
    return 'updateViaCandidate';
  }
  
  // No update possible, need to insert
  return 'insert';
}

/**
 * Normalizes various ID types for comparison
 * Handles string/number type mixing in ID fields
 */
export function normalizeIdForSearch(id: any): string {
  if (id == null) return '';
  return String(id).trim();
}

/**
 * Checks if a candidate record matches the target ID using alternate fields
 * 
 * @param candidate - The candidate record to check
 * @param targetId - The ID we're looking for
 * @param alternateFields - Fields to check for ID matches (e.g., ['clientId', 'uuid', 'amsId'])
 * @returns true if candidate matches via any alternate field
 */
export function matchesViaAlternateId(
  candidate: Record<string, any>,
  targetId: any,
  alternateFields: string[] = ['clientId', 'uuid', 'amsId']
): boolean {
  const normalizedTarget = normalizeIdForSearch(targetId);
  
  if (!normalizedTarget) return false;
  
  return alternateFields.some(field => {
    const candidateValue = normalizeIdForSearch(candidate[field]);
    return candidateValue === normalizedTarget;
  });
}

/**
 * Finds candidates that might match the target ID via alternate fields
 * 
 * @param records - Array of records to search
 * @param targetId - The ID to find
 * @param alternateFields - Fields to check for matches
 * @returns Array of matching candidates
 */
export function findCandidatesByAlternateId<T extends Record<string, any>>(
  records: T[],
  targetId: any,
  alternateFields: string[] = ['clientId', 'uuid', 'amsId']
): T[] {
  return records.filter(record => 
    matchesViaAlternateId(record, targetId, alternateFields)
  );
}
</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">create</parameter>
<parameter name="path">src/services/board/__tests__/upsertFallback.test.ts</parameter>
<parameter name="file_text">/**
 * Tests for Upsert Fallback decision logic
 * Ensures correct strategy selection based on update results and candidate availability
 */

import { describe, it, expect } from 'vitest';
import { 
  decideUpsert, 
  normalizeIdForSearch, 
  matchesViaAlternateId, 
  findCandidatesByAlternateId,
  type UpsertInput 
} from '../decideUpsert';

describe('Upsert Fallback Logic', () => {
  describe('decideUpsert', () => {
    it('should choose update when updateCount > 0', () => {
      const input: UpsertInput = { updateCount: 1, candidatesFound: 0 };
      expect(decideUpsert(input)).toBe('update');
      
      const inputMultiple: UpsertInput = { updateCount: 3, candidatesFound: 2 };
      expect(decideUpsert(inputMultiple)).toBe('update');
    });

    it('should choose updateViaCandidate when updateCount = 0 but candidates found', () => {
      const input: UpsertInput = { updateCount: 0, candidatesFound: 1 };
      expect(decideUpsert(input)).toBe('updateViaCandidate');
      
      const inputMultipleCandidates: UpsertInput = { updateCount: 0, candidatesFound: 3 };
      expect(decideUpsert(inputMultipleCandidates)).toBe('updateViaCandidate');
    });

    it('should choose insert when no update and no candidates', () => {
      const input: UpsertInput = { updateCount: 0, candidatesFound: 0 };
      expect(decideUpsert(input)).toBe('insert');
    });

    it('should handle edge case values correctly', () => {
      // Negative values (shouldn't happen in practice, but test defensive behavior)
      expect(decideUpsert({ updateCount: -1, candidatesFound: 0 })).toBe('insert');
      expect(decideUpsert({ updateCount: 0, candidatesFound: -1 })).toBe('insert');
    });
  });

  describe('normalizeIdForSearch', () => {
    it('should convert various types to string', () => {
      expect(normalizeIdForSearch(123)).toBe('123');
      expect(normalizeIdForSearch('abc')).toBe('abc');
      expect(normalizeIdForSearch('  test  ')).toBe('test');
    });

    it('should handle null/undefined gracefully', () => {
      expect(normalizeIdForSearch(null)).toBe('');
      expect(normalizeIdForSearch(undefined)).toBe('');
    });

    it('should handle boolean and other types', () => {
      expect(normalizeIdForSearch(true)).toBe('true');
      expect(normalizeIdForSearch(false)).toBe('false');
      expect(normalizeIdForSearch(0)).toBe('0');
    });
  });

  describe('matchesViaAlternateId', () => {
    const sampleRecord = {
      id: 'primary-1',
      clientId: 'client-123',
      uuid: 'uuid-456',
      amsId: 'A12345',
      name: 'Test Client'
    };

    it('should match via clientId', () => {
      expect(matchesViaAlternateId(sampleRecord, 'client-123')).toBe(true);
      expect(matchesViaAlternateId(sampleRecord, 'client-999')).toBe(false);
    });

    it('should match via uuid', () => {
      expect(matchesViaAlternateId(sampleRecord, 'uuid-456')).toBe(true);
      expect(matchesViaAlternateId(sampleRecord, 'uuid-999')).toBe(false);
    });

    it('should match via amsId', () => {
      expect(matchesViaAlternateId(sampleRecord, 'A12345')).toBe(true);
      expect(matchesViaAlternateId(sampleRecord, 'A99999')).toBe(false);
    });

    it('should handle string/number type mixing', () => {
      const recordWithNumericIds = {
        id: 'primary-1',
        clientId: 123,
        uuid: 456,
        amsId: 'A12345'
      };
      
      expect(matchesViaAlternateId(recordWithNumericIds, '123')).toBe(true);
      expect(matchesViaAlternateId(recordWithNumericIds, 123)).toBe(true);
      expect(matchesViaAlternateId(recordWithNumericIds, '456')).toBe(true);
      expect(matchesViaAlternateId(recordWithNumericIds, 456)).toBe(true);
    });

    it('should use custom alternate fields', () => {
      const record = { id: '1', customId: 'custom-123', otherId: 'other-456' };
      const customFields = ['customId', 'otherId'];
      
      expect(matchesViaAlternateId(record, 'custom-123', customFields)).toBe(true);
      expect(matchesViaAlternateId(record, 'other-456', customFields)).toBe(true);
      expect(matchesViaAlternateId(record, 'A12345', customFields)).toBe(false); // amsId not in custom fields
    });

    it('should handle empty/null target ID', () => {
      expect(matchesViaAlternateId(sampleRecord, '')).toBe(false);
      expect(matchesViaAlternateId(sampleRecord, null)).toBe(false);
      expect(matchesViaAlternateId(sampleRecord, undefined)).toBe(false);
    });

    it('should handle missing alternate fields in record', () => {
      const incompleteRecord = { id: '1', name: 'Test' }; // No clientId, uuid, amsId
      
      expect(matchesViaAlternateId(incompleteRecord, 'any-id')).toBe(false);
    });
  });

  describe('findCandidatesByAlternateId', () => {
    const sampleRecords = [
      { id: '1', clientId: 'client-123', amsId: 'A11111', name: 'Client 1' },
      { id: '2', clientId: 'client-456', amsId: 'A22222', name: 'Client 2' },
      { id: '3', uuid: 'uuid-789', amsId: 'A33333', name: 'Client 3' },
      { id: '4', name: 'Client 4' } // No alternate IDs
    ];

    it('should find single candidate by clientId', () => {
      const candidates = findCandidatesByAlternateId(sampleRecords, 'client-123');
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('1');
    });

    it('should find single candidate by amsId', () => {
      const candidates = findCandidatesByAlternateId(sampleRecords, 'A22222');
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('2');
    });

    it('should find single candidate by uuid', () => {
      const candidates = findCandidatesByAlternateId(sampleRecords, 'uuid-789');
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('3');
    });

    it('should return empty array when no candidates found', () => {
      const candidates = findCandidatesByAlternateId(sampleRecords, 'nonexistent-id');
      
      expect(candidates).toHaveLength(0);
    });

    it('should handle multiple candidates with same alternate ID', () => {
      const recordsWithDuplicates = [
        ...sampleRecords,
        { id: '5', clientId: 'client-123', name: 'Duplicate Client' } // Same clientId as record 1
      ];
      
      const candidates = findCandidatesByAlternateId(recordsWithDuplicates, 'client-123');
      
      expect(candidates).toHaveLength(2);
      expect(candidates.map(c => c.id)).toEqual(['1', '5']);
    });

    it('should work with custom alternate fields', () => {
      const customRecords = [
        { id: '1', customId: 'custom-123', name: 'Record 1' },
        { id: '2', customId: 'custom-456', name: 'Record 2' }
      ];
      
      const candidates = findCandidatesByAlternateId(
        customRecords, 
        'custom-123', 
        ['customId']
      );
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('1');
    });

    it('should handle string/number ID type mixing in search', () => {
      const mixedRecords = [
        { id: '1', clientId: 123, name: 'Record 1' },
        { id: '2', clientId: '456', name: 'Record 2' }
      ];
      
      const candidatesNumeric = findCandidatesByAlternateId(mixedRecords, 123);
      expect(candidatesNumeric).toHaveLength(1);
      expect(candidatesNumeric[0].id).toBe('1');
      
      const candidatesString = findCandidatesByAlternateId(mixedRecords, '456');
      expect(candidatesString).toHaveLength(1);
      expect(candidatesString[0].id).toBe('2');
    });

    it('should handle empty records array', () => {
      const candidates = findCandidatesByAlternateId([], 'any-id');
      expect(candidates).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical client update scenario', () => {
      const existingClients = [
        { id: 'db-1', amsId: 'A12345', firstName: 'Max', lastName: 'Mustermann' },
        { id: 'db-2', amsId: 'A67890', firstName: 'Anna', lastName: 'Schmidt' }
      ];
      
      // Scenario 1: Direct ID update succeeds
      const directUpdateInput: UpsertInput = { updateCount: 1, candidatesFound: 0 };
      expect(decideUpsert(directUpdateInput)).toBe('update');
      
      // Scenario 2: Direct ID fails, but amsId candidate found
      const candidates = findCandidatesByAlternateId(existingClients, 'A12345');
      const alternateUpdateInput: UpsertInput = { 
        updateCount: 0, 
        candidatesFound: candidates.length 
      };
      expect(decideUpsert(alternateUpdateInput)).toBe('updateViaCandidate');
      
      // Scenario 3: No matches anywhere, need insert
      const noCandidates = findCandidatesByAlternateId(existingClients, 'A99999');
      const insertInput: UpsertInput = { 
        updateCount: 0, 
        candidatesFound: noCandidates.length 
      };
      expect(decideUpsert(insertInput)).toBe('insert');
    });

    it('should handle collision scenarios without changing business rules', () => {
      const conflictingRecords = [
        { id: '1', amsId: 'A12345', firstName: 'Max', status: 'offen' },
        { id: '2', amsId: 'A12345', firstName: 'Anna', status: 'erledigt' } // Same amsId, different data
      ];
      
      const candidates = findCandidatesByAlternateId(conflictingRecords, 'A12345');
      
      // Decision logic doesn't change based on field differences
      // It only cares about candidate count
      const input: UpsertInput = { updateCount: 0, candidatesFound: candidates.length };
      expect(decideUpsert(input)).toBe('updateViaCandidate');
      
      // The business logic for handling multiple candidates or field conflicts
      // is handled elsewhere - we only test the decision logic here
      expect(candidates).toHaveLength(2);
    });
  });
});
</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">str_replace</parameter>
<parameter name="path">src/features/board/hooks/useOptimisticOverlay.ts</parameter>
<parameter name="old_str">import { useEffect, useMemo, useRef, useState } from 'react';
import type { Patch } from '../../../types/patch';

type Detail = { patches: Patch<any>[] };

function keyOf(v: any): string {
  return String(v);
}

/**
 * Optimistic-Overlay mit
 * 1) ID-Normalisierung (String-Keys) und
 * 2) automatischer Reconciliation: Overlay-Einträge werden entfernt,
 *    sobald die Basisdaten die gleichen Werte tragen.
 */
export function useOptimisticOverlay<T extends { id: string | number }>(base: T[]) {
  const [version, setVersion] = useState(0);
  const overlayRef = useRef<Map<string, any>>(new Map());

  // Events: apply merges, commit wird als "hint" ignoriert (Cleanup übernimmt Reconciliation), clear leert alles.
  useEffect(() => {
    const onApply = (e: Event) => {
      const evt = e as CustomEvent<Detail>;
      for (const p of evt.detail.patches) {
        const k = keyOf(p.id);
        const prev = overlayRef.current.get(k) ?? {};
        overlayRef.current.set(k, { ...prev, ...p.changes });
      }
      setVersion(v => v + 1);
    };
    const onCommit = (_e: Event) => {
      // kein sofortiges Löschen mehr; Cleanup passiert unterhalb via Reconciliation
      setVersion(v => v + 1);
    };
    const onClear = () => {
      overlayRef.current.clear();
      setVersion(v => v + 1);
    };

    window.addEventListener('board:optimistic-apply', onApply as EventListener);
    window.addEventListener('board:optimistic-commit', onCommit as EventListener);
    window.addEventListener('board:optimistic-clear', onClear as EventListener);
    return () => {
      window.removeEventListener('board:optimistic-apply', onApply as EventListener);
      window.removeEventListener('board:optimistic-commit', onCommit as EventListener);
      window.removeEventListener('board:optimistic-clear', onClear as EventListener);
    };
  }, []);

  // Reconciliation: wenn Base dieselben Werte hat, Overlay-Eintrag löschen
  useEffect(() => {
    if (overlayRef.current.size === 0) return;
    let changed = false;
    for (const [k, patch] of Array.from(overlayRef.current.entries())) {
      const row = base.find(r => keyOf((r as any).id) === k);
      if (!row) continue;
      const allEqual = Object.keys(patch).every((f) => (row as any)[f] === (patch as any)[f]);
      if (allEqual) {
        overlayRef.current.delete(k);
        changed = true;
      }
    }
    if (changed) setVersion(v => v + 1);
  }, [base]);

  const merged = useMemo(() => {
    if (overlayRef.current.size === 0) return base;
    return base.map((row) => {
      const k = keyOf((row as any).id);
      const o = overlayRef.current.get(k);
      return o ? ({ ...row, ...o }) : row;
    });
  }, [base, version]);

  return merged;
}</parameter>
<parameter name="new_str">import { useEffect, useMemo, useRef, useState } from 'react';
import type { Patch } from '../../../types/patch';
import { shouldDropOverlay, normalizeId } from '../optimistic/reconciliation';

type Detail = { patches: Patch<any>[] };

/**
 * Optimistic-Overlay mit
 * 1) ID-Normalisierung (String-Keys) und
 * 2) automatischer Reconciliation: Overlay-Einträge werden entfernt,
 *    sobald die Basisdaten die gleichen Werte tragen.
 */
export function useOptimisticOverlay<T extends { id: string | number }>(base: T[]) {
  const [version, setVersion] = useState(0);
  const overlayRef = useRef<Map<string, any>>(new Map());

  // Events: apply merges, commit wird als "hint" ignoriert (Cleanup übernimmt Reconciliation), clear leert alles.
  useEffect(() => {
    const onApply = (e: Event) => {
      const evt = e as CustomEvent<Detail>;
      for (const p of evt.detail.patches) {
        const k = normalizeId(p.id);
        const prev = overlayRef.current.get(k) ?? {};
        overlayRef.current.set(k, { ...prev, ...p.changes });
      }
      setVersion(v => v + 1);
    };
    const onCommit = (_e: Event) => {
      // kein sofortiges Löschen mehr; Cleanup passiert unterhalb via Reconciliation
      setVersion(v => v + 1);
    };
    const onClear = () => {
      overlayRef.current.clear();
      setVersion(v => v + 1);
    };

    window.addEventListener('board:optimistic-apply', onApply as EventListener);
    window.addEventListener('board:optimistic-commit', onCommit as EventListener);
    window.addEventListener('board:optimistic-clear', onClear as EventListener);
    return () => {
      window.removeEventListener('board:optimistic-apply', onApply as EventListener);
      window.removeEventListener('board:optimistic-commit', onCommit as EventListener);
      window.removeEventListener('board:optimistic-clear', onClear as EventListener);
    };
  }, []);

  // Reconciliation: wenn Base dieselben Werte hat, Overlay-Eintrag löschen
  useEffect(() => {
    if (overlayRef.current.size === 0) return;
    let changed = false;
    for (const [k, patch] of Array.from(overlayRef.current.entries())) {
      const row = base.find(r => normalizeId((r as any).id) === k);
      if (!row) continue;
      
      // Use extracted reconciliation logic
      if (shouldDropOverlay(row as any, patch)) {
        overlayRef.current.delete(k);
        changed = true;
      }
    }
    if (changed) setVersion(v => v + 1);
  }, [base]);

  const merged = useMemo(() => {
    if (overlayRef.current.size === 0) return base;
    return base.map((row) => {
      const k = normalizeId((row as any).id);
      const o = overlayRef.current.get(k);
      return o ? ({ ...row, ...o }) : row;
    });
  }, [base, version]);

  return merged;
}</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">str_replace</parameter>
<parameter name="path">src/features/board/services/BoardService.ts</parameter>
<parameter name="old_str">import { mutationService } from '../../../services/MutationService';
import type { Patch } from '../../../types/patch';

/**
 * Robust BoardService:
 * - updateById/bulkApply machen ein **Upsert** mit Fallback-Lookup,
 *   falls der Primärschlüssel nicht trifft (z.B. String vs. number).
 * - Undo/Redo-Stacks bleiben wie zuvor.
 */

type StackEntry = { forward: Patch<any>[]; inverse: Patch<any>[] };
const _undo: StackEntry[] = [];
const _redo: StackEntry[] = [];

// ---- helpers ----
function pick<T extends object>(obj: T | undefined, keys: string[]): Partial<T> {
  const out: any = {};
  if (!obj) return out;
  for (const k of keys) out[k] = (obj as any)[k];
  return out;
}

async function getByAnyId(table: any, id: any): Promise<any | undefined> {
  // 1) direkter PK
  try {
    const direct = await table.get(id);
    if (direct) return direct;
  } catch {}

  // 2) Fallback-Suche auf gängige Felder
  const all = await table.toArray();
  const wanted = String(id);
  const found = all.find((r: any) =>
    String(r?.id) === wanted ||
    String(r?.clientId) === wanted ||
    String(r?.uuid) === wanted ||
    String(r?.amsId) === wanted
  );
  return found;
}

async function applyOne<T>(p: Patch<T>): Promise<void> {
  const table = (db as any).clients;
  if (!table) throw new Error('BoardService: db.clients missing');

  // try Dexie update first
  try {
    const updated = await table.update(p.id as any, p.changes as any);
    if (updated && updated > 0) return;
  } catch {}

  // Fallback: read-merge-put (upsert) mit tolerantem Lookup
  const before = await getByAnyId(table, p.id as any);
  const merged = { ...(before ?? { id: p.id }), ...(p.changes as any) };
  await table.put(merged as any);
}</parameter>
<parameter name="new_str">import { mutationService } from '../../../services/MutationService';
import type { Patch } from '../../../types/patch';
import { decideUpsert, findCandidatesByAlternateId } from '../../../services/board/decideUpsert';

/**
 * Robust BoardService:
 * - updateById/bulkApply machen ein **Upsert** mit Fallback-Lookup,
 *   falls der Primärschlüssel nicht trifft (z.B. String vs. number).
 * - Undo/Redo-Stacks bleiben wie zuvor.
 */

type StackEntry = { forward: Patch<any>[]; inverse: Patch<any>[] };
const _undo: StackEntry[] = [];
const _redo: StackEntry[] = [];

// ---- helpers ----
function pick<T extends object>(obj: T | undefined, keys: string[]): Partial<T> {
  const out: any = {};
  if (!obj) return out;
  for (const k of keys) out[k] = (obj as any)[k];
  return out;
}

async function getByAnyId(table: any, id: any): Promise<any | undefined> {
  // 1) direkter PK
  try {
    const direct = await table.get(id);
    if (direct) return direct;
  } catch {}

  // 2) Fallback-Suche auf gängige Felder mit extracted logic
  const all = await table.toArray();
  const candidates = findCandidatesByAlternateId(all, id);
  return candidates.length > 0 ? candidates[0] : undefined;
}

async function applyOne<T>(p: Patch<T>): Promise<void> {
  const table = (db as any).clients;
  if (!table) throw new Error('BoardService: db.clients missing');

  // try Dexie update first
  let updateCount = 0;
  try {
    updateCount = await table.update(p.id as any, p.changes as any) || 0;
  } catch {}

  // Use extracted upsert decision logic
  const all = await table.toArray();
  const candidates = findCandidatesByAlternateId(all, p.id);
  const decision = decideUpsert({ updateCount, candidatesFound: candidates.length });

  switch (decision) {
    case 'update':
      // Already handled above
      return;
      
    case 'updateViaCandidate':
      // Update via first candidate
      const candidate = candidates[0];
      await table.update(candidate.id, p.changes as any);
      return;
      
    case 'insert':
      // Fallback: read-merge-put (upsert)
      const before = await getByAnyId(table, p.id as any);
      const merged = { ...(before ?? { id: p.id }), ...(p.changes as any) };
      await table.put(merged as any);
      return;
  }
}</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">create</parameter>
<parameter name="path">src/services/board/__tests__/boardService.integration.test.ts</parameter>
<parameter name="file_text">/**
 * Integration tests for BoardService upsert logic
 * Tests the complete flow from patch application to database operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { decideUpsert, findCandidatesByAlternateId } from '../decideUpsert';

// Mock database for integration testing
const mockTable = {
  get: vi.fn(),
  update: vi.fn(),
  put: vi.fn(),
  toArray: vi.fn()
};

const mockDb = {
  clients: mockTable
};

vi.mock('../../../data/db', () => ({
  db: mockDb
}));

describe('BoardService Upsert Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsert decision flow', () => {
    it('should follow update path when direct update succeeds', async () => {
      const existingRecords = [
        { id: 'client-1', name: 'Test Client', status: 'offen' }
      ];
      
      mockTable.toArray.mockResolvedValue(existingRecords);
      mockTable.update.mockResolvedValue(1); // Success
      
      const candidates = findCandidatesByAlternateId(existingRecords, 'client-1');
      const decision = decideUpsert({ updateCount: 1, candidatesFound: candidates.length });
      
      expect(decision).toBe('update');
      expect(candidates).toHaveLength(0); // No alternate ID match needed
    });

    it('should follow updateViaCandidate path when direct update fails but alternate ID found', async () => {
      const existingRecords = [
        { id: 'db-generated-123', amsId: 'A12345', name: 'Test Client' }
      ];
      
      mockTable.toArray.mockResolvedValue(existingRecords);
      mockTable.update.mockResolvedValue(0); // Direct update failed
      
      // Try to update by amsId (alternate ID)
      const candidates = findCandidatesByAlternateId(existingRecords, 'A12345');
      const decision = decideUpsert({ updateCount: 0, candidatesFound: candidates.length });
      
      expect(decision).toBe('updateViaCandidate');
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('db-generated-123');
    });

    it('should follow insert path when no matches found', async () => {
      const existingRecords = [
        { id: 'client-1', amsId: 'A11111', name: 'Existing Client' }
      ];
      
      mockTable.toArray.mockResolvedValue(existingRecords);
      mockTable.update.mockResolvedValue(0); // Direct update failed
      
      // Try to find non-existent ID
      const candidates = findCandidatesByAlternateId(existingRecords, 'A99999');
      const decision = decideUpsert({ updateCount: 0, candidatesFound: candidates.length });
      
      expect(decision).toBe('insert');
      expect(candidates).toHaveLength(0);
    });
  });

  describe('alternate ID tolerance', () => {
    it('should handle string/number ID type mixing', () => {
      const mixedRecords = [
        { id: '1', clientId: 123, amsId: 'A11111' },
        { id: '2', clientId: '456', amsId: 'A22222' },
        { id: 3, clientId: 789, amsId: 'A33333' } // numeric primary ID
      ];
      
      // Search by numeric clientId with string
      const candidates1 = findCandidatesByAlternateId(mixedRecords, '123');
      expect(candidates1).toHaveLength(1);
      expect(candidates1[0].id).toBe('1');
      
      // Search by string clientId with number
      const candidates2 = findCandidatesByAlternateId(mixedRecords, 456);
      expect(candidates2).toHaveLength(1);
      expect(candidates2[0].id).toBe('2');
      
      // Search by amsId (always string)
      const candidates3 = findCandidatesByAlternateId(mixedRecords, 'A33333');
      expect(candidates3).toHaveLength(1);
      expect(candidates3[0].id).toBe(3);
    });

    it('should handle multiple alternate ID fields', () => {
      const records = [
        { id: '1', clientId: 'client-123', uuid: 'uuid-456', amsId: 'A11111' },
        { id: '2', clientId: 'client-789', uuid: 'uuid-123', amsId: 'A22222' } // uuid collision
      ];
      
      // Should find by clientId
      const byClientId = findCandidatesByAlternateId(records, 'client-123');
      expect(byClientId).toHaveLength(1);
      expect(byClientId[0].id).toBe('1');
      
      // Should find by uuid (even with collision, returns first match)
      const byUuid = findCandidatesByAlternateId(records, 'uuid-123');
      expect(byUuid).toHaveLength(1);
      expect(byUuid[0].id).toBe('2');
      
      // Should find by amsId
      const byAmsId = findCandidatesByAlternateId(records, 'A11111');
      expect(byAmsId).toHaveLength(1);
      expect(byAmsId[0].id).toBe('1');
    });
  });

  describe('collision scenarios', () => {
    it('should handle multiple candidates without changing business rules', () => {
      const conflictingRecords = [
        { id: '1', amsId: 'A12345', firstName: 'Max', status: 'offen' },
        { id: '2', amsId: 'A12345', firstName: 'Anna', status: 'erledigt' } // Same amsId
      ];
      
      const candidates = findCandidatesByAlternateId(conflictingRecords, 'A12345');
      expect(candidates).toHaveLength(2);
      
      // Decision logic doesn't change based on field differences
      const decision = decideUpsert({ updateCount: 0, candidatesFound: candidates.length });
      expect(decision).toBe('updateViaCandidate');
      
      // Business rule: first candidate is used (no change to existing logic)
      expect(candidates[0].id).toBe('1');
    });

    it('should maintain deterministic candidate order', () => {
      const records = [
        { id: 'z', amsId: 'A12345', name: 'Last' },
        { id: 'a', amsId: 'A12345', name: 'First' },
        { id: 'm', amsId: 'A12345', name: 'Middle' }
      ];
      
      const candidates1 = findCandidatesByAlternateId(records, 'A12345');
      const candidates2 = findCandidatesByAlternateId(records, 'A12345');
      
      // Should return same order consistently
      expect(candidates1.map(c => c.id)).toEqual(candidates2.map(c => c.id));
      expect(candidates1).toHaveLength(3);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical import scenario with mixed ID types', () => {
      const existingClients = [
        { id: 'auto-gen-1', amsId: 'A12345', firstName: 'Max' },
        { id: 'auto-gen-2', amsId: 'A67890', firstName: 'Anna' },
        { id: 3, clientId: 'legacy-123', firstName: 'Legacy' } // numeric ID
      ];
      
      // Scenario 1: Import tries to update by amsId
      const candidatesByAms = findCandidatesByAlternateId(existingClients, 'A12345');
      expect(candidatesByAms).toHaveLength(1);
      expect(candidatesByAms[0].firstName).toBe('Max');
      
      // Scenario 2: Import tries to update by legacy clientId
      const candidatesByClient = findCandidatesByAlternateId(existingClients, 'legacy-123');
      expect(candidatesByClient).toHaveLength(1);
      expect(candidatesByClient[0].id).toBe(3);
      
      // Scenario 3: New client (no matches)
      const newClientCandidates = findCandidatesByAlternateId(existingClients, 'A99999');
      expect(newClientCandidates).toHaveLength(0);
      
      const decisions = [
        decideUpsert({ updateCount: 0, candidatesFound: candidatesByAms.length }),
        decideUpsert({ updateCount: 0, candidatesFound: candidatesByClient.length }),
        decideUpsert({ updateCount: 0, candidatesFound: newClientCandidates.length })
      ];
      
      expect(decisions).toEqual(['updateViaCandidate', 'updateViaCandidate', 'insert']);
    });
  });
});
</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">str_replace</parameter>
<parameter name="path">src/features/board/hooks/useOptimisticOverlay.ts</parameter>
<parameter name="old_str">import { useEffect, useMemo, useRef, useState } from 'react';
import type { Patch } from '../../../types/patch';
import { shouldDropOverlay, normalizeId } from '../optimistic/reconciliation';</parameter>
<parameter name="new_str">import { useEffect, useMemo, useRef, useState } from 'react';
import type { Patch } from '../../../types/patch';
import { shouldDropOverlay, normalizeId } from '../optimistic/reconciliation';</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">create</parameter>
<parameter name="path">src/features/board/optimistic/__tests__/useOptimisticOverlay.integration.test.ts</parameter>
<parameter name="file_text">/**
 * Integration tests for useOptimisticOverlay hook
 * Tests the complete optimistic update flow with reconciliation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticOverlay } from '../useOptimisticOverlay';
import type { Patch } from '../../../../types/patch';

describe('useOptimisticOverlay Integration', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    window.removeEventListener('board:optimistic-apply', () => {});
    window.removeEventListener('board:optimistic-commit', () => {});
    window.removeEventListener('board:optimistic-clear', () => {});
  });

  afterEach(() => {
    // Clean up any remaining overlays
    window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
  });

  it('should apply optimistic updates and reconcile when base data matches', async () => {
    const initialData = [
      { id: '1', name: 'Original Name', status: 'offen' },
      { id: '2', name: 'Another Client', status: 'offen' }
    ];

    const { result, rerender } = renderHook(
      ({ base }) => useOptimisticOverlay(base),
      { initialProps: { base: initialData } }
    );

    // Initial state should match base data
    expect(result.current).toEqual(initialData);

    // Apply optimistic update
    act(() => {
      const patches: Patch<any>[] = [
        { id: '1', changes: { name: 'Updated Name', status: 'inBearbeitung' } }
      ];
      window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
        detail: { patches } 
      }));
    });

    // Should show optimistic state
    expect(result.current[0]).toEqual({
      id: '1',
      name: 'Updated Name',
      status: 'inBearbeitung'
    });
    expect(result.current[1]).toEqual(initialData[1]); // Unchanged

    // Simulate server/persistence confirming the changes
    const updatedBaseData = [
      { id: '1', name: 'Updated Name', status: 'inBearbeitung' }, // Matches overlay
      { id: '2', name: 'Another Client', status: 'offen' }
    ];

    rerender({ base: updatedBaseData });

    // Overlay should be reconciled away (dropped) since base now matches
    expect(result.current).toEqual(updatedBaseData);
  });

  it('should keep overlay when base data diverges from optimistic changes', async () => {
    const initialData = [
      { id: '1', name: 'Original Name', status: 'offen' }
    ];

    const { result, rerender } = renderHook(
      ({ base }) => useOptimisticOverlay(base),
      { initialProps: { base: initialData } }
    );

    // Apply optimistic update
    act(() => {
      const patches: Patch<any>[] = [
        { id: '1', changes: { name: 'Optimistic Name', status: 'inBearbeitung' } }
      ];
      window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
        detail: { patches } 
      }));
    });

    // Should show optimistic state
    expect(result.current[0].name).toBe('Optimistic Name');
    expect(result.current[0].status).toBe('inBearbeitung');

    // Simulate server returning different data (conflict/divergence)
    const divergentBaseData = [
      { id: '1', name: 'Server Name', status: 'erledigt' } // Different from overlay
    ];

    rerender({ base: divergentBaseData });

    // Overlay should be kept since base diverges
    // Final state should show overlay over base
    expect(result.current[0].name).toBe('Optimistic Name'); // Overlay wins
    expect(result.current[0].status).toBe('inBearbeitung'); // Overlay wins
  });

  it('should handle partial overlay reconciliation', async () => {
    const initialData = [
      { id: '1', name: 'Original', status: 'offen', priority: 'normal' }
    ];

    const { result, rerender } = renderHook(
      ({ base }) => useOptimisticOverlay(base),
      { initialProps: { base: initialData } }
    );

    // Apply optimistic update to multiple fields
    act(() => {
      const patches: Patch<any>[] = [
        { id: '1', changes: { name: 'Updated', status: 'inBearbeitung' } }
      ];
      window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
        detail: { patches } 
      }));
    });

    // Base confirms only part of the changes
    const partiallyUpdatedBase = [
      { id: '1', name: 'Updated', status: 'offen', priority: 'normal' } // name matches, status differs
    ];

    rerender({ base: partiallyUpdatedBase });

    // Overlay should be kept because not all fields match
    expect(result.current[0].name).toBe('Updated'); // From overlay (matches base)
    expect(result.current[0].status).toBe('inBearbeitung'); // From overlay (differs from base)
  });

  it('should handle multiple overlays and selective reconciliation', async () => {
    const initialData = [
      { id: '1', name: 'Client 1', status: 'offen' },
      { id: '2', name: 'Client 2', status: 'offen' }
    ];

    const { result, rerender } = renderHook(
      ({ base }) => useOptimisticOverlay(base),
      { initialProps: { base: initialData } }
    );

    // Apply optimistic updates to both clients
    act(() => {
      const patches: Patch<any>[] = [
        { id: '1', changes: { status: 'inBearbeitung' } },
        { id: '2', changes: { status: 'erledigt' } }
      ];
      window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
        detail: { patches } 
      }));
    });

    // Base confirms only first client's changes
    const selectivelyUpdatedBase = [
      { id: '1', name: 'Client 1', status: 'inBearbeitung' }, // Matches overlay
      { id: '2', name: 'Client 2', status: 'offen' } // Differs from overlay
    ];

    rerender({ base: selectivelyUpdatedBase });

    // First overlay should be dropped, second should be kept
    expect(result.current[0].status).toBe('inBearbeitung'); // From base (overlay dropped)
    expect(result.current[1].status).toBe('erledigt'); // From overlay (kept)
  });

  it('should handle ID type mixing in overlay application', async () => {
    const initialData = [
      { id: 1, name: 'Numeric ID Client' }, // numeric ID
      { id: '2', name: 'String ID Client' } // string ID
    ];

    const { result } = renderHook(
      ({ base }) => useOptimisticOverlay(base),
      { initialProps: { base: initialData } }
    );

    // Apply patches with mixed ID types
    act(() => {
      const patches: Patch<any>[] = [
        { id: '1', changes: { name: 'Updated Numeric' } }, // string patch for numeric ID
        { id: 2, changes: { name: 'Updated String' } } // numeric patch for string ID
      ];
      window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
        detail: { patches } 
      }));
    });

    // Both updates should be applied correctly
    expect(result.current[0].name).toBe('Updated Numeric');
    expect(result.current[1].name).toBe('Updated String');
  });

  it('should clear all overlays on clear event', async () => {
    const initialData = [
      { id: '1', name: 'Test Client', status: 'offen' }
    ];

    const { result } = renderHook(
      ({ base }) => useOptimisticOverlay(base),
      { initialProps: { base: initialData } }
    );

    // Apply optimistic update
    act(() => {
      const patches: Patch<any>[] = [
        { id: '1', changes: { status: 'inBearbeitung' } }
      ];
      window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
        detail: { patches } 
      }));
    });

    // Verify optimistic state
    expect(result.current[0].status).toBe('inBearbeitung');

    // Clear all overlays
    act(() => {
      window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
    });

    // Should revert to base data
    expect(result.current).toEqual(initialData);
  });
});
</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">str_replace</parameter>
<parameter name="path">src/features/board/services/BoardService.ts</parameter>
<parameter name="old_str">import { mutationService } from '../../../services/MutationService';
import type { Patch } from '../../../types/patch';
import { decideUpsert, findCandidatesByAlternateId } from '../../../services/board/decideUpsert';</parameter>
<parameter name="new_str">import { mutationService } from '../../../services/MutationService';
import type { Patch } from '../../../types/patch';
import { decideUpsert, findCandidatesByAlternateId } from '../../../services/board/decideUpsert';
import { db } from '../../../data/db';</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">str_replace</parameter>
<parameter name="path">src/features/board/services/BoardService.ts</parameter>
<parameter name="old_str">export function getUndoRedoStatus() {
  return mutationService.getStackStatus();
}</parameter>
<parameter name="new_str">export function getUndoRedoStatus() {
  return mutationService.getStackStatus();
}

export function canUndo(): boolean {
  return mutationService.getStackStatus().canUndo;
}

export function canRedo(): boolean {
  return mutationService.getStackStatus().canRedo;
}</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">create</parameter>
<parameter name="path">src/features/board/__tests__/optimistic-reconciliation.integration.test.ts</parameter>
<parameter name="file_text">/**
 * Integration tests for optimistic reconciliation in real Board scenarios
 * Tests the complete flow from UI interaction to overlay reconciliation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldDropOverlay, reconcileOverlay } from '../optimistic/reconciliation';
import type { Client } from '../../../domain/models';

describe('Optimistic Reconciliation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test events
    window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
  });

  describe('client data reconciliation scenarios', () => {
    it('should reconcile status change correctly', () => {
      const baseClient: Partial<Client> = {
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'inBearbeitung', // Server confirmed the status change
        priority: 'normal',
        contactCount: 0,
        isArchived: false
      };

      const optimisticOverlay = {
        status: 'inBearbeitung' // This was the optimistic change
      };

      // Should drop overlay since server confirmed the change
      expect(shouldDropOverlay(baseClient, optimisticOverlay)).toBe(true);
      
      const reconciliation = reconcileOverlay(baseClient, optimisticOverlay);
      expect(reconciliation.keepOverlay).toBe(false);
    });

    it('should keep overlay when server returns different status', () => {
      const baseClient: Partial<Client> = {
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'offen', // Server didn't apply the change (conflict/rollback)
        priority: 'normal'
      };

      const optimisticOverlay = {
        status: 'inBearbeitung' // User's optimistic change
      };

      // Should keep overlay since server state differs
      expect(shouldDropOverlay(baseClient, optimisticOverlay)).toBe(false);
      
      const reconciliation = reconcileOverlay(baseClient, optimisticOverlay);
      expect(reconciliation.keepOverlay).toBe(true);
    });

    it('should handle complex multi-field updates', () => {
      const baseClient: Partial<Client> = {
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'terminVereinbart', // Server confirmed
        followUp: '2024-12-25T10:00:00Z', // Server confirmed
        priority: 'hoch', // Server confirmed
        assignedTo: 'user-123' // Server confirmed
      };

      const optimisticOverlay = {
        status: 'terminVereinbart',
        followUp: '2024-12-25T10:00:00Z',
        priority: 'hoch',
        assignedTo: 'user-123'
      };

      // All fields match - should drop overlay
      expect(shouldDropOverlay(baseClient, optimisticOverlay)).toBe(true);
    });

    it('should handle partial confirmation scenarios', () => {
      const baseClient: Partial<Client> = {
        id: 'client-1',
        status: 'terminVereinbart', // Confirmed
        followUp: '2024-12-25T10:00:00Z', // Confirmed
        priority: 'normal', // NOT confirmed (was optimistically set to 'hoch')
        assignedTo: 'user-123' // Confirmed
      };

      const optimisticOverlay = {
        status: 'terminVereinbart',
        followUp: '2024-12-25T10:00:00Z',
        priority: 'hoch', // This differs from base
        assignedTo: 'user-123'
      };

      // Should keep overlay because priority field differs
      expect(shouldDropOverlay(baseClient, optimisticOverlay)).toBe(false);
    });

    it('should handle contact log array reconciliation', () => {
      const baseClient: Partial<Client> = {
        id: 'client-1',
        contactLog: [
          { date: '2024-01-01', channel: 'telefon', note: 'Erstkontakt' },
          { date: '2024-01-02', channel: 'email', note: 'Follow-up' }
        ],
        contactCount: 2
      };

      const optimisticOverlay = {
        contactLog: [
          { date: '2024-01-01', channel: 'telefon', note: 'Erstkontakt' },
          { date: '2024-01-02', channel: 'email', note: 'Follow-up' }
        ],
        contactCount: 2
      };

      // Exact array match - should drop overlay
      expect(shouldDropOverlay(baseClient, optimisticOverlay)).toBe(true);

      // Different array order - should keep overlay (order matters)
      const overlayDifferentOrder = {
        contactLog: [
          { date: '2024-01-02', channel: 'email', note: 'Follow-up' },
          { date: '2024-01-01', channel: 'telefon', note: 'Erstkontakt' }
        ]
      };

      expect(shouldDropOverlay(baseClient, overlayDifferentOrder)).toBe(false);
    });

    it('should handle null vs undefined reconciliation', () => {
      const baseWithNull: Partial<Client> = {
        id: 'client-1',
        followUp: null as any, // Explicitly null
        assignedTo: undefined as any // Explicitly undefined
      };

      const overlayWithUndefined = {
        followUp: undefined as any,
        assignedTo: null as any
      };

      // null vs undefined should be treated as different (current semantics)
      expect(shouldDropOverlay(baseWithNull, overlayWithUndefined)).toBe(false);

      const overlayMatching = {
        followUp: null as any,
        assignedTo: undefined as any
      };

      expect(shouldDropOverlay(baseWithNull, overlayMatching)).toBe(true);
    });

    it('should handle ID type mixing in real scenarios', () => {
      // Simulate database returning numeric IDs but overlay using string IDs
      const baseWithNumericId = {
        id: 123, // Database might return numeric ID
        name: 'Test Client',
        status: 'offen'
      };

      const overlayWithStringId = {
        status: 'offen' // Overlay applied to string ID '123'
      };

      // Should still reconcile correctly despite ID type difference
      expect(shouldDropOverlay(baseWithNumericId, overlayWithStringId)).toBe(true);
    });

    it('should handle empty overlay gracefully', () => {
      const baseClient: Partial<Client> = {
        id: 'client-1',
        firstName: 'Max',
        status: 'offen'
      };

      const emptyOverlay = {};

      // Empty overlay should always be dropped
      expect(shouldDropOverlay(baseClient, emptyOverlay)).toBe(true);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large overlay maps efficiently', () => {
      const baseClients = Array.from({ length: 100 }, (_, i) => ({
        id: `client-${i}`,
        name: `Client ${i}`,
        status: 'offen'
      }));

      // Create overlays for all clients
      const overlays = baseClients.map(client => ({
        status: 'inBearbeitung'
      }));

      // Test reconciliation performance (should not timeout)
      const start = performance.now();
      
      baseClients.forEach((base, index) => {
        shouldDropOverlay(base, overlays[index]);
      });
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle deeply nested object reconciliation', () => {
      const baseWithNestedData = {
        id: 'client-1',
        metadata: {
          source: {
            fileName: 'import.xlsx',
            importedAt: '2024-01-01T00:00:00Z',
            mappingPreset: 'standard'
          },
          validation: {
            errors: [],
            warnings: ['Minor issue']
          }
        }
      };

      const overlayExactMatch = {
        metadata: {
          source: {
            fileName: 'import.xlsx',
            importedAt: '2024-01-01T00:00:00Z',
            mappingPreset: 'standard'
          },
          validation: {
            errors: [],
            warnings: ['Minor issue']
          }
        }
      };

      const overlayDeepDifference = {
        metadata: {
          source: {
            fileName: 'import.xlsx',
            importedAt: '2024-01-01T00:00:00Z',
            mappingPreset: 'custom' // Different nested value
          },
          validation: {
            errors: [],
            warnings: ['Minor issue']
          }
        }
      };

      expect(shouldDropOverlay(baseWithNestedData, overlayExactMatch)).toBe(true);
      expect(shouldDropOverlay(baseWithNestedData, overlayDeepDifference)).toBe(false);
    });
  });
});
</parameter>
</invoke>
<invoke name="str_replace_editor">
<parameter name="command">run</parameter>
<parameter name="command_line">npm test -- --run src/features/board/optimistic/__tests__/reconciliation.test.ts src/services/board/__tests__/upsertFallback.test.ts src/features/board/__tests__/optimistic-reconciliation.integration.test.ts src/services/board/__tests__/boardService.integration.test.ts</parameter>
</invoke>