/**
 * Tests for ContactAttemptsCell badge visibility
 * Covers CounterBadge display rules and larger icons
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ContactAttemptsCell from '../components/cells/ContactAttemptsCell';
import { renderWithProviders } from './TestHarness';

describe('ContactAttemptsCell Badge Visibility', () => {
  const mockOnAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('badge visibility rules', () => {
    it('should show badges only when count >= 1', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={2}
          sms={0}
          email={1}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      // Should show badges for phone (2) and email (1)
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // Should not show badges for sms (0) and proxy (0)
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should not show any badges when all counts are 0', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={0}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      // Should not show any number badges
      expect(screen.queryByText(/[0-9]/)).not.toBeInTheDocument();
    });

    it('should show all badges when all counts >= 1', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={3}
          sms={1}
          email={2}
          proxy={1}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getAllByText('1')).toHaveLength(2); // sms and proxy both have 1
    });

    it('should handle high counts correctly', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={99}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });

  describe('icon rendering', () => {
    it('should render all contact type icons', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={1}
          sms={1}
          email={1}
          proxy={1}
          onAdd={mockOnAdd}
        />
      );

      // Should have 4 buttons (one for each contact type)
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);

      // Each button should contain an SVG icon
      buttons.forEach(button => {
        const icon = button.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should have larger icons (size 18)', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={1}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      const phoneButton = screen.getAllByRole('button')[0];
      const phoneIcon = phoneButton.querySelector('svg');
      
      // Icon should have larger size (18px)
      expect(phoneIcon).toHaveAttribute('width', '18');
      expect(phoneIcon).toHaveAttribute('height', '18');
    });

    it('should have proper button structure for icon placement', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={1}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Should have relative positioning for badge overlay
        expect(button).toHaveClass('relative');
        expect(button).toHaveClass('p-2'); // Larger padding for bigger icons
        expect(button).toHaveClass('flex', 'items-center', 'justify-center');
      });
    });
  });

  describe('badge positioning', () => {
    it('should position badges correctly relative to icons', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={5}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      const badge = screen.getByText('5');
      
      // Badge should have absolute positioning classes (from CounterBadge)
      expect(badge).toHaveClass('absolute', '-top-1', '-right-1');
      expect(badge).toHaveClass('min-w-[16px]', 'h-[16px]');
    });

    it('should use same badge design as notes badge', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={3}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      const badge = screen.getByText('3');
      
      // Should match notes badge styling
      expect(badge).toHaveClass('text-gray-800', 'bg-white', 'border', 'border-gray-300', 'rounded-full');
      expect(badge).toHaveClass('text-[10px]', 'leading-[16px]', 'text-center');
    });
  });

  describe('interaction', () => {
    it('should call onAdd with correct parameters when button clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={2}
          sms={1}
          email={0}
          proxy={3}
          onAdd={mockOnAdd}
        />
      );

      const buttons = screen.getAllByRole('button');
      
      // Click phone button (first)
      await user.click(buttons[0]);
      
      expect(mockOnAdd).toHaveBeenCalledWith('phone', {
        phone: 2,
        sms: 1,
        email: 0,
        proxy: 3
      });

      // Click email button (third)
      await user.click(buttons[2]);
      
      expect(mockOnAdd).toHaveBeenCalledWith('email', {
        phone: 2,
        sms: 1,
        email: 0,
        proxy: 3
      });

      expect(mockOnAdd).toHaveBeenCalledTimes(2);
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={1}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      const phoneButton = screen.getAllByRole('button')[0];
      
      await user.tab();
      expect(phoneButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnAdd).toHaveBeenCalledWith('phone', expect.any(Object));
    });
  });

  describe('edge cases', () => {
    it('should handle undefined counts gracefully', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={undefined as any}
          sms={undefined as any}
          email={undefined as any}
          proxy={undefined as any}
          onAdd={mockOnAdd}
        />
      );

      // Should default to 0 and show no badges
      expect(screen.queryByText(/[0-9]/)).not.toBeInTheDocument();
      
      // Should still render buttons
      expect(screen.getAllByRole('button')).toHaveLength(4);
    });

    it('should handle negative counts gracefully', () => {
      renderWithProviders(
        <ContactAttemptsCell
          id="test-1"
          phone={-1}
          sms={0}
          email={0}
          proxy={0}
          onAdd={mockOnAdd}
        />
      );

      // Should not show badge for negative count
      expect(screen.queryByText('-1')).not.toBeInTheDocument();
    });
  });
});