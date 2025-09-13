/**
 * Unit tests for optimistic overlay reconciliation logic
 * Tests pure functions for overlay merging, ID normalization, and reconciliation
 */

import { describe, it, expect } from 'vitest';

// Test utilities
function makeClient(overrides: any = {}) {
  return {
    id: 'client-1',
    firstName: 'Max',
    lastName: 'Mustermann',
    status: 'offen',
    priority: 'normal',
    contactCount: 0,
    isArchived: false,
    ...overrides
  };
}

function makePatch(id: string, changes: any) {
  return { id, changes };
}

// Pure function for ID normalization (extracted from useOptimisticOverlay logic)
function normalizeId(id: string | number): string {
  return String(id);
}

// Pure function for overlay reconciliation
function reconcileOverlay<T extends { id: string | number }>(
  base: T[],
  overlay: Map<string, any>
): T[] {
  if (overlay.size === 0) return base;
  
  return base.map(row => {
    const normalizedId = normalizeId((row as any).id);
    const overlayChanges = overlay.get(normalizedId);
    
    if (!overlayChanges) return row;
    
    // Check if base now matches overlay (reconciliation)
    const allEqual = Object.keys(overlayChanges).every(
      field => (row as any)[field] === overlayChanges[field]
    );
    
    if (allEqual) {
      // Base caught up - remove from overlay
      overlay.delete(normalizedId);
      return row;
    }
    
    // Merge overlay over base
    return { ...row, ...overlayChanges };
  });
}

// Pure function for applying patches to overlay
function applyPatchesToOverlay(
  overlay: Map<string, any>,
  patches: Array<{ id: string | number; changes: any }>
): Map<string, any> {
  const newOverlay = new Map(overlay);
  
  for (const patch of patches) {
    const normalizedId = normalizeId(patch.id);
    const existing = newOverlay.get(normalizedId) || {};
    newOverlay.set(normalizedId, { ...existing, ...patch.changes });
  }
  
  return newOverlay;
}

