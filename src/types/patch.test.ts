/**
 * Integration-Tests für Patch-Flow
 * Phase 1: Zwei aufeinanderfolgende Patches, Undo/Redo-Sequenz
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mutationService } from '../services/MutationService';
import type { Patch } from './patch';

// Mock db für Integration-Tests
const mockDb = {
  clients: {
    get: vi.fn(),
    update: vi.fn()
  }
};

vi.mock('../data/db', () => ({
  db: mockDb
}));

describe('Patch-Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationService.clearStacks();
  });

  it('should handle two consecutive patches with correct undo/redo sequence', async () => {
    // Initial state
    const initialData = { id: 'client-1', name: 'Original', status: 'offen', priority: 'normal' };
    
    // First patch
    const patch1: Patch<any> = {
      id: 'client-1',
      changes: { name: 'Updated Name' }
    };
    
    // Second patch
    const patch2: Patch<any> = {
      id: 'client-1',
      changes: { status: 'inBearbeitung' }
    };

    // Apply first patch
    mockDb.clients.get.mockResolvedValue(initialData);
    mockDb.clients.update.mockResolvedValue(1);
    
    const result1 = await mutationService.applyPatch(patch1);
    expect(result1.success).toBe(true);
    
    // Apply second patch
    const afterPatch1 = { ...initialData, name: 'Updated Name' };
    mockDb.clients.get.mockResolvedValue(afterPatch1);
    
    const result2 = await mutationService.applyPatch(patch2);
    expect(result2.success).toBe(true);
    
    // Verify stack state
    let stackStatus = mutationService.getStackStatus();
    expect(stackStatus.undoCount).toBe(2);
    expect(stackStatus.canUndo).toBe(true);
    expect(stackStatus.canRedo).toBe(false);

    // Undo second patch
    const afterPatch2 = { ...afterPatch1, status: 'inBearbeitung' };
    mockDb.clients.get.mockResolvedValue(afterPatch2);
    
    const undoResult1 = await mutationService.performUndo();
    expect(undoResult1.success).toBe(true);
    expect(mockDb.clients.update).toHaveBeenLastCalledWith('client-1', { status: 'offen' });
    
    // Undo first patch
    const afterUndo1 = { ...afterPatch2, status: 'offen' };
    mockDb.clients.get.mockResolvedValue(afterUndo1);
    
    const undoResult2 = await mutationService.performUndo();
    expect(undoResult2.success).toBe(true);
    expect(mockDb.clients.update).toHaveBeenLastCalledWith('client-1', { name: 'Original' });
    
    // Verify stack state after undos
    stackStatus = mutationService.getStackStatus();
    expect(stackStatus.undoCount).toBe(0);
    expect(stackStatus.redoCount).toBe(2);
    expect(stackStatus.canUndo).toBe(false);
    expect(stackStatus.canRedo).toBe(true);

    // Redo first patch
    const afterUndo2 = { ...initialData };
    mockDb.clients.get.mockResolvedValue(afterUndo2);
    
    const redoResult1 = await mutationService.performRedo();
    expect(redoResult1.success).toBe(true);
    expect(mockDb.clients.update).toHaveBeenLastCalledWith('client-1', { name: 'Updated Name' });
    
    // Redo second patch
    const afterRedo1 = { ...initialData, name: 'Updated Name' };
    mockDb.clients.get.mockResolvedValue(afterRedo1);
    
    const redoResult2 = await mutationService.performRedo();
    expect(redoResult2.success).toBe(true);
    expect(mockDb.clients.update).toHaveBeenLastCalledWith('client-1', { status: 'inBearbeitung' });
    
    // Final state verification
    stackStatus = mutationService.getStackStatus();
    expect(stackStatus.undoCount).toBe(2);
    expect(stackStatus.redoCount).toBe(0);
    expect(stackStatus.canUndo).toBe(true);
    expect(stackStatus.canRedo).toBe(false);
  });

  it('should handle patch on non-existent object gracefully', async () => {
    const patch: Patch<any> = {
      id: 'non-existent',
      changes: { name: 'Test' }
    };

    mockDb.clients.get.mockResolvedValue(null);

    const result = await mutationService.applyPatch(patch);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(mockDb.clients.update).not.toHaveBeenCalled();
    
    // Stack should remain empty
    const stackStatus = mutationService.getStackStatus();
    expect(stackStatus.undoCount).toBe(0);
    expect(stackStatus.redoCount).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    const currentData = { id: 'test-1', name: 'Original' };
    const patch: Patch<any> = {
      id: 'test-1',
      changes: { name: 'Updated' }
    };

    mockDb.clients.get.mockResolvedValue(currentData);
    mockDb.clients.update.mockRejectedValue(new Error('Database error'));

    const result = await mutationService.applyPatch(patch);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
    
    // Stack should remain empty on failed patch
    const stackStatus = mutationService.getStackStatus();
    expect(stackStatus.undoCount).toBe(0);
  });
});