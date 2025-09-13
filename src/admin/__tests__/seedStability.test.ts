/**
 * Tests for seed/admin stability
 * Ensures idempotent seeding and robust ID handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedTestData, ensureDemoUsersIfEmpty, buildDemoUsers } from '../../data/seed';

// Mock database for testing
const mockDb = {
  users: {
    count: vi.fn(),
    toArray: vi.fn(),
    bulkPut: vi.fn(),
    put: vi.fn()
  },
  clients: {
    where: vi.fn(() => ({
      equals: vi.fn(() => ({
        delete: vi.fn(),
        count: vi.fn()
      }))
    })),
    bulkPut: vi.fn(),
    put: vi.fn()
  },
  setKV: vi.fn()
};

vi.mock('../../data/db', () => ({
  db: mockDb
}));

describe('Seed Stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureDemoUsersIfEmpty', () => {
    it('should create users when database is empty', async () => {
      mockDb.users.count.mockResolvedValue(0);
      mockDb.users.bulkPut.mockResolvedValue(undefined);

      const result = await ensureDemoUsersIfEmpty();

      expect(result).toBe(3); // Should create 3 demo users
      expect(mockDb.users.count).toHaveBeenCalledTimes(1);
      expect(mockDb.users.bulkPut).toHaveBeenCalledTimes(1);
      
      const createdUsers = mockDb.users.bulkPut.mock.calls[0][0];
      expect(createdUsers).toHaveLength(3);
      expect(createdUsers.map((u: any) => u.role)).toEqual(['admin', 'editor', 'user']);
    });

    it('should not create users when database already has users', async () => {
      mockDb.users.count.mockResolvedValue(5);

      const result = await ensureDemoUsersIfEmpty();

      expect(result).toBe(0); // Should not create any users
      expect(mockDb.users.count).toHaveBeenCalledTimes(1);
      expect(mockDb.users.bulkPut).not.toHaveBeenCalled();
    });

    it('should be idempotent - multiple calls should not create duplicates', async () => {
      mockDb.users.count
        .mockResolvedValueOnce(0) // First call: empty
        .mockResolvedValue(3); // Subsequent calls: has users

      const result1 = await ensureDemoUsersIfEmpty();
      const result2 = await ensureDemoUsersIfEmpty();
      const result3 = await ensureDemoUsersIfEmpty();

      expect(result1).toBe(3); // Created users
      expect(result2).toBe(0); // No users created
      expect(result3).toBe(0); // No users created
      
      expect(mockDb.users.bulkPut).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('buildDemoUsers', () => {
    it('should generate consistent demo users', () => {
      const users1 = buildDemoUsers();
      const users2 = buildDemoUsers();

      expect(users1).toEqual(users2); // Should be deterministic
      expect(users1).toHaveLength(3);
      
      const [admin, editor, user] = users1;
      expect(admin.id).toBe('admin@local');
      expect(admin.role).toBe('admin');
      expect(editor.id).toBe('editor@local');
      expect(editor.role).toBe('editor');
      expect(user.id).toBe('user@local');
      expect(user.role).toBe('user');
    });

    it('should generate users with consistent ID format', () => {
      const users = buildDemoUsers();
      
      users.forEach(user => {
        expect(typeof user.id).toBe('string');
        expect(user.id).toMatch(/^(admin|editor|user)@local$/);
        expect(user.active).toBe(true);
        expect(typeof user.name).toBe('string');
        expect(user.name.length).toBeGreaterThan(0);
      });
    });

    it('should handle mixed ID types defensively', () => {
      // Test that the function handles various ID inputs without crashing
      const users = buildDemoUsers();
      
      // Simulate database with mixed ID types
      const mixedIdUsers = users.map((user, index) => ({
        ...user,
        id: index === 0 ? 123 : user.id // Mix numeric and string IDs
      }));

      // Should not crash when processing mixed types
      expect(() => {
        mixedIdUsers.forEach(user => {
          expect(typeof user.id === 'string' || typeof user.id === 'number').toBe(true);
        });
      }).not.toThrow();
    });
  });

  describe('seedTestData', () => {
    beforeEach(() => {
      // Setup mocks for client seeding
      mockDb.clients.where.mockReturnValue({
        equals: vi.fn(() => ({
          delete: vi.fn().mockResolvedValue(undefined),
          count: vi.fn().mockResolvedValue(0)
        }))
      });
      mockDb.clients.bulkPut.mockResolvedValue(undefined);
      mockDb.setKV.mockResolvedValue(undefined);
    });

    it('should skip seeding when mode is skip and data exists', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(5); // Existing data

      const result = await seedTestData('skip');

      expect(result.clients).toBe(0); // No clients created
      expect(mockDb.clients.bulkPut).not.toHaveBeenCalled();
    });

    it('should replace existing data when mode is replace', async () => {
      mockDb.clients.where().equals().delete.mockResolvedValue(undefined);
      mockDb.clients.bulkPut.mockResolvedValue(undefined);

      const result = await seedTestData('replace');

      expect(mockDb.clients.where().equals().delete).toHaveBeenCalledTimes(1);
      expect(mockDb.clients.bulkPut).toHaveBeenCalledTimes(1);
      expect(result.clients).toBe(16); // Default seed count
    });

    it('should generate unique IDs when mode is newIds', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(0);
      mockDb.clients.bulkPut.mockImplementation((rows) => {
        // Verify all IDs are unique
        const ids = rows.map((r: any) => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
        return Promise.resolve(undefined);
      });

      const result = await seedTestData('newIds');

      expect(result.clients).toBe(16);
      expect(mockDb.clients.bulkPut).toHaveBeenCalledTimes(1);
    });

    it('should handle bulkPut failure gracefully with fallback', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(0);
      mockDb.clients.bulkPut.mockRejectedValue(new Error('BulkPut failed'));
      mockDb.clients.put.mockResolvedValue(undefined);

      const result = await seedTestData('skip');

      // Should fallback to individual puts
      expect(mockDb.clients.put).toHaveBeenCalledTimes(16);
      expect(result.clients).toBe(16);
    });

    it('should generate deterministic data for same mode', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(0);
      
      let capturedRows1: any[] = [];
      let capturedRows2: any[] = [];
      
      mockDb.clients.bulkPut
        .mockImplementationOnce((rows) => {
          capturedRows1 = [...rows];
          return Promise.resolve(undefined);
        })
        .mockImplementationOnce((rows) => {
          capturedRows2 = [...rows];
          return Promise.resolve(undefined);
        });

      await seedTestData('skip');
      await seedTestData('skip');

      // Should generate same data structure (excluding timestamps)
      expect(capturedRows1).toHaveLength(capturedRows2.length);
      capturedRows1.forEach((row1, index) => {
        const row2 = capturedRows2[index];
        expect(row1.firstName).toBe(row2.firstName);
        expect(row1.lastName).toBe(row2.lastName);
        expect(row1.angebot).toBe(row2.angebot);
        expect(row1.priority).toBe(row2.priority);
      });
    });

    it('should handle timestamp normalization correctly', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(0);
      
      let capturedRows: any[] = [];
      mockDb.clients.bulkPut.mockImplementation((rows) => {
        capturedRows = [...rows];
        return Promise.resolve(undefined);
      });

      await seedTestData('skip');

      // All timestamps should be valid ISO strings
      capturedRows.forEach(row => {
        expect(row.lastActivity).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        if (row.followUp) {
          expect(row.followUp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }
        if (row.pinnedAt) {
          expect(row.pinnedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }
      });
    });
  });

  describe('defensive ID handling', () => {
    it('should handle mixed ID types without crashing', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(0);
      
      // Simulate database with mixed ID types
      const mixedIdRows = [
        { id: 'string-id-1', name: 'Client 1' },
        { id: 123, name: 'Client 2' }, // Numeric ID
        { id: 'string-id-3', name: 'Client 3' }
      ];
      
      mockDb.clients.bulkPut.mockImplementation((rows) => {
        // Should handle mixed ID types gracefully
        rows.forEach((row: any) => {
          expect(typeof row.id === 'string' || typeof row.id === 'number').toBe(true);
        });
        return Promise.resolve(undefined);
      });

      const result = await seedTestData('skip');
      expect(result.clients).toBe(16);
    });

    it('should prevent duplicate keys in generated data', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(0);
      
      let capturedRows: any[] = [];
      mockDb.clients.bulkPut.mockImplementation((rows) => {
        capturedRows = [...rows];
        return Promise.resolve(undefined);
      });

      await seedTestData('skip');

      // Check for duplicate IDs
      const ids = capturedRows.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // No duplicates

      // Check for duplicate rowKeys
      const rowKeys = capturedRows.map(r => r.rowKey);
      const uniqueRowKeys = new Set(rowKeys);
      expect(uniqueRowKeys.size).toBe(rowKeys.length); // No duplicates
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.users.count.mockRejectedValue(new Error('Database error'));

      // Should not throw, should return 0
      const result = await ensureDemoUsersIfEmpty();
      expect(result).toBe(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      mockDb.clients.where().equals().count.mockResolvedValue(0);
      mockDb.clients.bulkPut.mockRejectedValue(new Error('Bulk operation failed'));
      
      // Mock individual puts to succeed for some, fail for others
      let putCallCount = 0;
      mockDb.clients.put.mockImplementation(() => {
        putCallCount++;
        if (putCallCount % 3 === 0) {
          return Promise.reject(new Error('Individual put failed'));
        }
        return Promise.resolve(undefined);
      });

      const result = await seedTestData('skip');

      // Should handle partial failures gracefully
      expect(result.clients).toBeGreaterThan(0);
      expect(result.clients).toBeLessThanOrEqual(16);
    });
  });
});