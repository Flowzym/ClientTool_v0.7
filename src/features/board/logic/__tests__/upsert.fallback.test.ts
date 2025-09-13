/**
 * Unit tests for upsert fallback logic
 * Tests tolerant update strategies when primary key lookup fails
 */

import { describe, it, expect, vi } from 'vitest';

// Test utilities
function makeClient(overrides: any = {}) {
  return {
    id: 'client-1',
    amsId: 'A12345',
    firstName: 'Max',
    lastName: 'Mustermann',
    status: 'offen',
    priority: 'normal',
    contactCount: 0,
    isArchived: false,
    ...overrides
  };
}

// Mock table interface for testing
interface MockTable {
  get: (id: any) => Promise<any>;
  update: (id: any, changes: any) => Promise<number>;
  put: (obj: any) => Promise<void>;
  toArray: () => Promise<any[]>;
}

// Pure function for candidate lookup (extracted from BoardService logic)
async function findByAnyId(table: MockTable, targetId: any): Promise<any | null> {
  // 1) Direct PK lookup
  try {
    const direct = await table.get(targetId);
    if (direct) return direct;
  } catch {
    // PK lookup failed
  }

  // 2) Fallback search on common fields
  const all = await table.toArray();
  const targetStr = String(targetId);
  
  const candidate = all.find((row: any) =>
    String(row?.id) === targetStr ||
    String(row?.clientId) === targetStr ||
    String(row?.uuid) === targetStr ||
    String(row?.amsId) === targetStr
  );
  
  return candidate || null;
}

// Pure function for upsert operation
async function performUpsert(
  table: MockTable,
  id: any,
  changes: any
): Promise<{ strategy: 'update' | 'put'; rowsAffected: number }> {
  // Try direct update first
  try {
    const updated = await table.update(id, changes);
    if (updated && updated > 0) {
      return { strategy: 'update', rowsAffected: updated };
    }
  } catch {
    // Update failed
  }

  // Fallback: find candidate and merge
  const candidate = await findByAnyId(table, id);
  const merged = { ...(candidate || { id }), ...changes };
  
  await table.put(merged);
  return { strategy: 'put', rowsAffected: 1 };
}

