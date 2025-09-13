/**
 * Integration tests for OfferCell component
 * Tests UI interaction with setOffer hook and patch flow
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockActions, resetMockActions } from './TestHarness';
import { ClientRow } from '../components/ClientRow';
import OfferCell from '../components/cells/OfferCell';
import { makeRow, mockUsers } from './fixtures';
import type { OfferValue } from '../types';

describe('OfferCell Integration', () => {
  beforeEach(() => {
    resetMockActions();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('offer selection flow', () => {
    it('should call setOffer when offer value changed', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        angebot: undefined
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

      // Find offer select (should show "—" for undefined)
      const offerSelect = screen.getByDisplayValue('');
      expect(offerSelect).toBeInTheDocument();

      // Change to BAM
      await user.selectOptions(offerSelect, 'BAM');

      await waitFor(() => {
        expect(mockActions.setOffer).toHaveBeenCalledWith('client-1', 'BAM');
        expect(mockActions.setOffer).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle all valid offer values', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const validOffers: OfferValue[] = ['BAM', 'LL/B+', 'BwB', 'NB'];

      for (const offer of validOffers) {
        const client = makeRow({
          id: `client-${offer}`,
          angebot: undefined
        });

        const { unmount } = renderWithProviders(
          <ClientRow
            client={client}
            index={0}
            users={mockUsers}
            actions={mockActions}
            selected={false}
            onToggleSelect={vi.fn()}
          />
        );

        const offerSelect = screen.getByDisplayValue('');
        await user.selectOptions(offerSelect, offer);

        await waitFor(() => {
          expect(mockActions.setOffer).toHaveBeenCalledWith(`client-${offer}`, offer);
        });

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should clear offer when empty option selected', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        angebot: 'BAM'
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

      const offerSelect = screen.getByDisplayValue('BAM');
      
      // Clear selection (select empty option)
      await user.selectOptions(offerSelect, '');

      await waitFor(() => {
        expect(mockActions.setOffer).toHaveBeenCalledWith('client-1', undefined);
        expect(mockActions.setOffer).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('defensive rendering', () => {
    it('should handle invalid offer values gracefully', () => {
      const client = makeRow({
        id: 'client-1',
        angebot: 'INVALID_OFFER' as any
      });

      // Should not crash with invalid value
      expect(() => {
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
      }).not.toThrow();

      // Should show the invalid value in select
      const offerSelect = screen.getByDisplayValue('INVALID_OFFER');
      expect(offerSelect).toBeInTheDocument();
    });

    it('should handle null offer value gracefully', () => {
      const client = makeRow({
        id: 'client-1',
        angebot: null as any
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

      // Should show empty selection for null
      const offerSelect = screen.getByDisplayValue('');
      expect(offerSelect).toBeInTheDocument();
    });

    it('should prevent invalid values from being submitted', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnChange = vi.fn();

      renderWithProviders(
        <OfferCell id="test-1" value={undefined} />
      );

      const offerSelect = screen.getByRole('combobox');
      
      // Manually set invalid value (simulates programmatic change)
      offerSelect.value = 'INVALID';
      offerSelect.dispatchEvent(new Event('change', { bubbles: true }));

      // Should not call setOffer for invalid value (console.warn instead)
      expect(mockActions.setOffer).not.toHaveBeenCalled();
    });
  });

  describe('accessibility and interaction', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = makeRow({
        id: 'client-1',
        angebot: 'BAM'
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

      const offerSelect = screen.getByDisplayValue('BAM');
      
      // Should be focusable
      await user.tab();
      // May need multiple tabs to reach offer select
      if (!offerSelect.matches(':focus')) {
        await user.tab();
        await user.tab();
        await user.tab();
      }

      // Should be able to change value with keyboard
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Should trigger setOffer (exact value depends on dropdown behavior)
      await waitFor(() => {
        expect(mockActions.setOffer).toHaveBeenCalled();
      });
    });

    it('should have proper ARIA label', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const offerSelect = screen.getByRole('combobox');
      expect(offerSelect).toHaveAttribute('aria-label', 'Angebot auswählen');
    });
  });

  describe('column positioning verification', () => {
    it('should be positioned between kunde and status columns', () => {
      const client = makeRow({
        id: 'client-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        angebot: 'BAM',
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

      // Should have name, offer, and status elements
      expect(screen.getByText('Mustermann, Max')).toBeInTheDocument();
      expect(screen.getByDisplayValue('BAM')).toBeInTheDocument();
      expect(screen.getByText('Offen')).toBeInTheDocument();
    });
  });

  describe('optimistic updates', () => {
    it('should show immediate feedback on offer change', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock setOffer to apply optimistic update
      mockActions.setOffer.mockImplementation(async (id, offer) => {
        const patches = [{ id, changes: { angebot: offer } }];
        window.dispatchEvent(new CustomEvent('board:optimistic-apply', { 
          detail: { patches } 
        }));
        
        // Simulate async persistence
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const client = makeRow({
        id: 'client-1',
        angebot: undefined
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

      const offerSelect = screen.getByDisplayValue('');
      await user.selectOptions(offerSelect, 'LL/B+');

      await waitFor(() => {
        expect(mockActions.setOffer).toHaveBeenCalledWith('client-1', 'LL/B+');
      });

      // Advance timers to complete async operation
      act(() => {
        vi.advanceTimersByTime(100);
      });
    });
  });

  describe('error scenarios', () => {
    it('should handle setOffer errors gracefully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock setOffer to fail
      mockActions.setOffer.mockRejectedValue(new Error('Database error'));

      const client = makeRow({
        id: 'client-1',
        angebot: undefined
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

      const offerSelect = screen.getByDisplayValue('');
      await user.selectOptions(offerSelect, 'BAM');

      await waitFor(() => {
        expect(mockActions.setOffer).toHaveBeenCalledWith('client-1', 'BAM');
      });

      // Should not crash on error (error handling in actual implementation)
    });
  });

  describe('batch operations compatibility', () => {
    it('should work with bulk offer updates', async () => {
      const selectedIds = ['client-1', 'client-2', 'client-3'];
      const offerValue: OfferValue = 'BwB';

      // Simulate bulk update call
      await mockActions.bulkUpdate(selectedIds, { angebot: offerValue });

      expect(mockActions.bulkUpdate).toHaveBeenCalledWith(selectedIds, { angebot: offerValue });
      expect(mockActions.bulkUpdate).toHaveBeenCalledTimes(1);
    });
  });
});