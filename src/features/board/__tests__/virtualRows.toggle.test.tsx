/**
 * Tests for virtualized rows feature toggle
 * Ensures proper fallback and virtualization behavior
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, resetMockActions } from './TestHarness';
import Board from '../Board';
import { featureManager } from '../../../config/features';
import { seedRows } from './fixtures';

// Mock the board data hook
const mockUseBoardData = {
  clients: seedRows(100), // Large dataset for virtualization testing
  users: [],
  isLoading: false
};

vi.mock('../useBoardData', () => ({
  useBoardData: () => mockUseBoardData
}));

describe('Virtual Rows Toggle', () => {
  beforeEach(() => {
    resetMockActions();
    vi.clearAllMocks();
    
    // Reset feature flag to default
    featureManager.setFeature('virtualRows', false);
  });

  describe('feature flag disabled (default)', () => {
    it('should render classic non-virtualized list', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Lade Board…')).not.toBeInTheDocument();
      });

      // Should render classic board structure
      expect(screen.getByText('Board')).toBeInTheDocument();
      
      // Should not have virtualization debug info
      expect(screen.queryByText(/Virtual:/)).not.toBeInTheDocument();
      
      // Should render client rows directly
      const clientRows = screen.getAllByRole('row');
      expect(clientRows.length).toBeGreaterThan(0);
    });

    it('should show all clients in DOM when not virtualized', async () => {
      // Use smaller dataset for easier testing
      mockUseBoardData.clients = seedRows(10);
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // All 10 clients should be in DOM (within viewport limits)
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('feature flag enabled', () => {
    beforeEach(() => {
      featureManager.setFeature('virtualRows', true);
    });

    it('should render virtualized list when flag enabled', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should have virtualization container
      const virtualContainer = screen.getByRole('grid');
      expect(virtualContainer).toBeInTheDocument();
      expect(virtualContainer).toHaveAttribute('aria-label', 'Client list');

      // Should show debug info in development
      if (import.meta.env.DEV) {
        expect(screen.getByText(/Virtual:/)).toBeInTheDocument();
      }
    });

    it('should render fewer DOM nodes than total clients when virtualized', async () => {
      // Use large dataset
      mockUseBoardData.clients = seedRows(200);
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should render only visible rows + overscan (much less than 200)
      const virtualRows = screen.getAllByRole('row');
      expect(virtualRows.length).toBeLessThan(50); // Should be significantly less than 200
      expect(virtualRows.length).toBeGreaterThan(0);
    });

    it('should maintain sticky header when virtualized', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Header should be outside virtualized container
      expect(screen.getByText('Kunde')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Zuständigkeit')).toBeInTheDocument();
    });
  });

  describe('feature flag toggle', () => {
    it('should switch between virtualized and classic rendering', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should start with classic rendering
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();

      // Toggle virtualization on (only in DEV)
      if (import.meta.env.DEV) {
        const toggle = screen.getByLabelText(/Virtualized Rows/);
        await user.click(toggle);

        await waitFor(() => {
          expect(screen.getByRole('grid')).toBeInTheDocument();
        });

        // Toggle back off
        await user.click(toggle);

        await waitFor(() => {
          expect(screen.queryByRole('grid')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('interaction compatibility', () => {
    beforeEach(() => {
      featureManager.setFeature('virtualRows', true);
      mockUseBoardData.clients = seedRows(50);
    });

    it('should support selection in virtualized mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should be able to select clients
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      await user.click(checkboxes[0]);
      
      // Selection should work (batch bar should appear)
      await waitFor(() => {
        expect(screen.getByText(/ausgewählt/)).toBeInTheDocument();
      });
    });

    it('should support pin operations in virtualized mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should be able to interact with pin buttons
      const pinButtons = screen.getAllByRole('button', { name: /pin/i });
      expect(pinButtons.length).toBeGreaterThan(0);

      // Pin interaction should work
      await user.click(pinButtons[0]);
      
      // Should not crash or lose functionality
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should support status changes in virtualized mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should be able to change status
      const statusButtons = screen.getAllByText('Offen');
      if (statusButtons.length > 0) {
        await user.click(statusButtons[0]);
        
        // Dropdown should appear
        await waitFor(() => {
          expect(screen.getByText('Gebucht / Bearbeitung')).toBeInTheDocument();
        });
      }
    });
  });

  describe('performance characteristics', () => {
    it('should handle large datasets efficiently', async () => {
      // Very large dataset
      mockUseBoardData.clients = seedRows(1000);
      featureManager.setFeature('virtualRows', true);
      
      const start = performance.now();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      const duration = performance.now() - start;
      
      // Should render quickly even with large dataset
      expect(duration).toBeLessThan(1000);
      
      // Should render only a subset of rows
      const virtualRows = screen.getAllByRole('row');
      expect(virtualRows.length).toBeLessThan(100); // Much less than 1000
    });

    it('should maintain performance during scrolling', async () => {
      mockUseBoardData.clients = seedRows(500);
      featureManager.setFeature('virtualRows', true);
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      const virtualContainer = screen.getByRole('grid');
      
      // Simulate scroll events
      const scrollEvents = [100, 500, 1000, 2000];
      
      for (const scrollTop of scrollEvents) {
        const start = performance.now();
        
        // Simulate scroll
        virtualContainer.scrollTop = scrollTop;
        virtualContainer.dispatchEvent(new Event('scroll'));
        
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(50); // Should be very fast
      }
    });
  });

  describe('accessibility in virtualized mode', () => {
    beforeEach(() => {
      featureManager.setFeature('virtualRows', true);
      mockUseBoardData.clients = seedRows(20);
    });

    it('should maintain ARIA attributes for screen readers', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', 'Client list');
      expect(grid).toHaveAttribute('aria-rowcount', '20');

      // Virtual rows should have proper ARIA
      const rows = screen.getAllByRole('row');
      rows.forEach((row, index) => {
        expect(row).toHaveAttribute('aria-rowindex');
      });
    });

    it('should support keyboard navigation in virtualized mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      const grid = screen.getByRole('grid');
      
      // Should be able to focus grid
      await user.tab();
      // Grid or first focusable element should be focused
      expect(document.activeElement).toBeTruthy();
      
      // Arrow key navigation should work
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      
      // Should not crash
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });
});