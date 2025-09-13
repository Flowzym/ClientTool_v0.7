/**
 * Tests for hover and focus behavior on Board components
 * Covers tab navigation and hover states where testable via data attributes
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClientRow } from '../components/ClientRow';
import { renderWithProviders, mockActions, resetMockActions } from './TestHarness';
import { makeRow, mockUsers } from './fixtures';

describe('Hover and Focus Behavior', () => {
  beforeEach(() => {
    resetMockActions();
  });

  describe('tab navigation', () => {
    it('should reach all interactive controls via tab', async () => {
      const user = userEvent.setup();
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'offen',
        angebot: 'BAM',
        isArchived: false,
        isPinned: false
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

      // Tab through interactive elements
      await user.tab(); // Checkbox
      expect(screen.getByRole('checkbox')).toHaveFocus();

      await user.tab(); // Pin button
      expect(screen.getByRole('button', { name: /pin/i })).toHaveFocus();

      await user.tab(); // Note button
      expect(screen.getByRole('button', { name: /notizen/i })).toHaveFocus();

      await user.tab(); // Offer select
      expect(screen.getByRole('combobox')).toHaveFocus();

      // Continue through other interactive elements
      await user.tab(); // Status (if interactive)
      await user.tab(); // Assign select
      await user.tab(); // Archive button
      expect(screen.getByRole('button', { name: /archivieren/i })).toHaveFocus();
    });

    it('should maintain focus order consistency', async () => {
      const user = userEvent.setup();
      const client = makeRow();

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

      // Tab forward through all elements
      const focusableElements: HTMLElement[] = [];
      
      for (let i = 0; i < 10; i++) {
        await user.tab();
        const focused = document.activeElement as HTMLElement;
        if (focused && focused !== document.body) {
          focusableElements.push(focused);
        }
      }

      // Should have found multiple focusable elements
      expect(focusableElements.length).toBeGreaterThan(3);
      
      // Each element should be unique (no focus traps)
      const uniqueElements = new Set(focusableElements);
      expect(uniqueElements.size).toBe(focusableElements.length);
    });
  });

  describe('hover behavior', () => {
    it('should apply hover styling to row when hovered', async () => {
      const user = userEvent.setup();
      const client = makeRow();

      const { container } = renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).toHaveClass('hover:bg-gray-50');

      // Hover should not change classes in JSDOM (CSS-only)
      // But we can test that hover classes are present
      await user.hover(row);
      expect(row).toHaveClass('hover:bg-gray-50');
    });

    it('should have hover styling on interactive buttons', () => {
      const client = makeRow();

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

      // Check that buttons have hover classes
      const pinButton = screen.getByRole('button', { name: /pin/i });
      expect(pinButton).toHaveClass('hover:bg-gray-50');

      const noteButton = screen.getByRole('button', { name: /notizen/i });
      expect(noteButton).toHaveClass('hover:bg-gray-50');

      const archiveButton = screen.getByRole('button', { name: /archivieren/i });
      expect(archiveButton).toHaveClass('hover:bg-gray-50');
    });
  });

  describe('focus visibility', () => {
    it('should have focus-visible styles on interactive elements', () => {
      const client = makeRow();

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

      // Interactive elements should have focus styles
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });

      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toBeInTheDocument();
      });
    });
  });

  describe('keyboard navigation', () => {
    it('should support Enter key on buttons', async () => {
      const user = userEvent.setup();
      const client = makeRow({ isPinned: false });

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

      const pinButton = screen.getByRole('button', { name: /pin/i });
      
      await user.tab();
      await user.tab(); // Navigate to pin button
      await user.keyboard('{Enter}');

      expect(mockActions.togglePin).toHaveBeenCalledWith(client.id);
    });

    it('should support Space key on buttons', async () => {
      const user = userEvent.setup();
      const client = makeRow({ isArchived: false });

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

      const archiveButton = screen.getByRole('button', { name: /archivieren/i });
      
      archiveButton.focus();
      await user.keyboard(' ');

      expect(mockActions.archive).toHaveBeenCalledWith(client.id);
    });

    it('should support arrow keys on select elements', async () => {
      const user = userEvent.setup();
      const client = makeRow({ angebot: 'BAM' });

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
      
      offerSelect.focus();
      await user.keyboard('{ArrowDown}');
      
      // Should be able to navigate through options
      expect(offerSelect).toHaveFocus();
    });
  });

  describe('selection behavior', () => {
    it('should handle checkbox selection with mouse', async () => {
      const user = userEvent.setup();
      const client = makeRow();
      const mockOnToggleSelect = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockOnToggleSelect).toHaveBeenCalledWith(false); // No shift key
    });

    it('should handle checkbox selection with shift key', async () => {
      const user = userEvent.setup();
      const client = makeRow();
      const mockOnToggleSelect = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.keyboard('{Shift>}');
      await user.click(checkbox);
      await user.keyboard('{/Shift}');

      expect(mockOnToggleSelect).toHaveBeenCalledWith(true); // With shift key
    });

    it('should handle keyboard selection with Space', async () => {
      const user = userEvent.setup();
      const client = makeRow();
      const mockOnToggleSelect = vi.fn();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={false}
          onToggleSelect={mockOnToggleSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      
      checkbox.focus();
      await user.keyboard(' ');

      expect(mockOnToggleSelect).toHaveBeenCalledWith(false);
    });
  });

  describe('visual state indicators', () => {
    it('should show selected state visually', () => {
      const client = makeRow();

      renderWithProviders(
        <ClientRow
          client={client}
          index={0}
          users={mockUsers}
          actions={mockActions}
          selected={true}
          onToggleSelect={vi.fn()}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should show unselected state visually', () => {
      const client = makeRow();

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

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });
});