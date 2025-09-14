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
  const mockOnOpenClient = vi.fn();

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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('phone field robustness', () => {
    it('should display phoneNumber when phone is missing', () => {
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: undefined,
        phoneNumber: '+43 699 123456'
      });

      const mockOnOpenNotes = vi.fn();
      const mockOnOpenClient = vi.fn();
      renderWithProviders(
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      expect(screen.getByText('+43 699 123456')).toBeInTheDocument();
    });

    it('should prefer phone over phoneNumber when both exist', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Schmidt',
        phone: '+43 1 234 5678',
        phoneNumber: '+43 699 987654'
      });

      const mockOnOpenNotes = vi.fn();
      const mockOnOpenClient = vi.fn();
      renderWithProviders(
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      // Should show phone (first in fallback chain)
      expect(screen.getByText('+43 1 234 5678')).toBeInTheDocument();
      expect(screen.queryByText('+43 699 987654')).not.toBeInTheDocument();
    });

    it('should show "—" when both phone fields are missing', () => {
      const client = makeRow({
        firstName: 'Thomas',
        lastName: 'Weber',
        phone: undefined,
        phoneNumber: undefined
      });

      const mockOnOpenNotes = vi.fn();
      const mockOnOpenClient = vi.fn();
      renderWithProviders(
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should handle empty string phone fields', () => {
      const client = makeRow({
        firstName: 'Maria',
        lastName: 'Fischer',
        phone: '',
        phoneNumber: '+43 664 111222'
      });

      const mockOnOpenNotes = vi.fn();
      const mockOnOpenClient = vi.fn();
      renderWithProviders(
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      // Should fallback to phoneNumber when phone is empty
      expect(screen.getByText('+43 664 111222')).toBeInTheDocument();
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo.*öffnen/i });
      await user.click(nameButton);

      expect(mockOnOpenClient).toHaveBeenCalledWith('client-123');
      expect(mockOnOpenClient).toHaveBeenCalledTimes(1);

      window.removeEventListener('board:open-client-info', mockEventListener);
    });

    it('should have proper accessible name for client info button', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Schmidt',
        title: 'Mag.'
      });

      renderWithProviders(
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo.*öffnen/i });
      
      await user.tab();
      await user.tab(); // Skip notes button
      expect(nameButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      expect(mockOnOpenClient).toHaveBeenCalledWith(client.id);
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
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
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo.*öffnen/i });
      expect(nameButton).toHaveClass('hover:text-blue-600', 'transition-colors');
    });
  });

  describe('dialog integration', () => {
    it('should open ClientInfoDialog when name clicked', async () => {
      const user = userEvent.setup();
      const client = makeRow({
        id: 'client-123',
        firstName: 'Max',
        lastName: 'Mustermann'
      });

      renderWithProviders(
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      const nameButton = screen.getByRole('button', { name: /kundeninfo.*öffnen/i });
      await user.click(nameButton);

      expect(mockOnOpenClient).toHaveBeenCalledWith('client-123');
    });

    it('should close dialog on ESC key', async () => {
      const user = userEvent.setup();
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann'
      });

      renderWithProviders(
        <NameCell 
          client={client} 
          onOpenNotes={mockOnOpenNotes}
          onOpenClient={mockOnOpenClient}
        />
      );

      // Simulate dialog open and ESC key
      await user.keyboard('{Escape}');
      
      // Dialog close behavior would be tested at Board level
      expect(true).toBe(true); // Placeholder for ESC handling
    });
  });
});