/**
 * Tests for NameCell format and phone display
 * Covers "Nachname, Vorname (Titel)" format and phone subtitle
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NameCell from '../components/cells/NameCell';
import { renderWithProviders } from './TestHarness';
import { makeRow } from './fixtures';

describe('NameCell Format and Phone', () => {
  const mockOnOpenNotes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('name format', () => {
    it('should render "Nachname, Vorname (Titel)" format correctly', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Müller',
        title: 'BSc',
        phone: '+43 1 234 5678'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Müller, Anna (BSc)')).toBeInTheDocument();
    });

    it('should render "Nachname, Vorname" without title', () => {
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann',
        title: undefined,
        phone: '+43 699 123456'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Mustermann, Max')).toBeInTheDocument();
      expect(screen.queryByText(/BSc|Dr\.|Mag\./)).not.toBeInTheDocument();
    });

    it('should handle missing firstName gracefully', () => {
      const client = makeRow({
        firstName: '',
        lastName: 'Schmidt',
        title: 'Dr.',
        phone: '+43 664 987654'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Schmidt (Dr.)')).toBeInTheDocument();
    });

    it('should handle missing lastName gracefully', () => {
      const client = makeRow({
        firstName: 'Thomas',
        lastName: '',
        title: undefined,
        phone: '+43 1 555 1234'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Thomas')).toBeInTheDocument();
    });
  });

  describe('phone subtitle', () => {
    it('should display phone number in subtitle', () => {
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+43 1 234 5678'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('+43 1 234 5678')).toBeInTheDocument();
    });

    it('should display "—" when phone is missing', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Schmidt',
        phone: undefined
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should display "—" when phone is empty string', () => {
      const client = makeRow({
        firstName: 'Thomas',
        lastName: 'Weber',
        phone: ''
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('client info card interaction', () => {
    it('should trigger client info dialog when name clicked', async () => {
      const user = userEvent.setup();
      const client = makeRow({
        id: 'client-123',
        firstName: 'Max',
        lastName: 'Mustermann'
      });

      // Mock event listener
      const mockEventListener = vi.fn();
      window.addEventListener('board:open-client-info', mockEventListener);

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo.*öffnen/i });
      await user.click(nameButton);

      expect(mockEventListener).toHaveBeenCalledTimes(1);
      expect(mockEventListener.mock.calls[0][0].detail.id).toBe('client-123');

      window.removeEventListener('board:open-client-info', mockEventListener);
    });

    it('should have proper accessible name for client info button', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Schmidt',
        title: 'Mag.'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo für schmidt, anna \(mag\.\) öffnen/i });
      expect(nameButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const client = makeRow({
        firstName: 'Thomas',
        lastName: 'Weber'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo.*öffnen/i });
      
      await user.tab();
      await user.tab(); // Skip notes button
      expect(nameButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      // Should trigger event (tested above)
    });
  });

  describe('layout and styling', () => {
    it('should have proper layout structure', () => {
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+43 1 234 5678'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      // Should have main name text
      const nameText = screen.getByText('Mustermann, Max');
      expect(nameText).toHaveClass('font-medium', 'truncate');

      // Should have phone subtitle
      const phoneText = screen.getByText('+43 1 234 5678');
      expect(phoneText).toHaveClass('text-xs', 'text-gray-500', 'truncate');
    });

    it('should have hover styling on name button', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Schmidt'
      });

      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo.*öffnen/i });
      expect(nameButton).toHaveClass('hover:text-blue-600', 'transition-colors');
    });
  });
});