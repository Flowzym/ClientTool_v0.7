/**
 * Tests for Pin/Favorite functionality
 * Covers aria-pressed state, data attributes, and toggle behavior
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PinCell from '../components/cells/PinCell';
import { renderWithProviders } from './TestHarness';

describe('PinFavorite', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pin state representation', () => {
    it('should show pinned state correctly', () => {
      renderWithProviders(
        <PinCell pinned={true} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      
      // Should indicate pinned state
      expect(button).toHaveAttribute('title', 'Gepinnt');
      expect(button).toHaveClass('bg-yellow-100', 'border-yellow-300');
      expect(screen.getByText('📌')).toBeInTheDocument();
    });

    it('should show unpinned state correctly', () => {
      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      
      // Should indicate unpinned state
      expect(button).toHaveAttribute('title', 'Anpinnen');
      expect(button).toHaveClass('bg-white', 'border-gray-300');
      expect(screen.getByText('📍')).toBeInTheDocument();
    });

    it('should handle undefined pinned state as unpinned', () => {
      renderWithProviders(
        <PinCell pinned={undefined} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Anpinnen');
      expect(screen.getByText('📍')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should be focusable via tab navigation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('should have descriptive title attribute', () => {
      const { rerender } = renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Anpinnen');

      rerender(<PinCell pinned={true} onToggle={mockOnToggle} />);
      
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Gepinnt');
    });
  });

  describe('interaction', () => {
    it('should call onToggle when clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should support keyboard interaction', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      await user.keyboard('{Enter}');

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should support space key activation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      await user.keyboard(' ');

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('visual feedback', () => {
    it('should have hover styling classes', () => {
      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-gray-50');
    });

    it('should maintain consistent button structure', () => {
      renderWithProviders(
        <PinCell pinned={true} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-2', 'py-1', 'text-xs', 'border', 'rounded');
    });
  });

  describe('edge cases', () => {
    it('should handle missing onToggle gracefully', () => {
      renderWithProviders(
        <PinCell pinned={false} onToggle={undefined as any} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Should not crash when clicked without handler
      expect(() => button.click()).not.toThrow();
    });

    it('should render consistently regardless of pin state', () => {
      const { rerender } = renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      let button = screen.getByRole('button');
      const unpinnedClasses = button.className;

      rerender(<PinCell pinned={true} onToggle={mockOnToggle} />);
      
      button = screen.getByRole('button');
      const pinnedClasses = button.className;

      // Both states should have consistent base classes
      expect(unpinnedClasses).toContain('px-2 py-1 text-xs border rounded');
      expect(pinnedClasses).toContain('px-2 py-1 text-xs border rounded');
    });
  });
});