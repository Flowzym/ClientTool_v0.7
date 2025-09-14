/**
 * Tests for FollowupCell icon-only mode
 * Covers icon-only display when no date and proper date handling
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
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} />
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
      renderWithProviders(
        <FollowupCell id="test-1" followUp={null} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      expect(iconButton).toBeInTheDocument();
    });

    it('should show only calendar icon when follow-up is empty string', () => {
      renderWithProviders(
        <FollowupCell id="test-1" followUp="" />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      expect(iconButton).toBeInTheDocument();
    });

    it('should open date picker when icon clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} />
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
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      await user.click(iconButton);

      const dateInput = screen.getByDisplayValue('');
      await user.type(dateInput, '2024-12-25T10:00');

      const okButton = screen.getByText('OK');
      await user.click(okButton);

      expect(mockActions.setFollowup).toHaveBeenCalledWith(
        'test-1',
        expect.stringMatching(/2024-12-25T10:00:00/)
      );
    });

    it('should cancel date picker when Abbrechen clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      await user.click(iconButton);

      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);

      // Should close picker without calling setFollowup
      expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();
      expect(mockActions.setFollowup).not.toHaveBeenCalled();
    });
  });

  describe('date mode (has value)', () => {
    it('should show date input and clear button when date exists', () => {
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" />
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
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" />
      );

      const clearButton = screen.getByRole('button', { name: /termin löschen/i });
      await user.click(clearButton);

      expect(mockActions.setFollowup).toHaveBeenCalledWith('test-1', null);
    });

    it('should update date when input changed', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" />
      );

      const dateInput = screen.getByDisplayValue('2024-12-25T10:00');
      await user.clear(dateInput);
      await user.type(dateInput, '2024-12-30T14:00');

      expect(mockActions.setFollowup).toHaveBeenCalledWith(
        'test-1',
        expect.stringMatching(/2024-12-30T14:00:00/)
      );
    });
  });

  describe('mode transitions', () => {
    it('should transition from icon-only to date mode when date set', async () => {
      const user = userEvent.setup();
      
      const { rerender } = renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} />
      );

      // Start in icon-only mode
      expect(screen.getByRole('button', { name: /termin hinzufügen/i })).toBeInTheDocument();
      expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();

      // Simulate date being set (would come from parent re-render)
      rerender(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" />
      );

      // Should now be in date mode
      expect(screen.getByDisplayValue('2024-12-25T10:00')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /termin löschen/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /termin hinzufügen/i })).not.toBeInTheDocument();
    });

    it('should transition from date mode to icon-only when date cleared', async () => {
      const { rerender } = renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" />
      );

      // Start in date mode
      expect(screen.getByDisplayValue('2024-12-25T10:00')).toBeInTheDocument();

      // Simulate date being cleared
      rerender(
        <FollowupCell id="test-1" followUp={undefined} />
      );

      // Should now be in icon-only mode
      expect(screen.getByRole('button', { name: /termin hinzufügen/i })).toBeInTheDocument();
      expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for icon button', () => {
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      expect(iconButton).toHaveAttribute('aria-label', 'Termin hinzufügen');
      expect(iconButton).toHaveAttribute('title', 'Termin hinzufügen');
    });

    it('should have proper ARIA labels for clear button', () => {
      renderWithProviders(
        <FollowupCell id="test-1" followUp="2024-12-25T10:00:00Z" />
      );

      const clearButton = screen.getByRole('button', { name: /termin löschen/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Termin löschen');
      expect(clearButton).toHaveAttribute('title', 'Termin löschen');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <FollowupCell id="test-1" followUp={undefined} />
      );

      const iconButton = screen.getByRole('button', { name: /termin hinzufügen/i });
      
      await user.tab();
      expect(iconButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      // Should open date picker
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });
});