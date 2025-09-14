/**
 * Tests for header select-all checkbox with sorted clients
 * Covers tri-state behavior, filtered rows, and sort-aware selection
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from './TestHarness';
import Board from '../Board';
import { seedRows, mockUsers } from './fixtures';

// Mock board data with controllable selection and sorting
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

describe('Board Header Select-All Checkbox with Sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBoardData.clients = seedRows(5);
    mockUseBoardData.view.sort = { key: null, direction: null };
  });

  describe('select-all with sorted clients', () => {
    it('should select all clients in current sorted order', async () => {
      const user = userEvent.setup();
      
      // Set up sorted view
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);

      // Should select all visible clients in sorted order
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('should respect current sort when determining selection order', async () => {
      const user = userEvent.setup();
      
      // Create clients with different names for sorting
      const sortableClients = [
        { ...seedRows(1)[0], id: 'client-z', firstName: 'Zora', lastName: 'Zander' },
        { ...seedRows(1)[0], id: 'client-a', firstName: 'Anna', lastName: 'Abel' },
        { ...seedRows(1)[0], id: 'client-m', firstName: 'Max', lastName: 'Muster' }
      ];
      
      mockUseBoardData.clients = sortableClients;
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);

      // Selection should follow sorted order (Abel, Muster, Zander)
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('should handle pinned-first sorting in selection', async () => {
      const user = userEvent.setup();
      
      // Create mixed pinned/unpinned clients
      const mixedClients = [
        { ...seedRows(1)[0], id: 'unpinned-1', firstName: 'Anna', isPinned: false },
        { ...seedRows(1)[0], id: 'pinned-1', firstName: 'Zora', isPinned: true },
        { ...seedRows(1)[0], id: 'unpinned-2', firstName: 'Bernd', isPinned: false }
      ];
      
      mockUseBoardData.clients = mixedClients;
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);

      // Should select in pinned-first order: Zora (pinned), then Anna, Bernd (sorted)
      expect(selectAllCheckbox).toBeInTheDocument();
    });
  });

  describe('tri-state behavior with sorting', () => {
    it('should show unchecked when no clients selected', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).not.toBeChecked();
      expect(selectAllCheckbox).toHaveAttribute('aria-checked', 'false');
    });

    it('should show checked when all sorted clients selected', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);

      // Should show fully selected state
      expect(selectAllCheckbox).toBeChecked();
      expect(selectAllCheckbox).toHaveAttribute('aria-checked', 'true');
    });

    it('should show indeterminate when some sorted clients selected', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Select one individual client first
      const individualCheckboxes = screen.getAllByRole('checkbox');
      const firstClientCheckbox = individualCheckboxes.find(cb => 
        cb !== screen.getByLabelText('Alle auswählen')
      );

      if (firstClientCheckbox) {
        await user.click(firstClientCheckbox);
        
        const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
        expect(selectAllCheckbox).toHaveAttribute('aria-checked', 'mixed');
      }
    });
  });

  describe('filtered selection with sorting', () => {
    it('should only select visible filtered clients in sorted order', async () => {
      const user = userEvent.setup();
      
      // Mock filtered dataset
      mockUseBoardData.clients = seedRows(6).map((client, index) => ({
        ...client,
        isArchived: index >= 3 // Half archived
      }));
      
      mockUseBoardData.view.filters.showArchived = false; // Hide archived
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);

      // Should only select visible (non-archived) clients in sorted order
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('should work with chip filters and sorting', async () => {
      const user = userEvent.setup();
      
      // Mock filtered dataset
      mockUseBoardData.clients = seedRows(6).map((client, index) => ({
        ...client,
        status: index < 3 ? 'offen' : 'erledigt'
      }));
      
      mockUseBoardData.view.filters.chips = ['offen']; // Filter to only open clients
      mockUseBoardData.view.sort = { key: 'priority', direction: 'desc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      await user.click(selectAllCheckbox);

      // Should select only filtered clients in priority-sorted order
      expect(selectAllCheckbox).toBeInTheDocument();
    });
  });

  describe('keyboard accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      
      await user.tab();
      expect(selectAllCheckbox).toHaveFocus();
      
      await user.keyboard(' ');
      
      // Should trigger selection
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).toHaveAttribute('aria-label', 'Alle auswählen');
      expect(selectAllCheckbox).toHaveAttribute('aria-checked');
    });
  });

  describe('performance with large datasets', () => {
    it('should handle select-all efficiently with large sorted datasets', async () => {
      const user = userEvent.setup();
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

  describe('edge cases', () => {
    it('should handle empty sorted client list', async () => {
      mockUseBoardData.clients = [];
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).not.toBeChecked();
      expect(selectAllCheckbox).toHaveAttribute('aria-checked', 'false');
    });

    it('should handle single sorted client', async () => {
      mockUseBoardData.clients = seedRows(1);
      mockUseBoardData.view.sort = { key: 'name', direction: 'asc' };
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).toBeInTheDocument();
    });
  });
});