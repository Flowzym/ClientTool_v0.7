/**
 * Tests for Status Chips with blue variant detection
 * Covers status rendering, blue variants, and accessibility
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatusChip } from '../StatusChips';
import { renderWithProviders } from './TestHarness';

describe('StatusChip', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('blue variant detection', () => {
    it('should render blue variant for "gebucht" status', () => {
      renderWithProviders(
        <StatusChip value="inBearbeitung" onChange={mockOnChange} />
      );

      const chip = screen.getByText('Gebucht / Bearbeitung');
      
      // Check for blue styling (current implementation uses bg-blue-100 text-blue-800)
      expect(chip).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
    });

    it('should render blue variant for "bearbeitung" status', () => {
      renderWithProviders(
        <StatusChip value="inBearbeitung" onChange={mockOnChange} />
      );

      const chip = screen.getByText('Gebucht / Bearbeitung');
      expect(chip).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
    });

    it('should not render blue variant for other statuses', () => {
      const nonBlueStatuses = ['offen', 'erledigt', 'ruht', 'abgebrochen'];

      nonBlueStatuses.forEach(status => {
        const { unmount } = renderWithProviders(
          <StatusChip value={status as any} onChange={mockOnChange} />
        );

        const chip = screen.getByRole('button');
        
        // Should not have blue styling
        expect(chip.querySelector('.bg-blue-100')).not.toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('accessibility', () => {
    it('should have accessible name for screen readers', () => {
      renderWithProviders(
        <StatusChip value="offen" onChange={mockOnChange} />
      );

      const button = screen.getByRole('button');
      
      // Should have accessible content
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Offen')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <StatusChip value="offen" onChange={mockOnChange} />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
      
      // Should open dropdown on Enter/Space
      await user.keyboard('{Enter}');
      
      // Dropdown should be visible
      expect(screen.getByText('Gebucht / Bearbeitung')).toBeInTheDocument();
    });

    it('should support disabled state', () => {
      renderWithProviders(
        <StatusChip value="offen" onChange={mockOnChange} disabled />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('dropdown interaction', () => {
    it('should open dropdown when clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <StatusChip value="offen" onChange={mockOnChange} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Should show all status options
      expect(screen.getByText('Gebucht / Bearbeitung')).toBeInTheDocument();
      expect(screen.getByText('Abgebucht / Erledigt')).toBeInTheDocument();
      expect(screen.getByText('Ruht')).toBeInTheDocument();
      expect(screen.getByText('Vom TAS entfernt')).toBeInTheDocument();
    });

    it('should call onChange when option selected', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <StatusChip value="offen" onChange={mockOnChange} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      const option = screen.getByText('Gebucht / Bearbeitung');
      await user.click(option);

      expect(mockOnChange).toHaveBeenCalledWith('inBearbeitung');
    });

    it('should close dropdown after selection', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <StatusChip value="offen" onChange={mockOnChange} />
      );

      const button = screen.getByRole('button');
      await user.click(button);
      
      const option = screen.getByText('Ruht');
      await user.click(option);

      // Dropdown should be closed
      expect(screen.queryByText('Gebucht / Bearbeitung')).not.toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <div>
          <StatusChip value="offen" onChange={mockOnChange} />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Dropdown should be open
      expect(screen.getByText('Gebucht / Bearbeitung')).toBeInTheDocument();

      // Click outside
      const outside = screen.getByTestId('outside');
      await user.click(outside);

      // Dropdown should be closed
      expect(screen.queryByText('Gebucht / Bearbeitung')).not.toBeInTheDocument();
    });
  });

  describe('status variants', () => {
    it('should render correct labels for all status values', () => {
      const statusMappings = [
        { value: 'offen', label: 'Offen' },
        { value: 'inBearbeitung', label: 'Gebucht / Bearbeitung' },
        { value: 'erledigt', label: 'Abgebucht / Erledigt' },
        { value: 'ruht', label: 'Ruht' },
        { value: 'abgebrochen', label: 'Vom TAS entfernt' }
      ];

      statusMappings.forEach(({ value, label }) => {
        const { unmount } = renderWithProviders(
          <StatusChip value={value as any} onChange={mockOnChange} />
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        
        unmount();
      });
    });

    it('should handle unknown status values gracefully', () => {
      renderWithProviders(
        <StatusChip value={'unknown-status' as any} onChange={mockOnChange} />
      );

      // Should render the raw value when no mapping exists
      expect(screen.getByText('unknown-status')).toBeInTheDocument();
    });
  });
});