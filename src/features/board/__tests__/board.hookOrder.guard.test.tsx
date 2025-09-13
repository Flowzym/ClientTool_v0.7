/**
 * Guard tests for React Hooks order violations
 * Prevents "change in the order of Hooks" and "rendered more hooks" errors
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderWithProviders } from './TestHarness';
import Board from '../Board';
import { featureManager } from '../../../config/features';
import { seedRows } from './fixtures';

// Mock the board data hook with controllable data
const mockUseBoardData = {
  clients: seedRows(5),
  users: [],
  isLoading: false
};

vi.mock('../useBoardData', () => ({
  useBoardData: () => mockUseBoardData
}));

describe('Board Hook Order Guard', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Spy on console to catch React warnings
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Reset feature flag
    featureManager.setFeature('virtualRows', false);
    
    // Reset mock data
    mockUseBoardData.clients = seedRows(5);
    mockUseBoardData.isLoading = false;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('hook order stability', () => {
    it('should not trigger hook order warnings on initial render', async () => {
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should not have any React hook warnings
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Rendered more hooks than during the previous render/)
      );
    });

    it('should maintain hook order when data size changes', async () => {
      const { rerender } = renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Change to larger dataset
      mockUseBoardData.clients = seedRows(50);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Change to smaller dataset
      mockUseBoardData.clients = seedRows(2);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should not have hook order warnings
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Rendered more hooks/)
      );
    });

    it('should maintain hook order when virtualRows feature flag toggles', async () => {
      const { rerender } = renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Toggle virtualization on
      featureManager.setFeature('virtualRows', true);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Toggle virtualization off
      featureManager.setFeature('virtualRows', false);
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should not have hook order warnings during flag changes
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Rendered more hooks/)
      );
    });

    it('should handle loading state transitions without hook warnings', async () => {
      mockUseBoardData.isLoading = true;
      
      const { rerender } = renderWithProviders(<Board />);

      // Should show loading state
      expect(screen.getByText('Lade Board…')).toBeInTheDocument();

      // Transition to loaded state
      mockUseBoardData.isLoading = false;
      rerender(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should not have hook warnings during loading transitions
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });

    it('should handle empty data without hook warnings', async () => {
      mockUseBoardData.clients = [];
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should render empty state without hook warnings
      expect(screen.getByText('Keine Einträge für die aktuelle Ansicht.')).toBeInTheDocument();
      
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });
  });

  describe('component extraction validation', () => {
    it('should render ClassicClientList without errors', async () => {
      featureManager.setFeature('virtualRows', false);
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should not have any rendering errors
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      // Should render client rows
      const clientRows = screen.getAllByRole('row');
      expect(clientRows.length).toBeGreaterThan(0);
    });

    it('should render VirtualClientList without errors', async () => {
      featureManager.setFeature('virtualRows', true);
      mockUseBoardData.clients = seedRows(20);
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should not have any rendering errors
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      // Should render virtual container
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('interaction stability', () => {
    it('should handle selection without hook warnings', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Select a client
      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 0) {
        await user.click(checkboxes[0]);
        
        await waitFor(() => {
          expect(screen.getByText(/ausgewählt/)).toBeInTheDocument();
        });
      }

      // Should not have hook warnings during interaction
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });

    it('should handle rapid feature flag changes without hook warnings', async () => {
      const { rerender } = renderWithProviders(<Board />);

      // Rapid flag changes
      for (let i = 0; i < 5; i++) {
        featureManager.setFeature('virtualRows', i % 2 === 0);
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
  });

  describe('edge cases', () => {
    it('should handle very large datasets without hook warnings', async () => {
      mockUseBoardData.clients = seedRows(1000);
      
      renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Should handle large datasets without hook issues
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });

    it('should handle component unmount cleanly', async () => {
      const { unmount } = renderWithProviders(<Board />);

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
      });

      // Unmount should not cause hook warnings
      unmount();

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/React has detected a change in the order of Hooks/)
      );
    });
  });
});