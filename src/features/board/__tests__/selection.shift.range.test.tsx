/**
 * Tests for shift-range selection with sorted clients
 * Ensures range selection follows current sort order
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from './TestHarness';
import Board from '../Board';
import { seedRows, mockUsers } from './fixtures';

// Mock board data with controllable sorting
const mockUseBoardData = {
  clients: seedRows(5),
  users: mockUsers,
  isLoading: false,
  view: {
    filters: { chips: [], showArchived: false },
    sort: { key: null, direction: null },
    columnVisibility: {}
  }
};

vi.mock('../useBoardData', () => ({
  useBoardData: () => mockUseBoardData
}));

describe('Selection Shift-Range with Sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('range selection follows sort order', () => {
    it('should select range in alphabetical order when sorted by name', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Create clients with specific names for predictable sorting
      const namedClients = [
        { ...seedRows(1)[0], id: 'client-z', firstName: 'Zora', lastName: 'Zander' },
        { ...seedRows(1)[0], id: 'client-a', firstName: 'Anna', lastName: 'Abel' },
        { ...seedRows(1)[0], id: 'client-m', firstName: 'Max', lastName: 'Muster' },
        { ...seedRows(1)[0], id: 'client-b', firstName: 'Bernd', lastName: 'Bauer' }
      ];
      
      mockUseBoardData.clients = namedClients;
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox').filter(cb => 
        cb !== screen.getByLabelText('Alle auswählen')
      );

      // First click on "Anna" (should be first in sorted order)
      await user.click(checkboxes[0]);

      // Shift+click on "Max" (should be third in sorted order)
      await user.keyboard('{Shift>}');
      await user.click(checkboxes[2]);
      await user.keyboard('{/Shift}');

      // Should select range: Anna, Bauer, Max (in alphabetical order)
      expect(checkboxes[0]).toBeChecked(); // Anna
      expect(checkboxes[1]).toBeChecked(); // Bernd
      expect(checkboxes[2]).toBeChecked(); // Max
      expect(checkboxes[3]).not.toBeChecked(); // Zora (outside range)
    });

    it('should select range in priority order when sorted by priority', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Create clients with different priorities
      const priorityClients = [
        { ...seedRows(1)[0], id: 'client-1', priority: 'niedrig' },
        { ...seedRows(1)[0], id: 'client-2', priority: 'dringend' },
        { ...seedRows(1)[0], id: 'client-3', priority: 'normal' },
        { ...seedRows(1)[0], id: 'client-4', priority: 'hoch' }
      ];
      
      mockUseBoardData.clients = priorityClients;
      mockUseBoardData.view.sort = { key: 'priority', direction: 'desc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox').filter(cb => 
        cb !== screen.getByLabelText('Alle auswählen')
      );

      // First click on highest priority (should be first in desc sort)
      await user.click(checkboxes[0]);

      // Shift+click on second item
      await user.keyboard('{Shift>}');
      await user.click(checkboxes[1]);
      await user.keyboard('{/Shift}');

      // Should select range in priority-sorted order
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });

    it('should handle reverse range selection in sorted order', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox').filter(cb => 
        cb !== screen.getByLabelText('Alle auswählen')
      );

      // First click on later item (index 3)
      await user.click(checkboxes[3]);

      // Shift+click on earlier item (index 1)
      await user.keyboard('{Shift>}');
      await user.click(checkboxes[1]);
      await user.keyboard('{/Shift}');

      // Should select range from index 1 to 3 (inclusive)
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();
      expect(checkboxes[3]).toBeChecked();
      expect(checkboxes[0]).not.toBeChecked(); // Outside range
      expect(checkboxes[4]).not.toBeChecked(); // Outside range
    });
  });

  describe('pinned-first sorting with selection', () => {
    it('should respect pinned-first order in range selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Create clients with mixed pin states
      const mixedClients = [
        { ...seedRows(1)[0], id: 'unpinned-a', firstName: 'Anna', isPinned: false },
        { ...seedRows(1)[0], id: 'pinned-z', firstName: 'Zora', isPinned: true },
        { ...seedRows(1)[0], id: 'pinned-b', firstName: 'Bernd', isPinned: true },
        { ...seedRows(1)[0], id: 'unpinned-m', firstName: 'Max', isPinned: false }
      ];
      
      mockUseBoardData.clients = mixedClients;
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox').filter(cb => 
        cb !== screen.getByLabelText('Alle auswählen')
      );

      // Range selection should follow pinned-first order:
      // 1. Bernd (pinned), 2. Zora (pinned), 3. Anna (unpinned), 4. Max (unpinned)
      
      // Click on first pinned (Bernd)
      await user.click(checkboxes[0]);

      // Shift+click on first unpinned (Anna)
      await user.keyboard('{Shift>}');
      await user.click(checkboxes[2]);
      await user.keyboard('{/Shift}');

      // Should select: Bernd, Zora, Anna (range from pinned through first unpinned)
      expect(checkboxes[0]).toBeChecked(); // Bernd (pinned)
      expect(checkboxes[1]).toBeChecked(); // Zora (pinned)
      expect(checkboxes[2]).toBeChecked(); // Anna (unpinned)
      expect(checkboxes[3]).not.toBeChecked(); // Max (outside range)
    });
  });

  describe('sort change preserves selection', () => {
    it('should maintain selection when sort order changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Start with name sort
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      const { rerender } = renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Select some clients
      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);

      // Change sort to priority
      mockUseBoardData.view.sort = { key: 'priority', direction: 'desc' };
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Selection should be preserved despite sort change
      const updatedSelectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(updatedSelectAllCheckbox).toBeChecked();
    });
  });

  describe('performance with large sorted datasets', () => {
    it('should handle select-all efficiently with large sorted datasets', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockUseBoardData.clients = seedRows(100);
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      const start = performance.now();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);
      
      const duration = performance.now() - start;
      
      // Should complete quickly even with large sorted dataset
      expect(duration).toBeLessThan(1000);
    });
  });
});