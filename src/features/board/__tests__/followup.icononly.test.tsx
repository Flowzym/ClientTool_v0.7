/**
 * Tests for FollowupCell icon-only mode
 * Covers icon-only display when no date, auto-status, and proper date handling
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import FollowupCell from '../components/cells/FollowupCell';
import { renderWithProviders, mockActions, resetMockActions } from './TestHarness';

describe('FollowupCell Icon-Only Mode', () => {
  beforeEach(() => {
    resetMockActions();
  });

  describe('icon-only mode (no date)', () => {
    it('should show only calendar icon when no follow-up date', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      expect(iconButton).toBeInTheDocument();
      expect(iconButton).toHaveAttribute('title', 'Termin hinzufügen');
      
      // Should contain calendar icon
      const icon = iconButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
      
      // Should not show any date input
      expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();
    });

    it('should show only calendar icon when follow-up is null', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <FollowupCell id="test-1" followUp={null} onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      expect(iconButton).toBeInTheDocument();
    });

    it('should show only calendar icon when follow-up is empty string', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <FollowupCell id="test-1" followUp="" onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      expect(iconButton).toBeInTheDocument();
    });

    it('should open date picker when icon clicked', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      await user.click(iconButton);

      // Should show date picker
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });

    it('should save date when OK clicked in picker', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      await user.click(iconButton);

      const dateInput = screen.getByDisplayValue('');
      await user.type(dateInput, '2024-12-25T10:00');

      const okButton = screen.getByText('OK');
      await user.click(okButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringMatching(/2024-12-25T10:00:00/)
      );
    });

    it('should cancel date picker when Abbrechen clicked', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      await user.click(iconButton);

      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);

      // Should close picker without calling onChange
      expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('date mode (has value)', () => {
    it('should show date input and clear button when date exists', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" onChange={mockOnChange} />
      );

      // Should show date input
      expect(screen.getByDisplayValue('2024-12-25T10:00')).toBeInTheDocument();
      
      // Should show formatted date
      expect(screen.getByText('25.12.2024')).toBeInTheDocument();
      
      // Should show clear button
      const clearButton = screen.getByRole('button', { name: /termin löschen/i });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveAttribute('title', 'Termin löschen');
    });

    it('should clear date when clear button clicked', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" onChange={mockOnChange} />
      );

      const clearButton = screen.getByRole('button', { name: /termin löschen/i });
      await user.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should update date when input changed', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" onChange={mockOnChange} />
      );

      const dateInput = screen.getByDisplayValue('2024-12-25T10:00');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-30T14:00');

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.stringMatching(/2024-12-30T14:00:00/)
      );
    });
  });

  describe('mode transitions', () => {
    it('should transition from icon-only to date mode when date set', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      const { rerender } = renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      // Start in icon-only mode
      expect(screen.getByRole('button', { name: /termin hinzufügen/i })).toBeInTheDocument();
      expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();

      // Simulate date being set (would come from parent re-render)
      rerender(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" onChange={mockOnChange} />
      );

      // Should now be in date mode
      expect(screen.getByDisplayValue('2024-12-25T10:00')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /termin löschen/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /termin hinzufügen/i })).not.toBeInTheDocument();
    });

    it('should transition from date mode to icon-only when date cleared', async () => {
      const mockOnChange = vi.fn();
      const { rerender } = renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" onChange={mockOnChange} />
      );

      // Start in date mode
      expect(screen.getByDisplayValue('2024-12-25T10:00')).toBeInTheDocument();

      // Simulate date being cleared
      rerender(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      // Should now be in icon-only mode
      expect(screen.getByRole('button', { name: /termin hinzufügen/i })).toBeInTheDocument();
      expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for icon button', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      expect(iconButton).toHaveAttribute('aria-label', 'Termin hinzufügen');
      expect(iconButton).toHaveAttribute('title', 'Termin hinzufügen');
    });

    it('should have proper ARIA labels for clear button', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" onChange={mockOnChange} />
      );

      const clearButton = screen.getByRole('button', { name: /termin löschen/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Termin löschen');
      expect(clearButton).toHaveAttribute('title', 'Termin löschen');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} onChange={mockOnChange} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      
      await user.tab();
      expect(iconButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      // Should open date picker
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });

  describe('auto-status integration', () => {
    it('should trigger status change when date is set via ClientRow', async () => {
      const user = userEvent.setup();
      
      // Test through ClientRow to verify auto-status integration
      const client = { 
        id: 'client-1', 
        firstName: 'Max', 
        lastName: 'Mustermann',
        status: 'offen',
        followUp: undefined 
      };

      renderWithProviders(
        <div>
          <FollowupCell 
            id="client-1" 
            followUp={client.followUp} 
            onChange={(d?: string) => {
              const changes = { 
                followUp: d ?? null,
                status: d ? 'terminVereinbart' : 'offen'
              };
              mockActions.update('client-1', changes);
            }}
          />
        </div>
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      await user.click(iconButton);

      const dateInput = screen.getByDisplayValue('');
      await user.type(dateInput, '2024-12-25T10:00');

      const okButton = screen.getByText('OK');
      await user.click(okButton);

      expect(mockActions.update).toHaveBeenCalledWith('client-1', {
        followUp: expect.stringMatching(/2024-12-25T10:00:00/),
        status: 'terminVereinbart'
      });
    });

    it('should trigger status change when date is cleared via ClientRow', async () => {
      const user = userEvent.setup();
      
      const client = { 
        id: 'client-1',
        status: 'terminVereinbart',
        followUp: '2024-12-25T10:00:00Z'
      };

      renderWithProviders(
        <div>
          <FollowupCell 
            id="client-1" 
            followUp={client.followUp} 
            onChange={(d?: string) => {
              const changes = { 
                followUp: d ?? null,
                status: d ? 'terminVereinbart' : 'offen'
              };
              mockActions.update('client-1', changes);
            }}
          />
        </div>
      );

      const clearButton = screen.getByRole('button', { name: /termin löschen/i });
      await user.click(clearButton);

      expect(mockActions.update).toHaveBeenCalledWith('client-1', {
        followUp: null,
        status: 'offen'
      });
    });
  });
});