/**
 * Tests for Board header rendering
 * Ensures no duplicate columns, bold headers, and select-all functionality
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from './TestHarness';
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
  },
  toggleSort: vi.fn()
};

vi.mock('../useBoardData', () => ({
  useBoardData: () => mockUseBoardData
}));

describe('Board Header Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('column header structure', () => {
    it('should not have duplicate "Offer" headers', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should have exactly one "Angebot" header
      const offerHeaders = screen.getAllByText('Angebot');
      expect(offerHeaders).toHaveLength(1);

      // Should not have any "Offer" text
      expect(screen.queryByText('Offer')).not.toBeInTheDocument();
    });

    it('should render all expected column headers', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const expectedHeaders = [
        'Kunde',
        'Angebot',
        'Status', 
        'Ergebnis',
        'Follow-up',
        'Zuständigkeit',
        'Kontakt',
        'Anmerkung',
        'Zubuchung',
        'Priorität',
        'Aktivität',
        'Aktionen'
      ];

      expectedHeaders.forEach(header => {
        expect(screen.getByText(header)).toBeInTheDocument();
      });
    });

    it('should render headers in bold font', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Check that sortable headers have font-bold class
      const kundeHeader = screen.getByText('Kunde');
      expect(kundeHeader).toHaveClass('font-bold');

      const angebotHeader = screen.getByText('Angebot');
      expect(angebotHeader).toHaveClass('font-bold');

      const statusHeader = screen.getByText('Status');
      expect(statusHeader).toHaveClass('font-bold');
    });
  });

  describe('select-all checkbox', () => {
    it('should render select-all checkbox in header', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).toBeInTheDocument();
      expect(selectAllCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('should show unchecked state when no selection', async () => {
      mockUseBoardData.clients = seedRows(3);
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      expect(selectAllCheckbox).not.toBeChecked();
    });

    it('should be accessible via keyboard', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Alle auswählen');
      
      await user.tab();
      // May need multiple tabs to reach select-all
      if (!selectAllCheckbox.matches(':focus')) {
        await user.tab();
      }
      
      expect(selectAllCheckbox).toHaveFocus();
    });
  });

  describe('sortable headers', () => {
    it('should render sortable headers as buttons', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Sortable headers should be buttons
      const kundeHeader = screen.getByRole('columnheader', { name: /kunde/i });
      expect(kundeHeader.tagName).toBe('BUTTON');

      const statusHeader = screen.getByRole('columnheader', { name: /status/i });
      expect(statusHeader.tagName).toBe('BUTTON');
    });

    it('should render non-sortable headers as divs', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Non-sortable headers should be divs
      const zubuchungHeader = screen.getByText('Zubuchung');
      expect(zubuchungHeader.tagName).toBe('DIV');

      const aktivitaetHeader = screen.getByText('Aktivität');
      expect(aktivitaetHeader.tagName).toBe('DIV');
    });

    it('should have proper ARIA attributes for sorting', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const sortableHeaders = screen.getAllByRole('columnheader');
      sortableHeaders.forEach(header => {
        if (header.tagName === 'BUTTON') {
          expect(header).toHaveAttribute('aria-sort');
          expect(['none', 'ascending', 'descending']).toContain(
            header.getAttribute('aria-sort')
          );
        }
      });
    });
  });

  describe('header layout', () => {
    it('should maintain consistent grid layout', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Header container should have grid layout
      const headerContainer = screen.getByText('Pin').closest('.grid');
      expect(headerContainer).toHaveClass('grid');
      expect(headerContainer).toHaveClass('grid-cols-[64px_minmax(240px,1fr)_120px_140px_140px_160px_160px_160px_240px_120px_100px_120px_120px]');
    });

    it('should align with client row layout', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Header and rows should use same grid template
      const headerGrid = screen.getByText('Pin').closest('.grid');
      const clientRows = screen.getAllByRole('row');
      
      if (clientRows.length > 0) {
        const firstRowGrid = clientRows[0].querySelector('.grid');
        if (firstRowGrid && headerGrid) {
          // Should have same grid column classes
          expect(headerGrid.className).toContain('grid-cols-[64px_minmax(240px,1fr)');
          expect(firstRowGrid.className).toContain('grid-cols-[64px_minmax(240px,1fr)');
        }
      }
    });
  });
});