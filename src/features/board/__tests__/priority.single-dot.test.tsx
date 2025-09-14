/**
 * Tests for PriorityCell single-dot display
 * Covers single dot rendering and priority cycling
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PriorityCell from '../components/cells/PriorityCell';
import { renderWithProviders } from './TestHarness';

describe('PriorityCell Single Dot', () => {
  const mockOnCycle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single dot rendering', () => {
    it('should render exactly one dot for niedrig priority', () => {
      renderWithProviders(
        <PriorityCell value="niedrig" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dots = button.querySelectorAll('.w-3.h-3.rounded-full');
      
      expect(dots).toHaveLength(1);
      expect(dots[0]).toHaveClass('bg-green-500');
    });

    it('should render exactly one dot for normal priority', () => {
      renderWithProviders(
        <PriorityCell value="normal" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dots = button.querySelectorAll('.w-3.h-3.rounded-full');
      
      expect(dots).toHaveLength(1);
      expect(dots[0]).toHaveClass('bg-gray-400');
    });

    it('should render exactly one dot for hoch priority', () => {
      renderWithProviders(
        <PriorityCell value="hoch" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dots = button.querySelectorAll('.w-3.h-3.rounded-full');
      
      expect(dots).toHaveLength(1);
      expect(dots[0]).toHaveClass('bg-yellow-500');
    });

    it('should render exactly one dot for dringend priority', () => {
      renderWithProviders(
        <PriorityCell value="dringend" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dots = button.querySelectorAll('.w-3.h-3.rounded-full');
      
      expect(dots).toHaveLength(1);
      expect(dots[0]).toHaveClass('bg-red-500');
    });

    it('should default to normal when value is undefined', () => {
      renderWithProviders(
        <PriorityCell value={undefined} onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dots = button.querySelectorAll('.w-3.h-3.rounded-full');
      
      expect(dots).toHaveLength(1);
      expect(dots[0]).toHaveClass('bg-gray-400'); // Normal priority color
    });

    it('should default to normal when value is null', () => {
      renderWithProviders(
        <PriorityCell value={null} onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dots = button.querySelectorAll('.w-3.h-3.rounded-full');
      
      expect(dots).toHaveLength(1);
      expect(dots[0]).toHaveClass('bg-gray-400');
    });
  });

  describe('priority color mapping', () => {
    const priorityColors = [
      { value: 'niedrig', color: 'bg-green-500', label: 'Niedrig' },
      { value: 'normal', color: 'bg-gray-400', label: 'Normal' },
      { value: 'hoch', color: 'bg-yellow-500', label: 'Hoch' },
      { value: 'dringend', color: 'bg-red-500', label: 'Dringend' }
    ];

    priorityColors.forEach(({ value, color, label }) => {
      it(`should show ${color} dot for ${value} priority`, () => {
        renderWithProviders(
          <PriorityCell value={value} onCycle={mockOnCycle} />
        );

        const button = screen.getByRole('button');
        const dot = button.querySelector('.w-3.h-3.rounded-full');
        
        expect(dot).toHaveClass(color);
        expect(button).toHaveAttribute('title', `Priorität: ${label} (klicken zum Wechseln)`);
      });
    });
  });

  describe('interaction', () => {
    it('should call onCycle when clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PriorityCell value="normal" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnCycle).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PriorityCell value="hoch" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnCycle).toHaveBeenCalledTimes(1);
    });

    it('should support space key activation', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <PriorityCell value="niedrig" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      await user.keyboard(' ');
      
      expect(mockOnCycle).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <PriorityCell value="hoch" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Priorität Hoch, klicken zum Wechseln');
      expect(button).toHaveAttribute('title', 'Priorität: Hoch (klicken zum Wechseln)');
    });

    it('should have consistent ARIA labels for all priorities', () => {
      const priorities = ['niedrig', 'normal', 'hoch', 'dringend'];
      const labels = ['Niedrig', 'Normal', 'Hoch', 'Dringend'];

      priorities.forEach((priority, index) => {
        const { unmount } = renderWithProviders(
          <PriorityCell value={priority} onCycle={mockOnCycle} />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', `Priorität ${labels[index]}, klicken zum Wechseln`);
        
        unmount();
      });
    });
  });

  describe('visual consistency', () => {
    it('should have consistent button styling', () => {
      renderWithProviders(
        <PriorityCell value="hoch" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex', 'items-center', 'justify-center');
      expect(button).toHaveClass('p-2', 'rounded', 'border', 'hover:bg-gray-50');
    });

    it('should center dot within button', () => {
      renderWithProviders(
        <PriorityCell value="dringend" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dot = button.querySelector('.w-3.h-3.rounded-full');
      
      expect(dot).toBeInTheDocument();
      expect(button).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid priority values gracefully', () => {
      renderWithProviders(
        <PriorityCell value="invalid" onCycle={mockOnCycle} />
      );

      const button = screen.getByRole('button');
      const dot = button.querySelector('.w-3.h-3.rounded-full');
      
      // Should fallback to normal priority styling
      expect(dot).toHaveClass('bg-gray-400');
      expect(button).toHaveAttribute('title', 'Priorität: Normal (klicken zum Wechseln)');
    });

    it('should handle missing onCycle gracefully', () => {
      renderWithProviders(
        <PriorityCell value="hoch" onCycle={undefined as any} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Should not crash when clicked without handler
      expect(() => button.click()).not.toThrow();
    });
  });
});