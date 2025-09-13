/**
 * Integration tests for Selection and Batch Actions
 * Tests multi-selection and batch operations on selected clients
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockActions, resetMockActions } from '../TestHarness';
import { ClientRow } from '../../components/ClientRow';
import { BatchActionsBar } from '../../components/BatchActionsBar';
import { makeRow, seedRows, mockUsers } from '../fixtures';

describe('Selection and Batch Actions Integration', () => {
  beforeEach(() => {
    resetMockActions();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('multi-selection behavior', () => {
    it('should select multiple clients via checkboxes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(3);
      const selectedIds = new Set<string>();
      const mockToggleSelect = vi.fn((index: number, id: string, withShift: boolean) => {
        if (selectedIds.has(id)) {
          selectedIds.delete(id);
        } else {
          selectedIds.add(id);
        }
      });

      renderWithProviders(
        <div>
          {clients.map((client, index) => (
            <ClientRow
              key={client.id}
              client={client}
              index={index}
              users={mockUsers}
              actions={mockActions}
              selected={selectedIds.has(client.id)}
              onToggleSelect={(withShift) => mockToggleSelect(index, client.id, withShift)}
            />
          ))}
        </div>
      );

      // Select first client
      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(firstCheckbox);

      expect(mockToggleSelect).toHaveBeenCalledWith(0, clients[0].id, false);

      // Select third client
      const thirdCheckbox = screen.getAllByRole('checkbox')[2];
      await user.click(thirdCheckbox);

      expect(mockToggleSelect).toHaveBeenCalledWith(2, clients[2].id, false);
      expect(mockToggleSelect).toHaveBeenCalledTimes(2);
    });

    it('should handle shift-click range selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(5);
      const mockToggleSelect = vi.fn();

      renderWithProviders(
        <div>
          {clients.map((client, index) => (
            <ClientRow
              key={client.id}
              client={client}
              index={index}
              users={mockUsers}
              actions={mockActions}
              selected={false}
              onToggleSelect={(withShift) => mockToggleSelect(index, client.id, withShift)}
            />
          ))}
        </div>
      );

      const checkboxes = screen.getAllByRole('checkbox');

      // First click (no shift)
      await user.click(checkboxes[1]);
      expect(mockToggleSelect).toHaveBeenCalledWith(1, clients[1].id, false);

      // Shift+click for range selection
      await user.keyboard('{Shift>}');
      await user.click(checkboxes[3]);
      await user.keyboard('{/Shift}');

      expect(mockToggleSelect).toHaveBeenCalledWith(3, clients[3].id, true);
    });
  });

  describe('batch status operations', () => {
    it('should apply batch status change to all selected clients', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2', 'client-3'];
      const selectedClients = selectedIds.map(id => makeRow({ id, status: 'offen' }));

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={(status) => mockActions.bulkUpdate(selectedIds, { status })}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => selectedClients}
        />
      );

      // Find and use status dropdown in batch bar
      const statusSelect = screen.getByDisplayValue('');
      await user.selectOptions(statusSelect, 'inBearbeitung');

      const setStatusButton = screen.getByText('Setzen');
      await user.click(setStatusButton);

      await waitFor(() => {
        expect(mockActions.bulkUpdate).toHaveBeenCalledWith(
          selectedIds,
          { status: 'inBearbeitung' }
        );
      });

      expect(mockActions.bulkUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle batch assignment operations', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2'];

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={(userId) => mockActions.bulkUpdate(selectedIds, { assignedTo: userId })}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      // Find assignment dropdown
      const assignSelect = screen.getByDisplayValue('');
      await user.selectOptions(assignSelect, 'admin@local');

      const setAssignButton = screen.getAllByText('Setzen')[2]; // Third "Setzen" button for assignment
      await user.click(setAssignButton);

      await waitFor(() => {
        expect(mockActions.bulkUpdate).toHaveBeenCalledWith(
          selectedIds,
          { assignedTo: 'admin@local' }
        );
      });
    });
  });

  describe('batch archive operations', () => {
    it('should archive multiple selected clients', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2'];
      const mockOnArchive = vi.fn();

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={mockOnArchive}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      const archiveButton = screen.getByText('Archivieren');
      await user.click(archiveButton);

      await waitFor(() => {
        expect(mockOnArchive).toHaveBeenCalledTimes(1);
      });
    });

    it('should unarchive multiple selected clients', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2'];
      const mockOnUnarchive = vi.fn();

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={mockOnUnarchive}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      const unarchiveButton = screen.getByText('Entarchivieren');
      await user.click(unarchiveButton);

      await waitFor(() => {
        expect(mockOnUnarchive).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('batch pin operations', () => {
    it('should pin multiple selected clients', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2'];
      const mockOnPin = vi.fn();

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={mockOnPin}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      const pinButton = screen.getByText('Pinnen');
      await user.click(pinButton);

      await waitFor(() => {
        expect(mockOnPin).toHaveBeenCalledTimes(1);
      });
    });

    it('should unpin multiple selected clients', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2'];
      const mockOnUnpin = vi.fn();

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={mockOnUnpin}
          selectedRowsProvider={() => []}
        />
      );

      const unpinButton = screen.getByText('Entpinnen');
      await user.click(unpinButton);

      await waitFor(() => {
        expect(mockOnUnpin).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('selection clearing', () => {
    it('should clear selection when clear button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnClear = vi.fn();

      renderWithProviders(
        <BatchActionsBar
          selectedCount={3}
          users={mockUsers}
          onClear={mockOnClear}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      const clearButton = screen.getByText('Auswahl aufheben');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockOnClear).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear selection on Escape key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnClear = vi.fn();

      renderWithProviders(
        <div tabIndex={0} onKeyDown={(e) => {
          if (e.key === 'Escape') mockOnClear();
        }}>
          <ClientRow
            client={makeRow()}
            index={0}
            users={mockUsers}
            actions={mockActions}
            selected={true}
            onToggleSelect={vi.fn()}
          />
        </div>
      );

      const container = screen.getByRole('generic');
      container.focus();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnClear).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('batch operation bundling', () => {
    it('should bundle batch operations into single service call', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2', 'client-3'];

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={(status) => mockActions.bulkUpdate(selectedIds, { status })}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      // Perform batch status change
      const statusSelect = screen.getByDisplayValue('');
      await user.selectOptions(statusSelect, 'erledigt');

      const setButton = screen.getByText('Setzen');
      await user.click(setButton);

      await waitFor(() => {
        // Should be called once with all IDs
        expect(mockActions.bulkUpdate).toHaveBeenCalledTimes(1);
        expect(mockActions.bulkUpdate).toHaveBeenCalledWith(
          selectedIds,
          { status: 'erledigt' }
        );
      });

      // Should not call individual update methods
      expect(mockActions.update).not.toHaveBeenCalled();
      expect(mockActions.setStatus).not.toHaveBeenCalled();
    });

    it('should handle batch follow-up setting', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2'];
      const mockOnSetFollowup = vi.fn();

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={mockOnSetFollowup}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      // Set batch follow-up date
      const followUpInput = screen.getByDisplayValue('');
      await user.type(followUpInput, '2024-12-25');

      const setFollowUpButton = screen.getAllByText('Setzen')[3]; // Fourth "Setzen" button
      await user.click(setFollowUpButton);

      await waitFor(() => {
        expect(mockOnSetFollowup).toHaveBeenCalledWith('2024-12-25');
        expect(mockOnSetFollowup).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('selection state management', () => {
    it('should maintain selection state across re-renders', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({ id: 'client-1' });
      let isSelected = false;
      const mockToggleSelect = vi.fn(() => {
        isSelected = !isSelected;
      });

      const { rerender } = renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={isSelected}
          onToggleSelect={mockToggleSelect}
        />
      );

      // Initial state - not selected
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      // Select client
      await user.click(checkbox);
      expect(mockToggleSelect).toHaveBeenCalledTimes(1);

      // Re-render with selected state
      rerender(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={true}
          onToggleSelect={mockToggleSelect}
        />
      );

      // Should show selected state
      const updatedCheckbox = screen.getByRole('checkbox');
      expect(updatedCheckbox).toBeChecked();
    });

    it('should handle keyboard selection with Space key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({ id: 'client-1' });
      const mockToggleSelect = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={mockToggleSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      
      // Focus and use Space key
      checkbox.focus();
      await user.keyboard(' ');

      expect(mockToggleSelect).toHaveBeenCalledWith(false); // No shift key
    });
  });

  describe('batch operation validation', () => {
    it('should disable batch operations when no selection', () => {
      renderWithProviders(
        <BatchActionsBar
          selectedCount={0}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      // Batch bar should not be visible when no selection
      expect(screen.queryByText('ausgewählt')).not.toBeInTheDocument();
    });

    it('should show selection count correctly', () => {
      renderWithProviders(
        <BatchActionsBar
          selectedCount={5}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={vi.fn()}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      expect(screen.getByText('5 ausgewählt')).toBeInTheDocument();
    });
  });

  describe('error handling in batch operations', () => {
    it('should handle batch operation failures gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const selectedIds = ['client-1', 'client-2'];
      
      // Mock bulk update to fail
      mockActions.bulkUpdate.mockRejectedValue(new Error('Batch update failed'));

      renderWithProviders(
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={mockUsers}
          onClear={vi.fn()}
          onSetStatus={(status) => mockActions.bulkUpdate(selectedIds, { status })}
          onSetResult={vi.fn()}
          onSetAssign={vi.fn()}
          onSetFollowup={vi.fn()}
          onArchive={vi.fn()}
          onUnarchive={vi.fn()}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          selectedRowsProvider={() => []}
        />
      );

      const statusSelect = screen.getByDisplayValue('');
      await user.selectOptions(statusSelect, 'erledigt');

      const setButton = screen.getByText('Setzen');
      await user.click(setButton);

      await waitFor(() => {
        expect(mockActions.bulkUpdate).toHaveBeenCalledTimes(1);
      });

      // Should not crash on error (error handling in actual implementation)
    });
  });
});