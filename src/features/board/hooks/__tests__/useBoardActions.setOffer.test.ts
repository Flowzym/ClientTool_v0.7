/**
 * Unit tests for setOffer in useBoardActions
 * Tests the offer patch flow through the mutation service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBoardActions } from '../useBoardActions';
import type { OfferValue } from '../../types';

// Mock the mutation service
const mockMutationService = {
  applyPatch: vi.fn()
};

vi.mock('../../../../services/MutationService', () => ({
  mutationService: mockMutationService
}));

// Mock db for the hook
vi.mock('../../../../data/db', () => ({
  db: {
    clients: {
      get: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe('useBoardActions.setOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationService.applyPatch.mockResolvedValue({ success: true });
  });

  describe('valid offer values', () => {
    const validOffers: OfferValue[] = ['BAM', 'LL/B+', 'BwB', 'NB'];

    validOffers.forEach(offer => {
      it(`should create correct patch for offer "${offer}"`, async () => {
        const { result } = renderHook(() => useBoardActions());
        
        await result.current.setOffer('client-123', offer);

        expect(mockMutationService.applyPatch).toHaveBeenCalledTimes(1);
        expect(mockMutationService.applyPatch).toHaveBeenCalledWith({
          id: 'client-123',
          changes: { angebot: offer }
        });
      });
    });
  });

  describe('clearing offer', () => {
    it('should create patch with null when offer is undefined', async () => {
      const { result } = renderHook(() => useBoardActions());
      
      await result.current.setOffer('client-123', undefined);

      expect(mockMutationService.applyPatch).toHaveBeenCalledTimes(1);
      expect(mockMutationService.applyPatch).toHaveBeenCalledWith({
        id: 'client-123',
        changes: { angebot: null }
      });
    });

    it('should create patch with null when offer is empty string', async () => {
      const { result } = renderHook(() => useBoardActions());
      
      await result.current.setOffer('client-123', '');

      expect(mockMutationService.applyPatch).toHaveBeenCalledTimes(1);
      expect(mockMutationService.applyPatch).toHaveBeenCalledWith({
        id: 'client-123',
        changes: { angebot: null }
      });
    });
  });

  describe('patch isolation', () => {
    it('should only include offer field in patch changes', async () => {
      const { result } = renderHook(() => useBoardActions());
      
      await result.current.setOffer('client-123', 'BAM');

      const patchCall = mockMutationService.applyPatch.mock.calls[0][0];
      const changes = patchCall.changes;
      
      // Should only contain angebot field
      expect(Object.keys(changes)).toEqual(['angebot']);
      expect(changes.angebot).toBe('BAM');
    });

    it('should not affect other fields when setting offer', async () => {
      const { result } = renderHook(() => useBoardActions());
      
      await result.current.setOffer('client-123', 'LL/B+');

      const patchCall = mockMutationService.applyPatch.mock.calls[0][0];
      const changes = patchCall.changes;
      
      // Should not contain status, priority, or other fields
      expect(changes.status).toBeUndefined();
      expect(changes.priority).toBeUndefined();
      expect(changes.followUp).toBeUndefined();
      expect(changes.assignedTo).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle mutation service errors gracefully', async () => {
      mockMutationService.applyPatch.mockRejectedValue(new Error('Database error'));
      
      const { result } = renderHook(() => useBoardActions());
      
      await expect(result.current.setOffer('client-123', 'BAM')).rejects.toThrow('Database error');
      
      expect(mockMutationService.applyPatch).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid client ID gracefully', async () => {
      const { result } = renderHook(() => useBoardActions());
      
      // Should not throw for invalid ID (service layer handles it)
      await expect(result.current.setOffer('', 'BAM')).resolves.not.toThrow();
      
      expect(mockMutationService.applyPatch).toHaveBeenCalledWith({
        id: '',
        changes: { angebot: 'BAM' }
      });
    });
  });

  describe('callback stability', () => {
    it('should maintain stable callback reference', () => {
      const { result, rerender } = renderHook(() => useBoardActions());
      
      const firstSetOffer = result.current.setOffer;
      
      rerender();
      
      const secondSetOffer = result.current.setOffer;
      
      // Callback should be stable (useCallback dependency array correct)
      expect(firstSetOffer).toBe(secondSetOffer);
    });
  });
});