describe('Optimistic Overlay Reconciliation', () => {
  describe('ID normalization', () => {
    it('should normalize string IDs consistently', () => {
      expect(normalizeId('client-123')).toBe('client-123');
      expect(normalizeId('123')).toBe('123');
      expect(normalizeId('')).toBe('');
    });

    it('should normalize numeric IDs to strings', () => {
      expect(normalizeId(123)).toBe('123');
      expect(normalizeId(0)).toBe('0');
      expect(normalizeId(-1)).toBe('-1');
    });

    it('should handle mixed ID types consistently', () => {
      const stringId = normalizeId('123');
      const numericId = normalizeId(123);
      
      expect(stringId).toBe(numericId);
      expect(stringId).toBe('123');
    });
  });

  describe('patch application', () => {
    it('should apply single patch to empty overlay', () => {
      const overlay = new Map<string, any>();
      const patches = [makePatch('client-1', { status: 'inBearbeitung' })];
      
      const result = applyPatchesToOverlay(overlay, patches);
      
      expect(result.get('client-1')).toEqual({ status: 'inBearbeitung' });
      expect(result.size).toBe(1);
    });

    it('should merge multiple patches to same ID', () => {
      const overlay = new Map<string, any>();
      const patches = [
        makePatch('client-1', { status: 'inBearbeitung' }),
        makePatch('client-1', { priority: 'hoch' }),
        makePatch('client-1', { assignedTo: 'user-123' })
      ];
      
      const result = applyPatchesToOverlay(overlay, patches);
      
      expect(result.get('client-1')).toEqual({
        status: 'inBearbeitung',
        priority: 'hoch',
        assignedTo: 'user-123'
      });
      expect(result.size).toBe(1);
    });

    it('should handle patches to different IDs', () => {
      const overlay = new Map<string, any>();
      const patches = [
        makePatch('client-1', { status: 'inBearbeitung' }),
        makePatch('client-2', { status: 'erledigt' }),
        makePatch('client-3', { priority: 'hoch' })
      ];
      
      const result = applyPatchesToOverlay(overlay, patches);
      
      expect(result.get('client-1')).toEqual({ status: 'inBearbeitung' });
      expect(result.get('client-2')).toEqual({ status: 'erledigt' });
      expect(result.get('client-3')).toEqual({ priority: 'hoch' });
      expect(result.size).toBe(3);
    });

    it('should merge with existing overlay entries', () => {
      const overlay = new Map([
        ['client-1', { status: 'offen', priority: 'normal' }]
      ]);
      
      const patches = [
        makePatch('client-1', { status: 'inBearbeitung' }), // Override
        makePatch('client-1', { assignedTo: 'user-123' })   // Add
      ];
      
      const result = applyPatchesToOverlay(overlay, patches);
      
      expect(result.get('client-1')).toEqual({
        status: 'inBearbeitung', // Overridden
        priority: 'normal',      // Preserved
        assignedTo: 'user-123'   // Added
      });
    });

    it('should handle empty changes gracefully', () => {
      const overlay = new Map<string, any>();
      const patches = [
        makePatch('client-1', {}),
        makePatch('client-2', { status: 'offen' })
      ];
      
      const result = applyPatchesToOverlay(overlay, patches);
      
      expect(result.get('client-1')).toEqual({});
      expect(result.get('client-2')).toEqual({ status: 'offen' });
      expect(result.size).toBe(2);
    });
  });

  describe('reconciliation logic', () => {
    it('should return base unchanged when overlay is empty', () => {
      const base = [
        makeClient({ id: 'client-1', status: 'offen' }),
        makeClient({ id: 'client-2', status: 'inBearbeitung' })
      ];
      const overlay = new Map<string, any>();
      
      const result = reconcileOverlay(base, overlay);
      
      expect(result).toBe(base); // Same reference
      expect(result).toEqual(base);
    });

    it('should merge overlay changes over base', () => {
      const base = [
        makeClient({ id: 'client-1', status: 'offen', priority: 'normal' })
      ];
      const overlay = new Map([
        ['client-1', { status: 'inBearbeitung', assignedTo: 'user-123' }]
      ]);
      
      const result = reconcileOverlay(base, overlay);
      
      expect(result[0]).toEqual({
        ...base[0],
        status: 'inBearbeitung',  // From overlay
        assignedTo: 'user-123'    // From overlay
        // priority: 'normal' preserved from base
      });
    });

    it('should reconcile when base catches up to overlay', () => {
      const base = [
        makeClient({ id: 'client-1', status: 'inBearbeitung', priority: 'hoch' })
      ];
      const overlay = new Map([
        ['client-1', { status: 'inBearbeitung', priority: 'hoch' }]
      ]);
      
      const result = reconcileOverlay(base, overlay);
      
      // Should remove from overlay since base now matches
      expect(overlay.size).toBe(0);
      expect(result[0]).toEqual(base[0]);
    });

    it('should handle partial reconciliation', () => {
      const base = [
        makeClient({ id: 'client-1', status: 'inBearbeitung', priority: 'normal' })
      ];
      const overlay = new Map([
        ['client-1', { status: 'inBearbeitung', priority: 'hoch' }]
      ]);
      
      const result = reconcileOverlay(base, overlay);
      
      // Status matches, but priority differs - should keep overlay entry
      expect(overlay.size).toBe(1);
      expect(result[0].status).toBe('inBearbeitung'); // From base (matches)
      expect(result[0].priority).toBe('hoch');         // From overlay (differs)
    });

    it('should handle mixed ID types correctly', () => {
      const base = [
        makeClient({ id: 123, status: 'offen' }),      // Numeric ID
        makeClient({ id: 'client-2', status: 'offen' }) // String ID
      ];
      const overlay = new Map([
        ['123', { status: 'inBearbeitung' }],           // String key for numeric ID
        ['client-2', { priority: 'hoch' }]
      ]);
      
      const result = reconcileOverlay(base, overlay);
      
      expect(result[0].status).toBe('inBearbeitung'); // Numeric ID matched via string
      expect(result[1].priority).toBe('hoch');        // String ID matched directly
    });

    it('should handle overlay entries without matching base', () => {
      const base = [
        makeClient({ id: 'client-1', status: 'offen' })
      ];
      const overlay = new Map([
        ['client-1', { status: 'inBearbeitung' }],
        ['client-999', { status: 'erledigt' }] // No matching base
      ]);
      
      const result = reconcileOverlay(base, overlay);
      
      expect(result.length).toBe(1); // Only base items returned
      expect(result[0].status).toBe('inBearbeitung');
      expect(overlay.has('client-999')).toBe(true); // Orphaned overlay entry preserved
    });
  });

  describe('edge cases', () => {
    it('should handle empty base array', () => {
      const base: any[] = [];
      const overlay = new Map([
        ['client-1', { status: 'inBearbeitung' }]
      ]);
      
      const result = reconcileOverlay(base, overlay);
      
      expect(result).toEqual([]);
      expect(overlay.size).toBe(1); // Overlay unchanged
    });

    it('should handle null/undefined values in overlay', () => {
      const base = [
        makeClient({ id: 'client-1', status: 'offen', assignedTo: 'user-123' })
      ];
      const overlay = new Map([
        ['client-1', { assignedTo: null, priority: undefined }]
      ]);
      
      const result = reconcileOverlay(base, overlay);
      
      expect(result[0].assignedTo).toBeNull();
      expect(result[0].priority).toBeUndefined();
    });

    it('should handle rapid successive patches (idempotent)', () => {
      let overlay = new Map<string, any>();
      
      // Apply same patch multiple times
      const patches = [
        makePatch('client-1', { status: 'inBearbeitung' }),
        makePatch('client-1', { status: 'inBearbeitung' }), // Duplicate
        makePatch('client-1', { status: 'inBearbeitung' })  // Duplicate
      ];
      
      for (const patch of patches) {
        overlay = applyPatchesToOverlay(overlay, [patch]);
      }
      
      expect(overlay.get('client-1')).toEqual({ status: 'inBearbeitung' });
      expect(overlay.size).toBe(1);
    });

    it('should handle overlapping field updates correctly', () => {
      let overlay = new Map<string, any>();
      
      // Apply overlapping patches
      const patchSequence = [
        [makePatch('client-1', { status: 'inBearbeitung', priority: 'normal' })],
        [makePatch('client-1', { status: 'terminVereinbart' })], // Override status
        [makePatch('client-1', { assignedTo: 'user-123' })]      // Add field
      ];
      
      for (const patches of patchSequence) {
        overlay = applyPatchesToOverlay(overlay, patches);
      }
      
      expect(overlay.get('client-1')).toEqual({
        status: 'terminVereinbart', // Latest value
        priority: 'normal',         // Preserved
        assignedTo: 'user-123'      // Added
      });
    });

    it('should handle concurrent patches to different fields', () => {
      const overlay = new Map<string, any>();
      const concurrentPatches = [
        makePatch('client-1', { status: 'inBearbeitung' }),
        makePatch('client-1', { priority: 'hoch' }),
        makePatch('client-1', { assignedTo: 'user-123' })
      ];
      
      const result = applyPatchesToOverlay(overlay, concurrentPatches);
      
      expect(result.get('client-1')).toEqual({
        status: 'inBearbeitung',
        priority: 'hoch',
        assignedTo: 'user-123'
      });
    });
  });

  describe('performance characteristics', () => {
    it('should handle large overlay maps efficiently', () => {
      const base = Array.from({ length: 1000 }, (_, i) => 
        makeClient({ id: `client-${i}`, status: 'offen' })
      );
      
      const overlay = new Map(
        Array.from({ length: 100 }, (_, i) => [
          `client-${i}`,
          { status: 'inBearbeitung' }
        ])
      );
      
      const start = performance.now();
      const result = reconcileOverlay(base, overlay);
      const duration = performance.now() - start;
      
      expect(result.length).toBe(1000);
      expect(duration).toBeLessThan(50); // Should be fast
      
      // First 100 should have overlay changes
      for (let i = 0; i < 100; i++) {
        expect(result[i].status).toBe('inBearbeitung');
      }
      
      // Remaining should be unchanged
      for (let i = 100; i < 1000; i++) {
        expect(result[i].status).toBe('offen');
      }
    });

    it('should handle many small patches efficiently', () => {
      let overlay = new Map<string, any>();
      
      const patches = Array.from({ length: 500 }, (_, i) => 
        makePatch(`client-${i % 50}`, { [`field${i}`]: `value${i}` })
      );
      
      const start = performance.now();
      overlay = applyPatchesToOverlay(overlay, patches);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // Should be reasonably fast
      expect(overlay.size).toBe(50); // 50 unique clients
      
      // Each client should have multiple fields
      const client0 = overlay.get('client-0');
      expect(Object.keys(client0).length).toBeGreaterThan(5);
    });
  });
});