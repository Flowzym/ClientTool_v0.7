/**
 * Tests for Archive Action (icon-only button)
 * Ensures no text "archivieren" exists, only icon with ARIA label
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ArchiveCell from '../components/cells/ArchiveCell';
import { renderWithProviders } from './TestHarness';

describe('ArchiveAction', () => {
  const mockOnArchive = vi.fn();
  const mockOnUnarchive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('icon-only requirement', () => {
    it('should not contain text "archivieren" anywhere', () => {
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      // Should not contain the word "archivieren" in any form
      expect(screen.queryByText(/archivieren/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/archive/i)).not.toBeInTheDocument();
    });

    it('should render archive icon for non-archived items', () => {
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /archivieren/i });
      expect(button).toBeInTheDocument();
      
      // Should contain Archive icon (Lucide Archive component)
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render unarchive icon for archived items', () => {
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={true} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /entarchivieren/i });
      expect(button).toBeInTheDocument();
      
      // Should contain ArchiveRestore icon
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA label for archive action', () => {
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /archivieren/i });
      expect(button).toHaveAttribute('title', 'Archivieren');
    });

    it('should have proper ARIA label for unarchive action', () => {
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={true} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /entarchivieren/i });
      expect(button).toHaveAttribute('title', 'Entarchivieren');
    });

    it('should be focusable via tab navigation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
    });
  });

  describe('interaction', () => {
    it('should call onArchive when archive button clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /archivieren/i });
      await user.click(button);

      expect(mockOnArchive).toHaveBeenCalledTimes(1);
      expect(mockOnUnarchive).not.toHaveBeenCalled();
    });

    it('should call onUnarchive when unarchive button clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={true} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /entarchivieren/i });
      await user.click(button);

      expect(mockOnUnarchive).toHaveBeenCalledTimes(1);
      expect(mockOnArchive).not.toHaveBeenCalled();
    });

    it('should support keyboard interaction', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      await user.keyboard('{Enter}');

      expect(mockOnArchive).toHaveBeenCalledTimes(1);
    });
  });

  describe('visual state', () => {
    it('should have consistent styling for both states', () => {
      const { rerender } = renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const archiveButton = screen.getByRole('button');
      expect(archiveButton).toHaveClass('p-1', 'rounded', 'border', 'hover:bg-gray-50');

      rerender(
        <ArchiveCell 
          id="test-1"
          isArchived={true} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const unarchiveButton = screen.getByRole('button');
      expect(unarchiveButton).toHaveClass('p-1', 'rounded', 'border', 'hover:bg-gray-50');
    });
  });
});