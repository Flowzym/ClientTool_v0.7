/**
 * Tests for board header toggle stability
 * Ensures column header clicks don't crash and properly cycle sort states
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  setView: vi.fn()
};

vi.mock('../useBoardData', () => ({
  useBoardData: () => mockUseBoardData
}));

describe('Board Header Toggle No-Crash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBoardData.view.sort = { key: null, direction: null };
  });

  describe('sortable column header clicks', () => {
    it('should not crash when clicking Status header', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const statusHeader = screen.getByRole('columnheader', { name: /status/i });
      expect(statusHeader).toBeInTheDocument();
      expect(statusHeader).toHaveAttribute('aria-sort', 'none');

      // Should not crash when clicked
      await expect(user.click(statusHeader)).resolves.not.toThrow();
      
      // Should call setView with proper sort state
      expect(mockUseBoardData.setView).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not crash when clicking Name header', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const nameHeader = screen.getByRole('columnheader', { name: /kunde/i });
      expect(nameHeader).toBeInTheDocument();
      expect(nameHeader).toHaveAttribute('aria-sort', 'none');

      await expect(user.click(nameHeader)).resolves.not.toThrow();
      expect(mockUseBoardData.setView).toHaveBeenCalled();
    });

    it('should not crash when clicking Angebot header', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const angebotHeader = screen.getByRole('columnheader', { name: /angebot/i });
      expect(angebotHeader).toBeInTheDocument();

      await expect(user.click(angebotHeader)).resolves.not.toThrow();
      expect(mockUseBoardData.setView).toHaveBeenCalled();
    });

    it('should not crash when clicking Follow-up header', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const followUpHeader = screen.getByRole('columnheader', { name: /follow-up/i });
      expect(followUpHeader).toBeInTheDocument();

      await expect(user.click(followUpHeader)).resolves.not.toThrow();
      expect(mockUseBoardData.setView).toHaveBeenCalled();
    });
  });

  describe('aria-sort state transitions', () => {
    it('should cycle aria-sort states correctly for Status column', async () => {
      const user = userEvent.setup();
      
      // Mock setView to actually update the view state
      mockUseBoardData.setView.mockImplementation((updater) => {
        const newView = updater(mockUseBoardData.view);
        mockUseBoardData.view = newView;
      });
      
      const { rerender } = renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const statusHeader = screen.getByRole('columnheader', { name: /status/i });

      // Initial state: none
      expect(statusHeader).toHaveAttribute('aria-sort', 'none');

      // First click: none → asc
      await user.click(statusHeader);
      rerender(<Board />);
      
      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'ascending');
      });

      // Second click: asc → desc
      await user.click(statusHeader);
      rerender(<Board />);
      
      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'descending');
      });

      // Third click: desc → none
      await user.click(statusHeader);
      rerender(<Board />);
      
      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'none');
      });
    });

    it('should switch between different columns correctly', async () => {
      const user = userEvent.setup();
      
      mockUseBoardData.setView.mockImplementation((updater) => {
        const newView = updater(mockUseBoardData.view);
        mockUseBoardData.view = newView;
      });
      
      const { rerender } = renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const statusHeader = screen.getByRole('columnheader', { name: /status/i });
      const nameHeader = screen.getByRole('columnheader', { name: /kunde/i });

      // Click Status first
      await user.click(statusHeader);
      rerender(<Board />);
      
      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'ascending');
        expect(nameHeader).toHaveAttribute('aria-sort', 'none');
      });

      // Click Name (should reset Status and set Name to asc)
      await user.click(nameHeader);
      rerender(<Board />);
      
      await waitFor(() => {
        expect(statusHeader).toHaveAttribute('aria-sort', 'none');
        expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      });
    });
  });

  describe('error resilience', () => {
    it('should handle rapid clicks without crashing', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const headers = [
        screen.getByRole('columnheader', { name: /kunde/i }),
        screen.getByRole('columnheader', { name: /status/i }),
        screen.getByRole('columnheader', { name: /angebot/i })
      ];

      // Rapid clicks on different headers
      for (const header of headers) {
        await user.click(header);
        await user.click(header);
        await user.click(header);
      }

      // Should not crash
      expect(screen.getByText('Board')).toBeInTheDocument();
      expect(mockUseBoardData.setView).toHaveBeenCalled();
    });

    it('should handle missing setView gracefully', async () => {
      const user = userEvent.setup();
      
      // Temporarily remove setView to test error handling
      const originalSetView = mockUseBoardData.setView;
      mockUseBoardData.setView = undefined as any;
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const statusHeader = screen.getByRole('columnheader', { name: /status/i });
      
      // Should not crash even with missing setView
      await expect(user.click(statusHeader)).resolves.not.toThrow();
      
      // Restore for other tests
      mockUseBoardData.setView = originalSetView;
    });
  });
});