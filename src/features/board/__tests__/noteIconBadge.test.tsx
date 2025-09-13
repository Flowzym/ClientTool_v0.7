/**
 * Tests for Note Icon and Badge counting logic
 * Covers PencilLine icon, badge counting rules, and interaction
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NameCell from '../components/cells/NameCell';
import { renderWithProviders } from './TestHarness';
import { makeRowWithNotes } from './fixtures';

describe('NoteIconBadge', () => {
  const mockOnOpenNotes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PencilLine icon presence', () => {
    it('should render PencilLine icon', () => {
      const client = makeRowWithNotes({});

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      
      // Should contain SVG icon (PencilLine from Lucide)
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have proper ARIA label', () => {
      const client = makeRowWithNotes({});

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      expect(button).toHaveAttribute('title', 'Notizen öffnen');
    });
  });

  describe('badge counting rules', () => {
    it('should count notes from notes array (priority 1)', () => {
      const client = makeRowWithNotes({
        notesArray: ['Note 1', 'Note 2', 'Note 3'],
        contactLogNotes: [{ type: 'note', text: 'Should be ignored' }],
        noteText: 'Should also be ignored'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should show count from notes array only
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should count contactLog notes when notes array absent (priority 2)', () => {
      const client = makeRowWithNotes({
        contactLogNotes: [
          { type: 'note', text: 'Contact note 1' },
          { type: 'call', text: 'Not a note' },
          { kind: 'note', text: 'Contact note 2' },
          { type: 'email', text: 'Also not a note' }
        ],
        noteText: 'Should be ignored when contactLog has notes'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should count 2 note entries (type='note' and kind='note')
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should count single note text when arrays absent (priority 3)', () => {
      const client = makeRowWithNotes({
        noteText: 'Single note text'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should show count 1 for single note text
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show no badge when count is 0', () => {
      const client = makeRowWithNotes({
        noteText: '' // Empty note
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should not show any count badge
      expect(screen.queryByText(/[0-9]/)).not.toBeInTheDocument();
    });

    it('should ignore empty contactLog note entries', () => {
      const client = makeRowWithNotes({
        contactLogNotes: [
          { type: 'note', text: 'Valid note' },
          { type: 'note', text: '' }, // Empty text
          { type: 'note', text: '   ' }, // Whitespace only
          { kind: 'note', text: 'Another valid note' }
        ]
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should count only non-empty notes
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('visual state based on count', () => {
    it('should show muted icon when count is 0', () => {
      const client = makeRowWithNotes({});

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      
      // Should have muted styling
      expect(button).toHaveClass('text-gray-400');
    });

    it('should show active icon when count > 0', () => {
      const client = makeRowWithNotes({
        noteText: 'Has notes'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      
      // Should not have muted styling
      expect(button).not.toHaveClass('text-gray-400');
      expect(button).toHaveClass('text-gray-700');
    });
  });

  describe('badge positioning and styling', () => {
    it('should position badge correctly relative to icon', () => {
      const client = makeRowWithNotes({
        notesArray: ['Note 1', 'Note 2']
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const badge = screen.getByText('2');
      
      // Badge should have absolute positioning classes
      expect(badge).toHaveClass('absolute', '-top-1', '-right-1');
      expect(badge).toHaveClass('min-w-[16px]', 'h-[16px]');
    });

    it('should handle high note counts in badge', () => {
      const client = makeRowWithNotes({
        notesArray: Array.from({ length: 99 }, (_, i) => `Note ${i + 1}`)
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const badge = screen.getByText('99');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('text-[10px]');
    });
  });

  describe('interaction', () => {
    it('should trigger onOpenNotes when icon clicked', async () => {
      const user = userEvent.setup();
      const client = makeRowWithNotes({ noteText: 'Test note' });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      await user.click(button);

      expect(mockOnOpenNotes).toHaveBeenCalledWith(client.id);
      expect(mockOnOpenNotes).toHaveBeenCalledTimes(1);
    });

    it('should trigger onOpenNotes when badge clicked', async () => {
      const user = userEvent.setup();
      const client = makeRowWithNotes({
        notesArray: ['Note 1', 'Note 2']
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Click on the badge area (part of the button)
      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      await user.click(button);

      expect(mockOnOpenNotes).toHaveBeenCalledWith(client.id);
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const client = makeRowWithNotes({ noteText: 'Test' });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      
      await user.tab();
      // Note: might need multiple tabs depending on DOM structure
      if (!button.matches(':focus')) {
        await user.tab();
      }
      
      await user.keyboard('{Enter}');

      expect(mockOnOpenNotes).toHaveBeenCalledWith(client.id);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed contactLog entries', () => {
      const client = makeRowWithNotes({
        contactLogNotes: [
          { type: 'note', text: 'Valid note' },
          { type: null as any, text: 'Invalid type' },
          { type: 'note', text: null as any }, // Invalid text
          undefined as any, // Invalid entry
          { kind: 'note', text: 'Valid kind note' }
        ]
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should count only valid entries
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should handle very high note counts', () => {
      const client = makeRowWithNotes({
        notesArray: Array.from({ length: 999 }, (_, i) => `Note ${i + 1}`)
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should handle missing client gracefully', () => {
      expect(() => {
        renderWithProviders(
          <NameCell client={null as any} onOpenNotes={mockOnOpenNotes} />
        );
      }).not.toThrow();
    });
  });
});