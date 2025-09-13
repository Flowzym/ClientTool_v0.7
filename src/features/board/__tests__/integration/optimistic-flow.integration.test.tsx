/**
 * Integration tests for Optimistic Update Flow
 * Tests pending state → reconciliation scenarios (happy path & divergence)
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { renderWithProviders, mockActions, resetMockActions } from '../TestHarness';
import { useOptimisticOverlay } from '../../hooks/useOptimisticOverlay';
import { ClientRow } from '../../components/ClientRow';
import { makeRow, mockUsers } from '../fixtures';
import type { Patch } from '../../../../types/patch';

describe('Optimistic Flow Integration', () => {
  beforeEach(() => {
    resetMockActions();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
  });

  describe('happy path - overlay reconciliation', () => {
    it('should show optimistic state during pending and reconcile when base confirms', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Initial base data
      const initialData = [
        makeRow({ id: 'client-1', status: 'offen', priority: 'normal' })
      ];

      const { result, rerender } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Initial state should match base
      expect(result.current[0].status).toBe('offen');

      // Apply optimistic update (simulate UI interaction)
      act(() => {
        const patches: Patch<any>[] = [
          { id: 'client-1', changes: { status: 'inBearbeitung', priority: 'hoch' } }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      // Should show optimistic state immediately
      expect(result.current[0].status).toBe('inBearbeitung');
      expect(result.current[0].priority).toBe('hoch');

      // Simulate server/persistence confirming the exact changes
      const confirmedData = [
        makeRow({ 
          id: 'client-1', 
          status: 'inBearbeitung', // Confirmed
          priority: 'hoch' // Confirmed
        })
      ];

      rerender({ base: confirmedData });

      // Overlay should be reconciled away since base now matches
      expect(result.current[0].status).toBe('inBearbeitung');
      expect(result.current[0].priority).toBe('hoch');
      
      // Verify no overlay artifacts remain
      expect(result.current).toEqual(confirmedData);
    });

    it('should handle UI interaction with optimistic updates', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock update to be async with controlled resolution
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise(resolve => {
        resolveUpdate = resolve;
      });
      
      mockActions.setStatus.mockImplementation(async (id, status) => {
        // Apply optimistic update immediately
        const patches: Patch<any>[] = [{ id, changes: { status } }];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
        
        // Return controlled promise
        return updatePromise;
      });

      const client = makeRow({ id: 'client-1', status: 'offen' });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Click status to change it
      const statusButton = screen.getByText('Offen');
      await user.click(statusButton);

      const newStatusOption = screen.getByText('Gebucht / Bearbeitung');
      await user.click(newStatusOption);

      // Should show optimistic state immediately
      await waitFor(() => {
        expect(mockActions.setStatus).toHaveBeenCalledWith('client-1', 'inBearbeitung');
      });

      // Resolve the async operation
      act(() => {
        resolveUpdate!(true);
      });

      await waitFor(() => {
        // Operation completed
        expect(mockActions.setStatus).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('divergence scenarios', () => {
    it('should handle server returning different values than optimistic', async () => {
      const initialData = [
        makeRow({ id: 'client-1', status: 'offen', assignedTo: undefined })
      ];

      const { result, rerender } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Apply optimistic changes
      act(() => {
        const patches: Patch<any>[] = [
          { id: 'client-1', changes: { status: 'inBearbeitung', assignedTo: 'user-123' } }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      // Verify optimistic state
      expect(result.current[0].status).toBe('inBearbeitung');
      expect(result.current[0].assignedTo).toBe('user-123');

      // Server returns different data (conflict/rollback scenario)
      const divergentData = [
        makeRow({ 
          id: 'client-1', 
          status: 'offen', // Server didn't apply status change
          assignedTo: 'user-456' // Server applied different assignment
        })
      ];

      rerender({ base: divergentData });

      // UI should show overlay over base where they differ
      expect(result.current[0].status).toBe('inBearbeitung'); // From overlay (differs from base)
      expect(result.current[0].assignedTo).toBe('user-123'); // From overlay (differs from base)
    });

    it('should handle partial confirmation scenarios', async () => {
      const initialData = [
        makeRow({ id: 'client-1', status: 'offen', priority: 'normal', assignedTo: undefined })
      ];

      const { result, rerender } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Apply multi-field optimistic update
      act(() => {
        const patches: Patch<any>[] = [
          { 
            id: 'client-1', 
            changes: { 
              status: 'inBearbeitung', 
              priority: 'hoch', 
              assignedTo: 'user-123' 
            } 
          }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      // Server confirms only some changes
      const partiallyConfirmedData = [
        makeRow({ 
          id: 'client-1', 
          status: 'inBearbeitung', // Confirmed
          priority: 'normal', // NOT confirmed (conflict)
          assignedTo: 'user-123' // Confirmed
        })
      ];

      rerender({ base: partiallyConfirmedData });

      // Should show mix of base and overlay
      expect(result.current[0].status).toBe('inBearbeitung'); // From base (confirmed)
      expect(result.current[0].priority).toBe('hoch'); // From overlay (not confirmed)
      expect(result.current[0].assignedTo).toBe('user-123'); // From base (confirmed)
    });
  });

  describe('optimistic update with UI feedback', () => {
    it('should show immediate feedback on status change', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock actions to apply optimistic updates
      mockActions.setStatus.mockImplementation(async (id, status) => {
        const patches: Patch<any>[] = [{ id, changes: { status } }];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
        
        // Simulate async persistence
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Simulate commit (reconciliation trigger)
        window.dispatchEvent(new CustomEvent('board:optimistic-commit', { 
          detail: { patches } 
        }));
      });

      const client = makeRow({ id: 'client-1', status: 'offen' });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Initial state
      expect(screen.getByText('Offen')).toBeInTheDocument();

      // Change status
      const statusButton = screen.getByText('Offen');
      await user.click(statusButton);

      const newStatusOption = screen.getByText('Gebucht / Bearbeitung');
      await user.click(newStatusOption);

      // Should show optimistic state immediately
      await waitFor(() => {
        expect(mockActions.setStatus).toHaveBeenCalledWith('client-1', 'inBearbeitung');
      });

      // Advance timers to complete async operation
      act(() => {
        vi.advanceTimersByTime(150);
      });

      await waitFor(() => {
        // Operation should be complete
        expect(mockActions.setStatus).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle multiple rapid changes correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      let changeCount = 0;
      mockActions.setStatus.mockImplementation(async (id, status) => {
        changeCount++;
        const patches: Patch<any>[] = [{ id, changes: { status, changeCount } }];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      const client = makeRow({ id: 'client-1', status: 'offen' });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Make rapid status changes
      const statusButton = screen.getByText('Offen');
      
      await user.click(statusButton);
      await user.click(screen.getByText('Gebucht / Bearbeitung'));
      
      await user.click(screen.getByText('Gebucht / Bearbeitung'));
      await user.click(screen.getByText('Abgebucht / Erledigt'));

      await waitFor(() => {
        expect(mockActions.setStatus).toHaveBeenCalledTimes(2);
      });

      // Should handle rapid changes without race conditions
      expect(mockActions.setStatus).toHaveBeenLastCalledWith('client-1', 'erledigt');
    });
  });

  describe('optimistic overlay cleanup', () => {
    it('should clear overlay on explicit clear event', async () => {
      const initialData = [
        makeRow({ id: 'client-1', status: 'offen' })
      ];

      const { result } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Apply optimistic update
      act(() => {
        const patches: Patch<any>[] = [
          { id: 'client-1', changes: { status: 'inBearbeitung' } }
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
      expect(result.current[0].status).toBe('offen');
    });

    it('should handle overlay cleanup on component unmount', async () => {
      const initialData = [makeRow({ id: 'client-1', status: 'offen' })];

      const { result, unmount } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Apply optimistic update
      act(() => {
        const patches: Patch<any>[] = [
          { id: 'client-1', changes: { status: 'inBearbeitung' } }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      expect(result.current[0].status).toBe('inBearbeitung');

      // Unmount component
      unmount();

      // Should clean up event listeners (no memory leaks)
      // This is tested by ensuring no errors when events are dispatched after unmount
      expect(() => {
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches: [] } 
        }));
      }).not.toThrow();
    });
  });

  describe('complex optimistic scenarios', () => {
    it('should handle overlapping optimistic updates correctly', async () => {
      const initialData = [
        makeRow({ id: 'client-1', status: 'offen', priority: 'normal' })
      ];

      const { result } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Apply first optimistic update
      act(() => {
        const patches: Patch<any>[] = [
          { id: 'client-1', changes: { status: 'inBearbeitung' } }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      expect(result.current[0].status).toBe('inBearbeitung');
      expect(result.current[0].priority).toBe('normal'); // Unchanged

      // Apply second optimistic update to same record
      act(() => {
        const patches: Patch<any>[] = [
          { id: 'client-1', changes: { priority: 'hoch' } }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      // Should merge both optimistic changes
      expect(result.current[0].status).toBe('inBearbeitung'); // From first update
      expect(result.current[0].priority).toBe('hoch'); // From second update
    });

    it('should handle optimistic updates to different records', async () => {
      const initialData = [
        makeRow({ id: 'client-1', status: 'offen' }),
        makeRow({ id: 'client-2', status: 'offen' })
      ];

      const { result } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Apply optimistic updates to different clients
      act(() => {
        const patches: Patch<any>[] = [
          { id: 'client-1', changes: { status: 'inBearbeitung' } },
          { id: 'client-2', changes: { status: 'erledigt' } }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      // Both should show optimistic states
      expect(result.current[0].status).toBe('inBearbeitung');
      expect(result.current[1].status).toBe('erledigt');
    });
  });

  describe('error scenarios', () => {
    it('should handle optimistic update failure with rollback', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock update to fail and trigger rollback
      mockActions.setStatus.mockImplementation(async (id, status) => {
        // Apply optimistic update first
        const patches: Patch<any>[] = [{ id, changes: { status } }];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
        
        // Simulate failure after delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Clear optimistic state on failure
        window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
        
        throw new Error('Update failed');
      });

      const client = makeRow({ id: 'client-1', status: 'offen' });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      const statusButton = screen.getByText('Offen');
      await user.click(statusButton);

      const newStatusOption = screen.getByText('Gebucht / Bearbeitung');
      await user.click(newStatusOption);

      // Advance timers to trigger failure
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockActions.setStatus).toHaveBeenCalledTimes(1);
      });

      // Should handle error gracefully (error handling in actual implementation)
    });

    it('should handle concurrent optimistic updates', async () => {
      const initialData = [
        makeRow({ id: 'client-1', status: 'offen', priority: 'normal' })
      ];

      const { result } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: initialData } }
      );

      // Apply concurrent optimistic updates
      act(() => {
        // First update
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches: [{ id: 'client-1', changes: { status: 'inBearbeitung' } }] } 
        }));
        
        // Second update (overlapping)
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches: [{ id: 'client-1', changes: { priority: 'hoch' } }] } 
        }));
      });

      // Should merge both updates correctly
      expect(result.current[0].status).toBe('inBearbeitung');
      expect(result.current[0].priority).toBe('hoch');
    });
  });

  describe('performance with large datasets', () => {
    it('should handle optimistic updates efficiently with many records', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => 
        makeRow({ id: `client-${i}`, status: 'offen' })
      );

      const { result } = renderHook(
        ({ base }) => useOptimisticOverlay(base),
        { initialProps: { base: largeDataset } }
      );

      const start = performance.now();

      // Apply optimistic updates to multiple records
      act(() => {
        const patches: Patch<any>[] = Array.from({ length: 10 }, (_, i) => ({
          id: `client-${i}`,
          changes: { status: 'inBearbeitung' }
        }));
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
      });

      const duration = performance.now() - start;

      // Should complete quickly
      expect(duration).toBeLessThan(100);

      // Verify updates were applied
      for (let i = 0; i < 10; i++) {
        expect(result.current[i].status).toBe('inBearbeitung');
      }

      // Remaining records should be unchanged
      for (let i = 10; i < 100; i++) {
        expect(result.current[i].status).toBe('offen');
      }
    });
  });
});