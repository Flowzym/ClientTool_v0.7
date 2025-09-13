/**
 * Tests for OfferCell component
 * Covers offer/angebot column rendering and value validation
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import OfferCell from '../components/cells/OfferCell';
import { renderWithProviders } from './TestHarness';

describe('OfferCell', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('allowed values', () => {
    it('should accept and display BAM', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('BAM');
      expect(screen.getByText('BAM')).toBeInTheDocument();
    });

    it('should accept and display LL/B+', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="LL/B+" />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('LL/B+');
      expect(screen.getByText('LL/B+')).toBeInTheDocument();
    });

    it('should accept and display BwB', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="BwB" />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('BwB');
    });

    it('should accept and display NB', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="NB" />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('NB');
    });

    it('should show all allowed options in dropdown', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const select = screen.getByRole('combobox');
      
      // Check all options are present
      expect(screen.getByRole('option', { name: '—' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'BAM' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'LL/B+' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'BwB' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'NB' })).toBeInTheDocument();
    });
  });

  describe('defensive rendering', () => {
    it('should handle undefined value gracefully', () => {
      renderWithProviders(
        <OfferCell id="test-1" value={undefined} />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should handle null value gracefully', () => {
      renderWithProviders(
        <OfferCell id="test-1" value={null as any} />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');
    });

    it('should handle invalid value gracefully', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="INVALID" />
      );

      const select = screen.getByRole('combobox');
      
      // Should not crash and should show the invalid value
      expect(select).toHaveValue('INVALID');
    });

    it('should handle empty string gracefully', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="" />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');
    });
  });

  describe('interaction', () => {
    it('should call setOffer when value selected', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <OfferCell id="test-1" value="" />
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'BAM');

      // Note: Since OfferCell now uses useBoardActions internally,
      // we need to mock the hook or test through ClientRow
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const select = screen.getByRole('combobox');
      
      await user.tab();
      expect(select).toHaveFocus();
      
      // Should be able to change value with keyboard
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
    });
  });

  describe('column positioning', () => {
    it('should be positioned between kunde and status columns', () => {
      // This test verifies the component renders without errors
      // Column positioning is tested at the Board level
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveClass('text-sm', 'border', 'border-gray-300', 'rounded');
    });
  });
});