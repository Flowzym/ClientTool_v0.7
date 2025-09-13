/**
 * Smoke tests for extracted client list components
 * Ensures ClassicClientList and VirtualClientList render without errors
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockActions } from './TestHarness';
import { seedRows, mockUsers } from './fixtures';

// Import the extracted components from Board.tsx
// Since they're not exported, we'll test them through Board component behavior
import Board from '../Board';
import { featureManager } from '../../../config/features';

// Mock board data
const mockUseBoardData = {
  clients: seedRows(10),
  users: mockUsers,
  isLoading: false
};

vi.mock('../useBoardData', () => ({
  useBoardData: () => mockUseBoardData
}));

describe('Client List Components Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBoardData.clients = seedRows(10);
    mockUseBoardData.isLoading = false;
  });

  describe('ClassicClientList (virtualRows=false)', () => {
    beforeEach(() => {
      featureManager.setFeature('virtualRows', false);
    });

    it('should render without errors', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should render client rows
      const clientRows = screen.getAllByRole('row');
      expect(clientRows.length).toBeGreaterThan(0);
      
      // Should not have virtual container
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });

    it('should handle selection interaction', async () => {
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

    it('should handle pin interaction', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should be able to interact with pin buttons
      const pinButtons = screen.getAllByRole('button', { name: /pin/i });
      expect(pinButtons.length).toBeGreaterThan(0);

      // Pin interaction should work
      await user.click(pinButtons[0]);
      
      // Should not crash
      expect(screen.getByText('Board')).toBeInTheDocument();
    });

    it('should handle status changes', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should be able to change status
      const statusButtons = screen.getAllByText('Offen');
      if (statusButtons.length > 0) {
        await user.click(statusButtons[0]);
        
        // Should not crash
        expect(screen.getByText('Board')).toBeInTheDocument();
      }
    });

    it('should handle empty data gracefully', async () => {
      mockUseBoardData.clients = [];
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should show empty state
      expect(screen.getByText('Keine Einträge für die aktuelle Ansicht.')).toBeInTheDocument();
    });
  });

  describe('VirtualClientList (virtualRows=true)', () => {
    beforeEach(() => {
      featureManager.setFeature('virtualRows', true);
    });

    it('should render without errors', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should render virtual container
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', async () => {
      mockUseBoardData.clients = seedRows(100);
      
      const start = performance.now();
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });
      
      const duration = performance.now() - start;
      
      // Should render quickly even with large dataset
      expect(duration).toBeLessThan(1000);
      
      // Should render fewer DOM nodes than total clients
      const virtualRows = screen.getAllByRole('row');
      expect(virtualRows.length).toBeLessThan(50); // Much less than 100
    });

    it('should handle selection in virtual mode', async () => {
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

    it('should handle pin operations in virtual mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should be able to interact with pin buttons
      const pinButtons = screen.getAllByRole('button', { name: /pin/i });
      expect(pinButtons.length).toBeGreaterThan(0);

      await user.click(pinButtons[0]);
      
      // Should not crash
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should handle status changes in virtual mode', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should be able to change status
      const statusButtons = screen.getAllByText('Offen');
      if (statusButtons.length > 0) {
        await user.click(statusButtons[0]);
        
        // Should not crash
        expect(screen.getByRole('grid')).toBeInTheDocument();
      }
    });
  });

  describe('feature flag transitions', () => {
    it('should handle flag toggle without hook warnings', async () => {
      const { rerender } = renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Toggle virtualization multiple times
      for (let i = 0; i < 3; i++) {
        featureManager.setFeature('virtualRows', i % 2 === 0);
        rerender(<Board />);
        
        await waitFor(() => {
          expect(screen.getByText('Board')).toBeInTheDocument();
        });
      }

      // Should not have hook warnings during transitions
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });

    it('should maintain functionality across flag changes', async () => {
      const user = userEvent.setup();
      
      const { rerender } = renderWithProviders(<Board />);

      // Start with classic mode
      featureManager.setFeature('virtualRows', false);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should work in classic mode
      const checkboxes1 = screen.getAllByRole('checkbox');
      if (checkboxes1.length > 0) {
        await user.click(checkboxes1[0]);
      }

      // Switch to virtual mode
      featureManager.setFeature('virtualRows', true);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      });

      // Should still work in virtual mode
      const checkboxes2 = screen.getAllByRole('checkbox');
      if (checkboxes2.length > 0) {
        await user.click(checkboxes2[0]);
      }

      // No hook warnings during mode switches
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });
  });

  describe('stress testing', () => {
    it('should handle rapid re-renders without hook warnings', async () => {
      const { rerender } = renderWithProviders(<Board />);

      // Rapid data changes
      for (let i = 1; i <= 10; i++) {
        mockUseBoardData.clients = seedRows(i * 5);
        rerender(<Board />);
        
        await waitFor(() => {
          expect(screen.getByText('Board')).toBeInTheDocument();
        });
      }

      // Should handle rapid changes without hook warnings
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });

    it('should handle concurrent flag and data changes', async () => {
      const { rerender } = renderWithProviders(<Board />);

      // Concurrent changes
      for (let i = 0; i < 5; i++) {
        featureManager.setFeature('virtualRows', i % 2 === 0);
        mockUseBoardData.clients = seedRows((i + 1) * 10);
        rerender(<Board />);
        
        await waitFor(() => {
          expect(screen.getByText('Board')).toBeInTheDocument();
        });
      }

      // Should handle concurrent changes without hook warnings
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });
  });
});