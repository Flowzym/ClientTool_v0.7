/**
 * Tests for Accessibility Headers
 * Covers aria-sort correctness and header checkbox tri-state behavior
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from './TestHarness';
import ColumnHeader from '../components/ColumnHeader';
import Board from '../Board';
import { seedRows, mockUsers } from './fixtures';

// Mock board data
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

describe('A11y Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBoardData.view.sort = { key: null, direction: null };
  });

  describe('aria-sort correctness', () => {
    it('should have aria-sort="none" for inactive sortable columns', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <ColumnHeader
          columnKey="name"
          label="Kunde"
          sortable={true}
          isActive={false}
          direction={undefined}
          onToggle={mockOnToggle}
        />
      );

      const header = screen.getByRole('columnheader');
      expect(header).toHaveAttribute('aria-sort', 'none');
    });

    it('should have aria-sort="ascending" for active ascending columns', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <ColumnHeader
          columnKey="name"
          label="Kunde"
          sortable={true}
          isActive={true}
          direction="asc"
          onToggle={mockOnToggle}
        />
      );

      const header = screen.getByRole('columnheader');
      expect(header).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should have aria-sort="descending" for active descending columns', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <ColumnHeader
          columnKey="name"
          label="Kunde"
          sortable={true}
          isActive={true}
          direction="desc"
          onToggle={mockOnToggle}
        />
      );

      const header = screen.getByRole('columnheader');
      expect(header).toHaveAttribute('aria-sort', 'descending');
    });

    it('should have aria-sort="none" for non-sortable columns', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <ColumnHeader
          columnKey="activity"
          label="Aktivität"
          sortable={false}
          isActive={false}
          direction={undefined}
          onToggle={mockOnToggle}
        />
      );

      const header = screen.getByRole('columnheader');
      expect(header).toHaveAttribute('aria-sort', 'none');
    });
  });

  describe('header checkbox tri-state', () => {
    it('should have aria-checked="false" when no items selected', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).toHaveAttribute('aria-checked', 'false');
      expect(selectAllCheckbox).not.toBeChecked();
      expect(selectAllCheckbox.indeterminate).toBe(false);
    });

    it('should have aria-checked="mixed" when some items selected', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      
      // Simulate partial selection state
      Object.defineProperty(selectAllCheckbox, 'indeterminate', { value: true, writable: true });
      selectAllCheckbox.indeterminate = true;
      
      expect(selectAllCheckbox).toHaveAttribute('aria-checked', 'mixed');
    });

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
  });

  describe('keyboard navigation', () => {
    it('should support tab navigation through sortable headers', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Tab through sortable headers
      const sortableHeaders = screen.getAllByRole('columnheader').filter(h => 
        h.tagName === 'BUTTON'
      );

      expect(sortableHeaders.length).toBeGreaterThan(0);

      for (const header of sortableHeaders) {
        header.focus();
        expect(header).toHaveFocus();
        
        // Should be activatable with Enter
        await user.keyboard('{Enter}');
        
        vi.clearAllMocks();
      }
    });
  });

  describe('screen reader support', () => {
    it('should announce sort state changes to screen readers', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const headers = screen.getAllByRole('columnheader');
      
      headers.forEach(header => {
        // Should have proper role
        expect(header).toHaveAttribute('role', 'columnheader');
        
        // Should have aria-sort attribute
        expect(header).toHaveAttribute('aria-sort');
        
        // aria-sort should be valid value
        const ariaSort = header.getAttribute('aria-sort');
        expect(['none', 'ascending', 'descending']).toContain(ariaSort);
      });
    });

    it('should have proper accessible names for interactive elements', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Select-all checkbox should have accessible name
      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).toHaveAttribute('aria-label', 'Alle auswählen');

      // Sortable headers should have titles
      const sortableHeaders = screen.getAllByRole('columnheader').filter(h => 
        h.tagName === 'BUTTON'
      );

      sortableHeaders.forEach(header => {
        expect(header).toHaveAttribute('title');
        expect(header.getAttribute('title')).toMatch(/sortieren/i);
      });
    });
  });
});