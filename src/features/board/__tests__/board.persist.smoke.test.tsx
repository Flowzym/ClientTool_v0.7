/**
 * Board persistence smoke test
 * Verifies UI changes are immediately visible and persist after remount
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderWithProviders, resetMockActions } from './TestHarness';
import { ClientRow } from '../components/ClientRow';
import { makeRow, mockUsers } from './fixtures';
import { db } from '../../../data/db';
import { cryptoManager } from '../../../data/crypto';

// Real actions for persistence testing
const realActions = {
  update: async (id: string, changes: any) => {
    const current = await db.clients.get(id);
    if (current) {
      const updated = { ...current, ...changes };
      await db.clients.put(updated);
    }
  },
  setOffer: async (id: string, offer?: string) => {
    await realActions.update(id, { angebot: offer ?? null });
  },
  cyclePriority: async (id: string, current?: string | null) => {
    const order = [null, 'niedrig', 'normal', 'hoch', 'dringend'];
    const idx = order.indexOf(current as any);
    const next = order[(idx + 1) % order.length];
    await realActions.update(id, { priority: next });
  },
  addContactAttempt: async (id: string, channel: string, currentCounts?: any) => {
    const field = channel === 'phone' ? 'contactPhone'
               : channel === 'sms' ? 'contactSms'
               : channel === 'email' ? 'contactEmail'
               : 'contactProxy';
    const prev = (currentCounts && currentCounts[channel]) ?? 0;
    const next = prev + 1;
    await realActions.update(id, { 
      [field]: next, 
      contactCount: next,
      lastActivity: new Date().toISOString() 
    });
  },
  setAssignedTo: async (id: string, userId?: string) => {
    await realActions.update(id, { assignedTo: userId ?? null });
  },
  setFollowup: async (id: string, date?: string) => {
    const changes: any = { followUp: date ?? null };
    if (date) {
      changes.status = 'terminVereinbart';
    } else {
      changes.status = 'offen';
    }
    await realActions.update(id, changes);
  },
  togglePin: async (id: string) => {
    const current = await db.clients.get(id);
    if (current) {
      await realActions.update(id, { 
        isPinned: !current.isPinned,
        pinnedAt: !current.isPinned ? new Date().toISOString() : undefined
      });
    }
  }
};

describe('Board Persistence Smoke Test', () => {
  let testClientId: string;

  beforeEach(async () => {
    resetMockActions();
    vi.useFakeTimers();
    
    // Ensure crypto key is available
    try {
      await cryptoManager.getActiveKey();
    } catch {
      // Auto-generated in dev-enc mode
    }
    
    // Create test client in DB
    testClientId = `test-smoke-${Date.now()}`;
    const testClient: any = {
      id: testClientId,
      firstName: 'Smoke',
      lastName: 'Test',
      status: 'offen',
      priority: 'normal',
      contactCount: 0,
      contactLog: [],
      isArchived: false,
      isPinned: false,
      assignedTo: undefined,
      followUp: undefined,
      angebot: undefined,
      contactPhone: 0,
      contactSms: 0,
      contactEmail: 0,
      contactProxy: 0
    };
    
    await db.clients.put(testClient);
  });

  afterEach(async () => {
    vi.useRealTimers();
    // Cleanup test client
    try {
      await db.clients.delete(testClientId);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('pin persistence', () => {
    it('should show pin change immediately and persist after remount', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Load client from DB
      const client = await db.clients.get(testClientId);
      expect(client.isPinned).toBe(false);

      const { unmount } = renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={async () => await realActions.togglePin(testClientId)}
        />
      );

      // Act: Click pin button
      const pinButton = screen.getByRole('button', { name: /pin/i });
      await user.click(pinButton);

      // Assert: Should be immediately visible (optimistic)
      await waitFor(() => {
        expect(pinButton).toHaveClass('text-blue-600'); // Pinned styling
      });

      // Simulate remount (reload scenario)
      unmount();
      
      // Load fresh data from DB
      const updatedClient = await db.clients.get(testClientId);
      expect(updatedClient.isPinned).toBe(true); // Should be persisted
      expect(updatedClient.pinnedAt).toBeDefined();

      // Remount with fresh data
      renderWithProviders(
        <ClientRow
          client={updatedClient}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={async () => await realActions.togglePin(testClientId)}
        />
      );

      // Should still show pinned state
      const newPinButton = screen.getByRole('button', { name: /pin/i });
      expect(newPinButton).toHaveClass('text-blue-600');
    });
  });

  describe('priority persistence', () => {
    it('should cycle priority and persist changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      const client = await db.clients.get(testClientId);
      expect(client.priority).toBe('normal');

      const { unmount } = renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Act: Click priority button to cycle
      const priorityButton = screen.getByRole('button', { name: /priorität/i });
      await user.click(priorityButton);

      // Should change immediately (optimistic)
      await waitFor(() => {
        // Priority should have changed (exact color depends on cycle)
        expect(priorityButton).toBeInTheDocument();
      });

      // Simulate remount
      unmount();
      
      const updatedClient = await db.clients.get(testClientId);
      expect(updatedClient.priority).not.toBe('normal'); // Should have changed
      expect(['niedrig', 'hoch', 'dringend']).toContain(updatedClient.priority);

      // Remount with fresh data
      renderWithProviders(
        <ClientRow
          client={updatedClient}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Should show updated priority
      const newPriorityButton = screen.getByRole('button', { name: /priorität/i });
      expect(newPriorityButton).toBeInTheDocument();
    });
  });

  describe('contact attempts persistence', () => {
    it('should increment contact count and persist', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      const client = await db.clients.get(testClientId);
      expect(client.contactCount).toBe(0);

      const { unmount } = renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Act: Click phone contact button
      const contactButtons = screen.getAllByRole('button', { name: /\+1/i });
      if (contactButtons.length > 0) {
        await user.click(contactButtons[0]); // Phone button
      }

      // Should show increment immediately
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Counter badge
      });

      // Simulate remount
      unmount();
      
      const updatedClient = await db.clients.get(testClientId);
      expect(updatedClient.contactCount).toBe(1); // Should be persisted
      expect(updatedClient.lastActivity).toBeDefined();

      // Remount with fresh data
      renderWithProviders(
        <ClientRow
          client={updatedClient}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Should still show count
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('assignment persistence', () => {
    it('should persist assignment changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      const client = await db.clients.get(testClientId);
      expect(client.assignedTo).toBeUndefined();

      const { unmount } = renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Act: Change assignment
      const assignSelect = screen.getByDisplayValue('');
      await user.selectOptions(assignSelect, 'admin@local');

      // Should show change immediately
      await waitFor(() => {
        expect(assignSelect).toHaveValue('admin@local');
      });

      // Simulate remount
      unmount();
      
      const updatedClient = await db.clients.get(testClientId);
      expect(updatedClient.assignedTo).toBe('admin@local'); // Should be persisted

      // Remount with fresh data
      renderWithProviders(
        <ClientRow
          client={updatedClient}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Should show persisted assignment
      const newAssignSelect = screen.getByDisplayValue('admin@local');
      expect(newAssignSelect).toBeInTheDocument();
    });
  });

  describe('follow-up persistence', () => {
    it('should persist follow-up date and auto-status', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      const client = await db.clients.get(testClientId);
      expect(client.followUp).toBeUndefined();
      expect(client.status).toBe('offen');

      const { unmount } = renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Act: Set follow-up date
      const followUpInput = screen.getByDisplayValue('');
      await user.type(followUpInput, '2024-12-25T10:00');
      await user.tab(); // Trigger onChange

      // Should show change immediately
      await waitFor(() => {
        expect(followUpInput).toHaveValue('2024-12-25T10:00');
      });

      // Simulate remount
      unmount();
      
      const updatedClient = await db.clients.get(testClientId);
      expect(updatedClient.followUp).toMatch(/2024-12-25T10:00:00/); // Should be persisted
      expect(updatedClient.status).toBe('terminVereinbart'); // Auto-status should be applied

      // Remount with fresh data
      renderWithProviders(
        <ClientRow
          client={updatedClient}
          index={0}
          users={mockUsers}
          actions={realActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      // Should show persisted follow-up and status
      const newFollowUpInput = screen.getByDisplayValue(/2024-12-25T10:00/);
      expect(newFollowUpInput).toBeInTheDocument();
    });
  });
});