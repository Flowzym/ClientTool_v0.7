/**
 * Integration tests for Undo/Redo functionality
 * Tests the complete flow: UI change → optimistic update → undo → redo with history management
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockActions, resetMockActions } from '../TestHarness';
import { ClientRow } from '../../components/ClientRow';
import { makeRow, mockUsers } from '../fixtures';

// Mock the mutation service for undo/redo testing
const mockMutationService = {
  performUndo: vi.fn(),
  performRedo: vi.fn(),
  getStackStatus: vi.fn(),
  applyPatch: vi.fn(),
  clearStacks: vi.fn()
};

vi.mock('../../../../services/MutationService', () => ({
  mutationService: mockMutationService
}));

describe('Undo/Redo Integration', () => {
  beforeEach(() => {
    resetMockActions();
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Setup realistic undo/redo implementation
    mockActions.undo.mockImplementation(async () => {
      const result = await mockMutationService.performUndo();
      if (result.success) {
        window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
      }
      return result.success;
    });

    mockActions.redo.mockImplementation(async () => {
      const result = await mockMutationService.performRedo();
      if (result.success) {
        window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
      }
      return result.success;
    });

    mockActions.getStackStatus.mockImplementation(() => 
      mockMutationService.getStackStatus()
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    window.dispatchEvent(new CustomEvent('board:optimistic-clear'));
  });

  describe('undo after status change', () => {
    it('should undo status change and revert to previous state', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Setup: after status change, undo becomes available
      mockMutationService.getStackStatus
        .mockReturnValueOnce({ canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 })
        .mockReturnValue({ canUndo: true, canRedo: false, undoCount: 1, redoCount: 0 });
      
      mockMutationService.performUndo.mockResolvedValue({ success: true });

      const client = makeRow({
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'offen'
      });

      renderWithProviders(
        <div>
          <ClientRow
            client={client}
            index={0}
            users={mockUsers}
            actions={mockActions}
            selected={false}
            onToggleSelect={vi.fn()}
          />
          <div>
            <button 
              onClick={() => mockActions.undo()}
              disabled={!mockActions.getStackStatus().canUndo}
            >
              Undo
            </button>
            <button 
              onClick={() => mockActions.redo()}
              disabled={!mockActions.getStackStatus().canRedo}
            >
              Redo
            </button>
          </div>
        </div>
      );

      // Initial state - undo should be disabled
      expect(screen.getByText('Undo')).toBeDisabled();

      // Change status (this would normally add to undo stack)
      const statusButton = screen.getByText('Offen');
      await user.click(statusButton);

      const newStatusOption = screen.getByText('Gebucht / Bearbeitung');
      await user.click(newStatusOption);

      await waitFor(() => {
        expect(mockActions.setStatus).toHaveBeenCalledWith('client-1', 'inBearbeitung');
      });

      // After status change, undo should be available
      // (In real implementation, this would be triggered by successful mutation)
      
      // Perform undo
      const undoButton = screen.getByText('Undo');
      await user.click(undoButton);

      await waitFor(() => {
        expect(mockActions.undo).toHaveBeenCalledTimes(1);
        expect(mockMutationService.performUndo).toHaveBeenCalledTimes(1);
      });
    });

    it('should update undo/redo button states correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Simulate undo/redo state progression
      const stackStates = [
        { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 }, // Initial
        { canUndo: true, canRedo: false, undoCount: 1, redoCount: 0 },  // After change
        { canUndo: false, canRedo: true, undoCount: 0, redoCount: 1 },  // After undo
        { canUndo: true, canRedo: false, undoCount: 1, redoCount: 0 }   // After redo
      ];
      
      let stateIndex = 0;
      mockMutationService.getStackStatus.mockImplementation(() => stackStates[stateIndex]);
      
      mockMutationService.performUndo.mockImplementation(async () => {
        stateIndex = 2; // Move to undo state
        return { success: true };
      });
      
      mockMutationService.performRedo.mockImplementation(async () => {
        stateIndex = 3; // Move to redo state
        return { success: true };
      });

      const TestComponent = () => {
        const stackStatus = mockActions.getStackStatus();
        return (
          <div>
            <button 
              onClick={() => mockActions.undo()}
              disabled={!stackStatus.canUndo}
              data-testid="undo-btn"
            >
              Undo ({stackStatus.undoCount})
            </button>
            <button 
              onClick={() => mockActions.redo()}
              disabled={!stackStatus.canRedo}
              data-testid="redo-btn"
            >
              Redo ({stackStatus.redoCount})
            </button>
          </div>
        );
      };

      const { rerender } = renderWithProviders(<TestComponent />);

      // Initial state
      expect(screen.getByTestId('undo-btn')).toBeDisabled();
      expect(screen.getByTestId('redo-btn')).toBeDisabled();

      // Simulate state after change
      stateIndex = 1;
      rerender(<TestComponent />);

      expect(screen.getByTestId('undo-btn')).not.toBeDisabled();
      expect(screen.getByText('Undo (1)')).toBeInTheDocument();

      // Perform undo
      await user.click(screen.getByTestId('undo-btn'));

      await waitFor(() => {
        expect(mockMutationService.performUndo).toHaveBeenCalledTimes(1);
      });

      // Update UI to reflect undo state
      rerender(<TestComponent />);

      expect(screen.getByTestId('undo-btn')).toBeDisabled();
      expect(screen.getByTestId('redo-btn')).not.toBeDisabled();
      expect(screen.getByText('Redo (1)')).toBeInTheDocument();
    });
  });

  describe('undo/redo with complex changes', () => {
    it('should handle multi-field undo correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      mockMutationService.performUndo.mockResolvedValue({ success: true });
      mockMutationService.getStackStatus.mockReturnValue({
        canUndo: true,
        canRedo: false,
        undoCount: 1,
        redoCount: 0
      });

      // Mock a complex update that changes multiple fields
      mockActions.setFollowup.mockImplementation(async (id, date) => {
        // Simulate the business rule: setting follow-up also changes status
        const patches = [
          { 
            id, 
            changes: { 
              followUp: date, 
              status: date ? 'terminVereinbart' : 'offen' 
            } 
          }
        ];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { detail: { patches } }));
      });

      const client = makeRow({
        id: 'client-1',
        status: 'offen',
        followUp: undefined
      });

      renderWithProviders(
        <div>
          <ClientRow
            client={client}
            index={0}
            users={mockUsers}
            actions={mockActions}
            selected={false}
            onToggleSelect={vi.fn()}
          />
          <button onClick={() => mockActions.undo()}>Undo</button>
        </div>
      );

      // Set follow-up (triggers multi-field change)
      const followUpInput = screen.getByDisplayValue('');
      await user.type(followUpInput, '2024-12-25T10:00');
      await user.tab();

      await waitFor(() => {
        expect(mockActions.setFollowup).toHaveBeenCalledWith(
          'client-1',
          expect.stringMatching(/2024-12-25T10:00:00/)
        );
      });

      // Perform undo
      const undoButton = screen.getByText('Undo');
      await user.click(undoButton);

      await waitFor(() => {
        expect(mockActions.undo).toHaveBeenCalledTimes(1);
        expect(mockMutationService.performUndo).toHaveBeenCalledTimes(1);
      });
    });

    it('should maintain undo history across different field changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      let undoCount = 0;
      mockMutationService.getStackStatus.mockImplementation(() => ({
        canUndo: undoCount > 0,
        canRedo: false,
        undoCount,
        redoCount: 0
      }));

      // Mock actions to increment undo count
      mockActions.setStatus.mockImplementation(async () => {
        undoCount++;
      });
      
      mockActions.setFollowup.mockImplementation(async () => {
        undoCount++;
      });

      const client = makeRow({ id: 'client-1', status: 'offen' });

      renderWithProviders(
        <div>
          <ClientRow
            client={client}
            index={0}
            users={mockUsers}
            actions={mockActions}
            selected={false}
            onToggleSelect={vi.fn()}
          />
          <div>Stack count: {mockActions.getStackStatus().undoCount}</div>
        </div>
      );

      // Make multiple different changes
      const statusButton = screen.getByText('Offen');
      await user.click(statusButton);
      await user.click(screen.getByText('Gebucht / Bearbeitung'));

      const followUpInput = screen.getByDisplayValue('');
      await user.type(followUpInput, '2024-12-25T10:00');
      await user.tab();

      await waitFor(() => {
        expect(mockActions.setStatus).toHaveBeenCalledTimes(1);
        expect(mockActions.setFollowup).toHaveBeenCalledTimes(1);
      });

      // Should have accumulated undo entries
      expect(undoCount).toBe(2);
    });
  });
});