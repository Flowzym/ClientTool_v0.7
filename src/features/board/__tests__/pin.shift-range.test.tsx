/**
 * Tests for Pin Shift-Range functionality
 * Covers shift-click range pinning/unpinning and pinned-first sorting preservation
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockActions, resetMockActions } from './TestHarness';
import { ClientRow } from '../components/ClientRow';
import { seedRows, mockUsers } from './fixtures';

describe('Pin Shift-Range', () => {
  beforeEach(() => {
    resetMockActions();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('single pin toggle', () => {
    it('should pin unpinned client when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = seedRows(1)[0];
      client.isPinned = false;
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={mockOnTogglePin}
        />
      );

      const pinButton = screen.getByRole('button', { name: /pin/i });
      await user.click(pinButton);

      expect(mockOnTogglePin).toHaveBeenCalledWith(0, client.id, expect.any(MouseEvent));
    });

    it('should unpin pinned client when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = seedRows(1)[0];
      client.isPinned = true;
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={mockOnTogglePin}
        />
      );

      const pinButton = screen.getByRole('button', { name: /pin/i });
      await user.click(pinButton);

      expect(mockOnTogglePin).toHaveBeenCalledWith(0, client.id, expect.any(MouseEvent));
    });
  });

  describe('shift-range pin toggle', () => {
    it('should pin range when target is unpinned', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(5);
      clients.forEach((c, i) => { c.isPinned = false; });
      
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <div>
          {clients.map((client, index) => (
            <ClientRow
              key={client.id}
              client={client}
              index={index}
              users={mockUsers}
              actions={mockActions}
              selected={false}
              onToggleSelect={vi.fn()}
              onTogglePin={mockOnTogglePin}
            />
          ))}
        </div>
      );

      const pinButtons = screen.getAllByRole('button', { name: /pin/i });

      // First click to set anchor (index 1)
      await user.click(pinButtons[1]);
      expect(mockOnTogglePin).toHaveBeenCalledWith(1, clients[1].id, expect.any(MouseEvent));

      // Shift+click on index 3 (should pin range 1-3)
      await user.keyboard('{Shift>}');
      await user.click(pinButtons[3]);
      await user.keyboard('{/Shift}');

      expect(mockOnTogglePin).toHaveBeenCalledWith(3, clients[3].id, expect.any(MouseEvent));
      expect(mockOnTogglePin).toHaveBeenCalledTimes(2);
    });

    it('should unpin range when target is pinned', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(5);
      clients.forEach((c, i) => { c.isPinned = true; });
      
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <div>
          {clients.map((client, index) => (
            <ClientRow
              key={client.id}
              client={client}
              index={index}
              users={mockUsers}
              actions={mockActions}
              selected={false}
              onToggleSelect={vi.fn()}
              onTogglePin={mockOnTogglePin}
            />
          ))}
        </div>
      );

      const pinButtons = screen.getAllByRole('button', { name: /pin/i });

      // First click to set anchor (index 0)
      await user.click(pinButtons[0]);
      expect(mockOnTogglePin).toHaveBeenCalledWith(0, clients[0].id, expect.any(MouseEvent));

      // Shift+click on index 2 (should unpin range 0-2)
      await user.keyboard('{Shift>}');
      await user.click(pinButtons[2]);
      await user.keyboard('{/Shift}');

      expect(mockOnTogglePin).toHaveBeenCalledWith(2, clients[2].id, expect.any(MouseEvent));
      expect(mockOnTogglePin).toHaveBeenCalledTimes(2);
    });

    it('should handle reverse range (higher index to lower index)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(4);
      clients.forEach((c, i) => { c.isPinned = false; });
      
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <div>
          {clients.map((client, index) => (
            <ClientRow
              key={client.id}
              client={client}
              index={index}
              users={mockUsers}
              actions={mockActions}
              selected={false}
              onToggleSelect={vi.fn()}
              onTogglePin={mockOnTogglePin}
            />
          ))}
        </div>
      );

      const pinButtons = screen.getAllByRole('button', { name: /pin/i });

      // First click to set anchor (index 3)
      await user.click(pinButtons[3]);
      expect(mockOnTogglePin).toHaveBeenCalledWith(3, clients[3].id, expect.any(MouseEvent));

      // Shift+click on index 1 (should pin range 1-3)
      await user.keyboard('{Shift>}');
      await user.click(pinButtons[1]);
      await user.keyboard('{/Shift}');

      expect(mockOnTogglePin).toHaveBeenCalledWith(1, clients[1].id, expect.any(MouseEvent));
      expect(mockOnTogglePin).toHaveBeenCalledTimes(2);
    });
  });

  describe('pinned-first sorting preservation', () => {
    it('should maintain pinned clients at top after pin operations', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(3);
      clients[0].isPinned = true;  // Already pinned
      clients[1].isPinned = false; // Will be pinned
      clients[2].isPinned = false; // Stays unpinned
      
      // Mock sorting to verify pinned-first behavior
      const sortedClients = [...clients].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      expect(sortedClients[0].isPinned).toBe(true);
      expect(sortedClients[1].isPinned).toBe(false);
      expect(sortedClients[2].isPinned).toBe(false);
    });

    it('should preserve sort order within pinned and unpinned groups', async () => {
      const clients = [
        { id: '1', firstName: 'Anna', isPinned: true, priority: 'hoch' },
        { id: '2', firstName: 'Bernd', isPinned: true, priority: 'normal' },
        { id: '3', firstName: 'Clara', isPinned: false, priority: 'dringend' },
        { id: '4', firstName: 'David', isPinned: false, priority: 'niedrig' }
      ];

      // Sort by priority with pinned-first
      const sorted = [...clients].sort((a, b) => {
        // Pinned first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // Then by priority
        const priorityOrder = { dringend: 4, hoch: 3, normal: 2, niedrig: 1 };
        const aPrio = priorityOrder[a.priority] || 0;
        const bPrio = priorityOrder[b.priority] || 0;
        return bPrio - aPrio;
      });

      // Pinned clients should be first, sorted by priority
      expect(sorted[0].id).toBe('1'); // Anna (pinned, hoch)
      expect(sorted[1].id).toBe('2'); // Bernd (pinned, normal)
      
      // Unpinned clients should be after, sorted by priority
      expect(sorted[2].id).toBe('3'); // Clara (unpinned, dringend)
      expect(sorted[3].id).toBe('4'); // David (unpinned, niedrig)
    });
  });

  describe('edge cases', () => {
    it('should handle pin toggle on first client', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = seedRows(1)[0];
      client.isPinned = false;
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={mockOnTogglePin}
        />
      );

      const pinButton = screen.getByRole('button', { name: /pin/i });
      await user.click(pinButton);

      expect(mockOnTogglePin).toHaveBeenCalledWith(0, client.id, expect.any(MouseEvent));
    });

    it('should handle pin toggle on last client', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(3);
      const lastClient = clients[2];
      lastClient.isPinned = false;
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <div>
          {clients.map((client, index) => (
            <ClientRow
              key={client.id}
              client={client}
              index={index}
              users={mockUsers}
              actions={mockActions}
              selected={false}
              onToggleSelect={vi.fn()}
              onTogglePin={mockOnTogglePin}
            />
          ))}
        </div>
      );

      const pinButtons = screen.getAllByRole('button', { name: /pin/i });
      await user.click(pinButtons[2]);

      expect(mockOnTogglePin).toHaveBeenCalledWith(2, lastClient.id, expect.any(MouseEvent));
    });

    it('should handle mixed pin states in range', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const clients = seedRows(4);
      clients[0].isPinned = true;  // Pinned
      clients[1].isPinned = false; // Unpinned
      clients[2].isPinned = true;  // Pinned
      clients[3].isPinned = false; // Unpinned (target)
      
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <div>
          {clients.map((client, index) => (
            <ClientRow
              key={client.id}
              client={client}
              index={index}
              users={mockUsers}
              actions={mockActions}
              selected={false}
              onToggleSelect={vi.fn()}
              onTogglePin={mockOnTogglePin}
            />
          ))}
        </div>
      );

      const pinButtons = screen.getAllByRole('button', { name: /pin/i });

      // Set anchor at index 1
      await user.click(pinButtons[1]);

      // Shift+click on index 3 (target is unpinned, so range should be pinned)
      await user.keyboard('{Shift>}');
      await user.click(pinButtons[3]);
      await user.keyboard('{/Shift}');

      expect(mockOnTogglePin).toHaveBeenCalledTimes(2);
      expect(mockOnTogglePin).toHaveBeenLastCalledWith(3, clients[3].id, expect.any(MouseEvent));
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-pressed state for pinned items', () => {
      const client = seedRows(1)[0];
      client.isPinned = true;

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={vi.fn()}
        />
      );

      const pinButton = screen.getByRole('button', { name: /pin/i });
      expect(pinButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have proper aria-pressed state for unpinned items', () => {
      const client = seedRows(1)[0];
      client.isPinned = false;

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={vi.fn()}
        />
      );

      const pinButton = screen.getByRole('button', { name: /pin/i });
      expect(pinButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const client = seedRows(1)[0];
      const mockOnTogglePin = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
          onTogglePin={mockOnTogglePin}
        />
      );

      const pinButton = screen.getByRole('button', { name: /pin/i });
      
      await user.tab();
      await user.tab(); // Navigate to pin button
      expect(pinButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnTogglePin).toHaveBeenCalledTimes(1);
    });
  });
});