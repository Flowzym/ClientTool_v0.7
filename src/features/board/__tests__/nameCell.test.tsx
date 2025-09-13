/**
 * Tests for NameCell component
 * Covers name formatting, note icon, badge counting, and accessibility
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NameCell from '../components/cells/NameCell';
import { renderWithProviders, resetMockActions } from './TestHarness';
import { makeRow, makeRowWithNotes } from './fixtures';

describe('NameCell', () => {
  beforeEach(() => {
    resetMockActions();
  });

  describe('name formatting', () => {
    it('should render "Nachname, Vorname (Titel)" format correctly', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Müller',
        title: 'BSc'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Müller, Anna (BSc)')).toBeInTheDocument();
    });

    it('should render without title when title is missing', () => {
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann',
        title: undefined
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Mustermann, Max')).toBeInTheDocument();
      expect(screen.queryByText(/BSc|Dr\.|Mag\./)).not.toBeInTheDocument();
    });

    it('should handle missing firstName gracefully', () => {
      const client = makeRow({
        firstName: '',
        lastName: 'Müller',
        title: 'Dr.'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Müller (Dr.)')).toBeInTheDocument();
    });

    it('should handle missing lastName gracefully', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: '',
        title: undefined
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Anna')).toBeInTheDocument();
    });

    it('should handle Unicode characters correctly', () => {
      const client = makeRow({
        firstName: 'François',
        lastName: 'Müller-Österreich',
        title: 'Mag.'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Müller-Österreich, François (Mag.)')).toBeInTheDocument();
    });
  });

  describe('note icon and badge', () => {
    it('should render PencilLine icon with accessible label', () => {
      const client = makeRow();
      const mockOnOpenNotes = vi.fn();

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const noteButton = screen.getByRole('button', { name: /notizen öffnen/i });
      expect(noteButton).toBeInTheDocument();
    });

    it('should count notes from notes array (priority 1)', () => {
      const client = makeRowWithNotes({
        notesArray: ['Notiz 1', 'Notiz 2', 'Notiz 3'],
        contactLogNotes: [{ type: 'note', text: 'Should be ignored' }],
        noteText: 'Should also be ignored'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should show count from notes array
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should count notes from contactLog when notes array absent (priority 2)', () => {
      const client = makeRowWithNotes({
        contactLogNotes: [
          { type: 'note', text: 'Contact note 1' },
          { type: 'call', text: 'Not a note' },
          { kind: 'note', text: 'Contact note 2' }
        ],
        noteText: 'Should be ignored'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should count 2 note entries from contactLog
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should count single note text when arrays absent (priority 3)', () => {
      const client = makeRowWithNotes({
        noteText: 'Single note text'
      });

      const mockOnOpenNotes = vi.fn();
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

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should not show any count badge
      expect(screen.queryByText(/[0-9]/)).not.toBeInTheDocument();
    });

    it('should show muted icon when no notes (count=0)', () => {
      const client = makeRowWithNotes({});

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const noteButton = screen.getByRole('button', { name: /notizen öffnen/i });
      
      // Check for muted styling (current implementation uses text-gray-400)
      expect(noteButton).toHaveClass('text-gray-400');
    });

    it('should show active icon when notes exist', () => {
      const client = makeRowWithNotes({
        noteText: 'Has notes'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const noteButton = screen.getByRole('button', { name: /notizen öffnen/i });
      
      // Should not have muted styling
      expect(noteButton).not.toHaveClass('text-gray-400');
      expect(noteButton).toHaveClass('text-gray-700');
    });

    it('should trigger onOpenNotes callback when clicked', async () => {
      const user = userEvent.setup();
      const client = makeRow();
      const mockOnOpenNotes = vi.fn();

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const noteButton = screen.getByRole('button', { name: /notizen öffnen/i });
      await user.click(noteButton);

      expect(mockOnOpenNotes).toHaveBeenCalledWith(client.id);
      expect(mockOnOpenNotes).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should be focusable via tab navigation', async () => {
      const user = userEvent.setup();
      const client = makeRow();
      const mockOnOpenNotes = vi.fn();

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const noteButton = screen.getByRole('button', { name: /notizen öffnen/i });
      
      await user.tab();
      expect(noteButton).toHaveFocus();
    });

    it('should have proper accessible name for screen readers', () => {
      const client = makeRow();
      const mockOnOpenNotes = vi.fn();

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const noteButton = screen.getByRole('button', { name: /notizen öffnen/i });
      expect(noteButton).toHaveAttribute('title', 'Notizen öffnen');
    });
  });

  describe('edge cases', () => {
    it('should handle client with all name fields empty', () => {
      const client = makeRow({
        firstName: '',
        lastName: '',
        title: undefined
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should render empty name gracefully
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle very long names without breaking layout', () => {
      const client = makeRow({
        firstName: 'Sehr-Langer-Vorname-Mit-Vielen-Bindestrichen',
        lastName: 'Extrem-Langer-Nachname-Der-Die-Zelle-Sprengen-Könnte',
        title: 'Dr. Dr. h.c. mult.'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should render without errors
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/Extrem-Langer-Nachname/)).toBeInTheDocument();
    });

    it('should handle high note counts correctly', () => {
      const client = makeRowWithNotes({
        notesArray: Array.from({ length: 99 }, (_, i) => `Note ${i + 1}`)
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });
});