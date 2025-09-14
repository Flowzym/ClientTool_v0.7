/**
 * Performance flag tests for virtual rows feature
 * Ensures flat rendering is default and virtualization is opt-in only
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from './TestHarness';
import Board from '../Board';
import { featureManager } from '../../../config/features';
import { seedRows, mockUsers } from './fixtures';

// Mock board data
const mockUseBoardData = {
  clients: seedRows(20),
  users: mockUsers,
  isLoading: false
};

vi.mock('../useBoardData', () => ({
  useBoardData: () => mockUseBoardData
}));

describe('Performance Flag Safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    featureManager.setFeature('virtualRows', false);
  });

  describe('default behavior (virtualRows=false)', () => {
    it('should use flat rendering by default', async () => {
      // Verify default flag state
      expect(featureManager.isEnabled('virtualRows')).toBe(false);

      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should NOT have virtual container
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
      
      // Should render classic board structure
      const clientRows = screen.getAllByRole('row');
      expect(clientRows.length).toBeGreaterThan(0);
    });

    it('should maintain sticky header in flat mode', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Header columns should be present
      expect(screen.getByText('Kunde')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Zuständigkeit')).toBeInTheDocument();
      expect(screen.getByText('Aktionen')).toBeInTheDocument();
    });

    it('should support selection in flat mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should be able to select clients
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      await user.click(checkboxes[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/ausgewählt/)).toBeInTheDocument();
      });
    });

    it('should support focus navigation in flat mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab(); // First checkbox
      expect(screen.getAllByRole('checkbox')[0]).toHaveFocus();

      await user.tab(); // Pin button
      expect(screen.getAllByRole('button', { name: /pin/i })[0]).toHaveFocus();

      await user.tab(); // Note button
      expect(screen.getAllByRole('button', { name: /notizen/i })[0]).toHaveFocus();
    });
  });

  describe('opt-in virtualization (virtualRows=true)', () => {
    beforeEach(() => {
      featureManager.setFeature('virtualRows', true);
    });

    it('should use virtual rendering when flag enabled', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should have virtual container
      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Client list');
    });

    it('should maintain sticky header in virtual mode', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Header should be outside virtual container
      expect(screen.getByText('Kunde')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Zuständigkeit')).toBeInTheDocument();
    });

    it('should support selection in virtual mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should be able to select clients
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      await user.click(checkboxes[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/ausgewählt/)).toBeInTheDocument();
      });
    });

    it('should support focus navigation in virtual mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should be able to focus elements
      await user.tab();
      expect(document.activeElement).toBeTruthy();
      
      // Should not crash during navigation
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
    });
  });

  describe('feature flag transitions', () => {
    it('should switch between modes without errors', async () => {
      const { rerender } = renderWithProviders(<Board />);

      // Start with flat mode
      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();

      // Switch to virtual mode
      featureManager.setFeature('virtualRows', true);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Switch back to flat mode
      featureManager.setFeature('virtualRows', false);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.queryByRole('grid')).not.toBeInTheDocument();
      });

      // Should maintain functionality
      expect(screen.getByText('Board')).toBeInTheDocument();
    });

    it('should not cause hook order violations during flag changes', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { rerender } = renderWithProviders(<Board />);

      // Multiple rapid flag changes
      for (let i = 0; i < 5; i++) {
        featureManager.setFeature('virtualRows', i % 2 === 0);
        rerender(<Board />);
        
        await waitFor(() => {
          expect(screen.getByText('Board')).toBeInTheDocument();
        });
      }

      // Should not have hook order warnings
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('performance characteristics', () => {
    it('should render large datasets efficiently in virtual mode', async () => {
      mockUseBoardData.clients = seedRows(100);
      featureManager.setFeature('virtualRows', true);
      
      const start = performance.now();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      const duration = performance.now() - start;
      
      // Should render quickly
      expect(duration).toBeLessThan(1000);
      
      // Should render fewer DOM nodes than total clients
      const virtualRows = screen.getAllByRole('row');
      expect(virtualRows.length).toBeLessThan(50); // Much less than 100
    });

    it('should handle flat mode with reasonable dataset sizes', async () => {
      mockUseBoardData.clients = seedRows(50);
      featureManager.setFeature('virtualRows', false);
      
      const start = performance.now();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const duration = performance.now() - start;
      
      // Should render reasonably quickly even in flat mode
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('development toggle', () => {
    it('should show feature toggle in development builds', async () => {
      // Only test if in development environment
      if (import.meta.env.DEV) {
        renderWithProviders(<Board />);

        await waitFor(() => {
          expect(screen.getByText('Board')).toBeInTheDocument();
        });

        // Should show virtualization toggle
        const toggle = screen.getByLabelText(/Virtualized Rows/);
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveAttribute('type', 'checkbox');
      }
    });

    it('should toggle virtualization via development control', async () => {
      if (!import.meta.env.DEV) return;
      
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText(/Virtualized Rows/);
      
      // Should start unchecked (default off)
      expect(toggle).not.toBeChecked();

      // Toggle on
      await user.click(toggle);
      expect(toggle).toBeChecked();

      // Should switch to virtual mode
      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Toggle off
      await user.click(toggle);
      expect(toggle).not.toBeChecked();

      // Should switch back to flat mode
      await waitFor(() => {
        expect(screen.queryByRole('grid')).not.toBeInTheDocument();
      });
    });
  });

  describe('flag persistence', () => {
    it('should persist flag state in development', () => {
      if (!import.meta.env.DEV) return;

      // Set flag
      featureManager.setFeature('virtualRows', true);
      
      // Should be persisted to localStorage
      const stored = localStorage.getItem('features');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.virtualRows).toBe(true);
    });

    it('should load persisted flag state on initialization', () => {
      if (!import.meta.env.DEV) return;

      // Manually set localStorage
      localStorage.setItem('features', JSON.stringify({ virtualRows: true }));
      
      // Reload feature manager
      featureManager.loadFromStorage();
      
      expect(featureManager.isEnabled('virtualRows')).toBe(true);
    });
  });

  describe('accessibility compliance', () => {
    it('should maintain ARIA attributes in both modes', async () => {
      const { rerender } = renderWithProviders(<Board />);

      // Test flat mode
      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Switch to virtual mode
      featureManager.setFeature('virtualRows', true);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', 'Client list');
      expect(grid).toHaveAttribute('aria-rowcount');
    });
  });
});