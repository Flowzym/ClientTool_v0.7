/**
 * Tests für MutationService
 * Phase 1: Core-Stabilisierung
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mutationService } from './MutationService';
import type { Patch } from '../types/patch';

// Mock db
const mockDb = {
  clients: {
    get: vi.fn(),
    update: vi.fn()
  }
};

vi.mock('../data/db', () => ({
  db: mockDb
}));

describe('MutationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationService.clearStacks();
  });

  describe('applyPatch', () => {
    it('should apply patch and create undo entry', async () => {
      const currentData = { id: 'test-1', name: 'Old Name', status: 'old' };
      const patch: Patch<any> = {
        id: 'test-1',
        changes: { name: 'New Name' }
      };

      mockDb.clients.get.mockResolvedValue(currentData);
      mockDb.clients.update.mockResolvedValue(1);

      const result = await mutationService.applyPatch(patch);

      expect(result.success).toBe(true);
      expect(mockDb.clients.get).toHaveBeenCalledWith('test-1');
      expect(mockDb.clients.update).toHaveBeenCalledWith('test-1', { name: 'New Name' });
      
      const stackStatus = mutationService.getStackStatus();
      expect(stackStatus.canUndo).toBe(true);
      expect(stackStatus.undoCount).toBe(1);
    });

    it('should handle empty changes', async () => {
      const patch: Patch<any> = {
        id: 'test-1',
        changes: {}
      };

      const result = await mutationService.applyPatch(patch);

      expect(result.success).toBe(true);
      expect(mockDb.clients.get).not.toHaveBeenCalled();
      expect(mockDb.clients.update).not.toHaveBeenCalled();
    });

    it('should handle missing object', async () => {
      const patch: Patch<any> = {
        id: 'missing-id',
        changes: { name: 'New Name' }
      };

      mockDb.clients.get.mockResolvedValue(null);

      const result = await mutationService.applyPatch(patch);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('performUndo', () => {
    it('should undo last patch', async () => {
      // Setup: apply a patch first
      const currentData = { id: 'test-1', name: 'Old Name', status: 'old' };
      const patch: Patch<any> = {
        id: 'test-1',
        changes: { name: 'New Name' }
      };

      mockDb.clients.get.mockResolvedValue(currentData);
      mockDb.clients.update.mockResolvedValue(1);

      await mutationService.applyPatch(patch);

      // Now undo
      const updatedData = { id: 'test-1', name: 'New Name', status: 'old' };
      mockDb.clients.get.mockResolvedValue(updatedData);

      const undoResult = await mutationService.performUndo();

      expect(undoResult.success).toBe(true);
      expect(mockDb.clients.update).toHaveBeenLastCalledWith('test-1', { name: 'Old Name' });
      
      const stackStatus = mutationService.getStackStatus();
      expect(stackStatus.canUndo).toBe(false);
      expect(stackStatus.canRedo).toBe(true);
    });

    it('should handle empty undo stack', async () => {
      const result = await mutationService.performUndo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nothing to undo');
    });
  });

  describe('performRedo', () => {
    it('should redo after undo', async () => {
      // Setup: apply patch, then undo
      const currentData = { id: 'test-1', name: 'Old Name' };
      const patch: Patch<any> = {
        id: 'test-1',
        changes: { name: 'New Name' }
      };

      mockDb.clients.get.mockResolvedValue(currentData);
      mockDb.clients.update.mockResolvedValue(1);

      await mutationService.applyPatch(patch);
      
      const updatedData = { id: 'test-1', name: 'New Name' };
      mockDb.clients.get.mockResolvedValue(updatedData);
      await mutationService.performUndo();

      // Now redo
      const revertedData = { id: 'test-1', name: 'Old Name' };
      mockDb.clients.get.mockResolvedValue(revertedData);

      const redoResult = await mutationService.performRedo();

      expect(redoResult.success).toBe(true);
      expect(mockDb.clients.update).toHaveBeenLastCalledWith('test-1', { name: 'New Name' });
    });

    it('should handle empty redo stack', async () => {
      const result = await mutationService.performRedo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nothing to redo');
    });
  });

  describe('stack management', () => {
    it('should clear redo stack on new mutation', async () => {
      const currentData = { id: 'test-1', name: 'Name1' };
      
      // Apply -> Undo -> Apply new patch
      mockDb.clients.get.mockResolvedValue(currentData);
      mockDb.clients.update.mockResolvedValue(1);

      await mutationService.applyPatch({ id: 'test-1', changes: { name: 'Name2' } });
      
      const updatedData = { id: 'test-1', name: 'Name2' };
      mockDb.clients.get.mockResolvedValue(updatedData);
      await mutationService.performUndo();

      // Redo should be available
      expect(mutationService.getStackStatus().canRedo).toBe(true);

      // Apply new patch
      const revertedData = { id: 'test-1', name: 'Name1' };
      mockDb.clients.get.mockResolvedValue(revertedData);
      await mutationService.applyPatch({ id: 'test-1', changes: { name: 'Name3' } });

      // Redo should be cleared
      expect(mutationService.getStackStatus().canRedo).toBe(false);
    });

    it('should limit stack size', async () => {
      const currentData = { id: 'test-1', counter: 0 };
      mockDb.clients.get.mockResolvedValue(currentData);
      mockDb.clients.update.mockResolvedValue(1);

      // Apply 60 patches (more than maxStackSize of 50)
      for (let i = 1; i <= 60; i++) {
        mockDb.clients.get.mockResolvedValue({ id: 'test-1', counter: i - 1 });
        await mutationService.applyPatch({ 
          id: 'test-1', 
          changes: { counter: i } 
        });
      }

      const stackStatus = mutationService.getStackStatus();
      expect(stackStatus.undoCount).toBe(50); // Limited to maxStackSize
    });
  });
});