describe('Upsert Fallback Logic', () => {
  let mockTable: MockTable;

  beforeEach(() => {
    mockTable = {
      get: vi.fn(),
      update: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn()
    };
  });

  describe('direct update success', () => {
    it('should use update strategy when direct lookup succeeds', async () => {
      mockTable.update = vi.fn().mockResolvedValue(1); // 1 row updated
      
      const result = await performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' });
      
      expect(result.strategy).toBe('update');
      expect(result.rowsAffected).toBe(1);
      expect(mockTable.update).toHaveBeenCalledWith('client-1', { status: 'inBearbeitung' });
      expect(mockTable.put).not.toHaveBeenCalled();
    });

    it('should not fallback when update returns > 0', async () => {
      mockTable.update = vi.fn().mockResolvedValue(2); // Multiple rows updated
      
      const result = await performUpsert(mockTable, 'client-1', { priority: 'hoch' });
      
      expect(result.strategy).toBe('update');
      expect(result.rowsAffected).toBe(2);
      expect(mockTable.toArray).not.toHaveBeenCalled();
    });
  });

  describe('fallback to candidate lookup', () => {
    it('should fallback when update returns 0 rows', async () => {
      mockTable.update = vi.fn().mockResolvedValue(0); // No rows updated
      mockTable.get = vi.fn().mockResolvedValue(null);  // Direct get fails
      mockTable.toArray = vi.fn().mockResolvedValue([
        makeClient({ id: 'different-id', amsId: 'A12345' })
      ]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      const result = await performUpsert(mockTable, 'A12345', { status: 'inBearbeitung' });
      
      expect(result.strategy).toBe('put');
      expect(result.rowsAffected).toBe(1);
      expect(mockTable.put).toHaveBeenCalledWith({
        id: 'different-id',
        amsId: 'A12345',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'inBearbeitung', // Updated field
        priority: 'normal',      // Preserved
        contactCount: 0,
        isArchived: false
      });
    });

    it('should fallback when update throws error', async () => {
      mockTable.update = vi.fn().mockRejectedValue(new Error('Update failed'));
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([
        makeClient({ id: 'client-1', status: 'offen' })
      ]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      const result = await performUpsert(mockTable, 'client-1', { priority: 'hoch' });
      
      expect(result.strategy).toBe('put');
      expect(mockTable.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'client-1',
          priority: 'hoch'
        })
      );
    });
  });

  describe('candidate matching strategies', () => {
    it('should match by direct ID', async () => {
      const clients = [
        makeClient({ id: 'client-123', amsId: 'A99999' }),
        makeClient({ id: 'client-456', amsId: 'A88888' })
      ];
      mockTable.toArray = vi.fn().mockResolvedValue(clients);
      
      const candidate = await findByAnyId(mockTable, 'client-123');
      
      expect(candidate).toEqual(clients[0]);
    });

    it('should match by amsId when ID differs', async () => {
      const clients = [
        makeClient({ id: 'different-id', amsId: 'A12345' }),
        makeClient({ id: 'another-id', amsId: 'A67890' })
      ];
      mockTable.toArray = vi.fn().mockResolvedValue(clients);
      
      const candidate = await findByAnyId(mockTable, 'A12345');
      
      expect(candidate).toEqual(clients[0]);
    });

    it('should match by clientId field', async () => {
      const clients = [
        makeClient({ id: 'internal-1', clientId: 'external-123' }),
        makeClient({ id: 'internal-2', clientId: 'external-456' })
      ];
      mockTable.toArray = vi.fn().mockResolvedValue(clients);
      
      const candidate = await findByAnyId(mockTable, 'external-123');
      
      expect(candidate).toEqual(clients[0]);
    });

    it('should match by uuid field', async () => {
      const clients = [
        makeClient({ id: 'short-id', uuid: 'long-uuid-12345' })
      ];
      mockTable.toArray = vi.fn().mockResolvedValue(clients);
      
      const candidate = await findByAnyId(mockTable, 'long-uuid-12345');
      
      expect(candidate).toEqual(clients[0]);
    });

    it('should return null when no candidate found', async () => {
      const clients = [
        makeClient({ id: 'client-1', amsId: 'A12345' })
      ];
      mockTable.toArray = vi.fn().mockResolvedValue(clients);
      
      const candidate = await findByAnyId(mockTable, 'non-existent');
      
      expect(candidate).toBeNull();
    });

    it('should handle string vs numeric ID matching', async () => {
      const clients = [
        makeClient({ id: 123, amsId: 'A12345' }),      // Numeric ID
        makeClient({ id: '456', amsId: 'A67890' })     // String ID
      ];
      mockTable.toArray = vi.fn().mockResolvedValue(clients);
      
      const candidate1 = await findByAnyId(mockTable, '123'); // String search for numeric
      const candidate2 = await findByAnyId(mockTable, 456);   // Numeric search for string
      
      expect(candidate1).toEqual(clients[0]);
      expect(candidate2).toEqual(clients[1]);
    });
  });

  describe('merge strategies', () => {
    it('should merge changes over existing candidate', async () => {
      const existing = makeClient({
        id: 'client-1',
        status: 'offen',
        priority: 'normal',
        assignedTo: 'user-old'
      });
      
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([existing]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      await performUpsert(mockTable, 'client-1', {
        status: 'inBearbeitung',
        assignedTo: 'user-new'
      });
      
      expect(mockTable.put).toHaveBeenCalledWith({
        ...existing,
        status: 'inBearbeitung', // Updated
        assignedTo: 'user-new'    // Updated
        // priority: 'normal' preserved
      });
    });

    it('should create new record when no candidate found', async () => {
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      await performUpsert(mockTable, 'new-client', {
        firstName: 'Anna',
        lastName: 'Schmidt',
        status: 'offen'
      });
      
      expect(mockTable.put).toHaveBeenCalledWith({
        id: 'new-client',
        firstName: 'Anna',
        lastName: 'Schmidt',
        status: 'offen'
      });
    });

    it('should preserve all existing fields during merge', async () => {
      const existing = makeClient({
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com',
        phone: '+43 123 456789',
        status: 'offen',
        priority: 'normal',
        contactCount: 5,
        contactLog: [{ date: '2024-01-15', channel: 'telefon' }],
        isArchived: false
      });
      
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([existing]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      await performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' });
      
      const putCall = (mockTable.put as any).mock.calls[0][0];
      
      // Should preserve all original fields
      expect(putCall.firstName).toBe('Max');
      expect(putCall.lastName).toBe('Mustermann');
      expect(putCall.email).toBe('max@example.com');
      expect(putCall.phone).toBe('+43 123 456789');
      expect(putCall.contactCount).toBe(5);
      expect(putCall.contactLog).toEqual([{ date: '2024-01-15', channel: 'telefon' }]);
      expect(putCall.isArchived).toBe(false);
      
      // Should update only the changed field
      expect(putCall.status).toBe('inBearbeitung');
      expect(putCall.priority).toBe('normal'); // Unchanged
    });
  });

  describe('race condition handling', () => {
    it('should handle rapid successive upserts deterministically', async () => {
      const existing = makeClient({ id: 'client-1', status: 'offen', priority: 'normal' });
      
      mockTable.update = vi.fn().mockResolvedValue(0); // Always fallback to put
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([existing]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      // Rapid successive upserts
      const upsert1 = performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' });
      const upsert2 = performUpsert(mockTable, 'client-1', { priority: 'hoch' });
      const upsert3 = performUpsert(mockTable, 'client-1', { assignedTo: 'user-123' });
      
      const results = await Promise.all([upsert1, upsert2, upsert3]);
      
      // All should use put strategy
      results.forEach(result => {
        expect(result.strategy).toBe('put');
        expect(result.rowsAffected).toBe(1);
      });
      
      // Should have called put 3 times
      expect(mockTable.put).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent upserts to different IDs', async () => {
      const clients = [
        makeClient({ id: 'client-1', status: 'offen' }),
        makeClient({ id: 'client-2', status: 'offen' })
      ];
      
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue(clients);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      const upserts = [
        performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' }),
        performUpsert(mockTable, 'client-2', { status: 'erledigt' })
      ];
      
      const results = await Promise.all(upserts);
      
      expect(results[0].strategy).toBe('put');
      expect(results[1].strategy).toBe('put');
      expect(mockTable.put).toHaveBeenCalledTimes(2);
      
      // Should have updated different clients
      const putCalls = (mockTable.put as any).mock.calls;
      expect(putCalls[0][0].id).toBe('client-1');
      expect(putCalls[0][0].status).toBe('inBearbeitung');
      expect(putCalls[1][0].id).toBe('client-2');
      expect(putCalls[1][0].status).toBe('erledigt');
    });
  });

  describe('error handling', () => {
    it('should handle table.get errors gracefully', async () => {
      mockTable.get = vi.fn().mockRejectedValue(new Error('Get failed'));
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.toArray = vi.fn().mockResolvedValue([]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      const result = await performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' });
      
      expect(result.strategy).toBe('put');
      expect(mockTable.put).toHaveBeenCalledWith({
        id: 'client-1',
        status: 'inBearbeitung'
      });
    });

    it('should handle table.toArray errors gracefully', async () => {
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockRejectedValue(new Error('ToArray failed'));
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      const result = await performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' });
      
      expect(result.strategy).toBe('put');
      expect(mockTable.put).toHaveBeenCalledWith({
        id: 'client-1',
        status: 'inBearbeitung'
      });
    });

    it('should propagate put errors', async () => {
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([]);
      mockTable.put = vi.fn().mockRejectedValue(new Error('Put failed'));
      
      await expect(performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' }))
        .rejects.toThrow('Put failed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty changes object', async () => {
      mockTable.update = vi.fn().mockResolvedValue(1);
      
      const result = await performUpsert(mockTable, 'client-1', {});
      
      expect(result.strategy).toBe('update');
      expect(mockTable.update).toHaveBeenCalledWith('client-1', {});
    });

    it('should handle null/undefined changes values', async () => {
      const existing = makeClient({ id: 'client-1', assignedTo: 'user-123' });
      
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([existing]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      await performUpsert(mockTable, 'client-1', {
        assignedTo: null,
        priority: undefined
      });
      
      expect(mockTable.put).toHaveBeenCalledWith({
        ...existing,
        assignedTo: null,
        priority: undefined
      });
    });

    it('should handle malformed candidate records', async () => {
      const malformedClients = [
        null,
        undefined,
        { id: 'client-1' }, // Missing required fields
        { amsId: 'A12345' } // Missing ID
      ];
      
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue(malformedClients);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      const candidate = await findByAnyId(mockTable, 'client-1');
      
      expect(candidate).toEqual({ id: 'client-1' }); // Should find the partial match
    });

    it('should handle very large candidate arrays efficiently', async () => {
      const largeClientArray = Array.from({ length: 10000 }, (_, i) => 
        makeClient({ id: `client-${i}`, amsId: `A${String(i).padStart(5, '0')}` })
      );
      
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue(largeClientArray);
      
      const start = performance.now();
      const candidate = await findByAnyId(mockTable, 'A09999'); // Last item
      const duration = performance.now() - start;
      
      expect(candidate).toBeTruthy();
      expect(candidate.amsId).toBe('A09999');
      expect(duration).toBeLessThan(100); // Should be reasonably fast
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed success/fallback in batch operations', async () => {
      const existing = makeClient({ id: 'client-2', amsId: 'A67890' });
      
      // Mock: client-1 update succeeds, client-2 needs fallback
      mockTable.update = vi.fn()
        .mockResolvedValueOnce(1)  // client-1 succeeds
        .mockResolvedValueOnce(0); // client-2 fails, needs fallback
      
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([existing]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      const result1 = await performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' });
      const result2 = await performUpsert(mockTable, 'client-2', { status: 'erledigt' });
      
      expect(result1.strategy).toBe('update');
      expect(result2.strategy).toBe('put');
      
      expect(mockTable.update).toHaveBeenCalledTimes(2);
      expect(mockTable.put).toHaveBeenCalledTimes(1);
    });

    it('should maintain data integrity during fallback merge', async () => {
      const existing = makeClient({
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'offen',
        contactLog: [
          { date: '2024-01-15', channel: 'telefon', note: 'Erstkontakt' }
        ],
        metadata: {
          nested: { deep: { value: 'preserved' } },
          array: [1, 2, 3]
        }
      });
      
      mockTable.update = vi.fn().mockResolvedValue(0);
      mockTable.get = vi.fn().mockResolvedValue(null);
      mockTable.toArray = vi.fn().mockResolvedValue([existing]);
      mockTable.put = vi.fn().mockResolvedValue(undefined);
      
      await performUpsert(mockTable, 'client-1', { status: 'inBearbeitung' });
      
      const merged = (mockTable.put as any).mock.calls[0][0];
      
      // Complex nested data should be preserved
      expect(merged.contactLog).toEqual(existing.contactLog);
      expect(merged.metadata).toEqual(existing.metadata);
      expect(merged.metadata.nested.deep.value).toBe('preserved');
      expect(merged.metadata.array).toEqual([1, 2, 3]);
      
      // Only status should be updated
      expect(merged.status).toBe('inBearbeitung');
    });
  });
});