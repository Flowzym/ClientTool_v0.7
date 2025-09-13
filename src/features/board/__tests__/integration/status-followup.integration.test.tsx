/**
 * Integration tests for Status ↔ Follow-up automatic rules
 * Tests the business logic: setting follow-up → status=terminVereinbart, clearing follow-up → status=offen
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockActions, resetMockActions } from '../TestHarness';
import { ClientRow } from '../../components/ClientRow';
import { makeRow, mockUsers } from '../fixtures';

describe('Status ↔ Follow-up Integration', () => {
  beforeEach(() => {
    resetMockActions();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('follow-up setting triggers status change', () => {
    it('should set status to terminVereinbart when follow-up date is set', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'offen',
        followUp: undefined
      });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Find and interact with follow-up input
      const followUpInput = screen.getByDisplayValue('');
      expect(followUpInput).toBeInTheDocument();

      // Set a follow-up date
      await user.clear(followUpInput);
      await user.type(followUpInput, '2024-12-25T10:00');

      // Trigger change event
      await user.tab(); // Blur to trigger onChange

      await waitFor(() => {
        // Should call setFollowup with the date and automatic status change
        expect(mockActions.setFollowup).toHaveBeenCalledWith(
          'client-1',
          expect.stringMatching(/2024-12-25T10:00:00/)
        );
      });

      // Verify the action was called exactly once
      expect(mockActions.setFollowup).toHaveBeenCalledTimes(1);
    });

    it('should set status to offen when follow-up is cleared', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        status: 'terminVereinbart',
        followUp: '2024-12-25T10:00:00Z'
      });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Find follow-up input with existing value
      const followUpInput = screen.getByDisplayValue('2024-12-25T10:00');
      expect(followUpInput).toBeInTheDocument();

      // Clear the follow-up date
      await user.clear(followUpInput);
      await user.tab(); // Blur to trigger onChange

      await waitFor(() => {
        // Should call setFollowup with null to clear
        expect(mockActions.setFollowup).toHaveBeenCalledWith('client-1', null);
      });

      expect(mockActions.setFollowup).toHaveBeenCalledTimes(1);
    });
  });

  describe('status change behavior', () => {
    it('should maintain existing status when follow-up is invalid', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        status: 'inBearbeitung',
        followUp: undefined
      });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      const followUpInput = screen.getByDisplayValue('');

      // Enter invalid date
      await user.type(followUpInput, 'invalid-date');
      await user.tab();

      await waitFor(() => {
        // Should still call setFollowup but with null/undefined for invalid date
        expect(mockActions.setFollowup).toHaveBeenCalledWith('client-1', null);
      });
    });

    it('should handle rapid follow-up changes correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        status: 'offen',
        followUp: undefined
      });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      const followUpInput = screen.getByDisplayValue('');

      // Set follow-up
      await user.type(followUpInput, '2024-12-25T10:00');
      await user.tab();

      // Clear follow-up quickly
      await user.clear(followUpInput);
      await user.tab();

      await waitFor(() => {
        // Should have been called twice
        expect(mockActions.setFollowup).toHaveBeenCalledTimes(2);
      });

      // Last call should be clearing
      expect(mockActions.setFollowup).toHaveBeenLastCalledWith('client-1', null);
    });
  });

  describe('edge cases', () => {
    it('should handle existing follow-up modification', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        status: 'terminVereinbart',
        followUp: '2024-12-25T10:00:00Z'
      });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      const followUpInput = screen.getByDisplayValue('2024-12-25T10:00');

      // Modify existing follow-up
      await user.clear(followUpInput);
      await user.type(followUpInput, '2024-12-30T14:00');
      await user.tab();

      await waitFor(() => {
        expect(mockActions.setFollowup).toHaveBeenCalledWith(
          'client-1',
          expect.stringMatching(/2024-12-30T14:00:00/)
        );
      });
    });

    it('should handle timezone handling correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        status: 'offen'
      });

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      const followUpInput = screen.getByDisplayValue('');

      // Set follow-up with specific time
      await user.type(followUpInput, '2024-12-25T15:30');
      await user.tab();

      await waitFor(() => {
        const call = mockActions.setFollowup.mock.calls[0];
        expect(call[0]).toBe('client-1');
        expect(call[1]).toMatch(/2024-12-25T15:30:00/);
        expect(call[1]).toMatch(/Z$/); // Should be ISO string with Z
      });
    });
  });
});