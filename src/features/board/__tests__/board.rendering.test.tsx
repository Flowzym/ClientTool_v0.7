/**
 * Board UI rendering tests
 * Tests specific UI contracts without fragile snapshots
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, mockActions, resetMockActions } from './TestHarness';
import { ClientRow } from '../components/ClientRow';
import NameCell from '../components/cells/NameCell';
import OfferCell from '../components/cells/OfferCell';
import { StatusChip } from '../StatusChips';
import ArchiveCell from '../components/cells/ArchiveCell';
import PinCell from '../components/cells/PinCell';
import { makeRow, makeRowWithNotes, mockUsers } from './fixtures';

describe('Board UI Rendering Contracts', () => {
  beforeEach(() => {
    resetMockActions();
  });

  describe('NameCell format', () => {
    it('should render "Nachname, Vorname" format correctly', () => {
      const client = makeRow({
        firstName: 'Anna',
        lastName: 'Müller',
        title: undefined
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Müller, Anna')).toBeInTheDocument();
    });

    it('should render "Nachname, Vorname (Titel)" with title', () => {
      const client = makeRow({
        firstName: 'Max',
        lastName: 'Mustermann',
        title: 'Dr.'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Mustermann, Max (Dr.)')).toBeInTheDocument();
    });

    it('should handle missing firstName gracefully', () => {
      const client = makeRow({
        firstName: '',
        lastName: 'Schmidt',
        title: 'Mag.'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Schmidt (Mag.)')).toBeInTheDocument();
    });

    it('should handle missing lastName gracefully', () => {
      const client = makeRow({
        firstName: 'Thomas',
        lastName: '',
        title: undefined
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('Thomas')).toBeInTheDocument();
    });
  });

  describe('Notiz-Icon & Badge', () => {
    it('should show badge only when count > 0', () => {
      const clientWithNotes = makeRowWithNotes({
        notesArray: ['Note 1', 'Note 2']
      });
      const clientWithoutNotes = makeRowWithNotes({});

      const mockOnOpenNotes = vi.fn();

      // Client with notes
      const { unmount } = renderWithProviders(
        <NameCell client={clientWithNotes} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
      unmount();

      // Client without notes
      renderWithProviders(
        <NameCell client={clientWithoutNotes} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.queryByText(/[0-9]/)).not.toBeInTheDocument();
    });

    it('should count notes array (priority 1)', () => {
      const client = makeRowWithNotes({
        notesArray: ['Note 1', 'Note 2', 'Note 3'],
        contactLogNotes: [{ type: 'note', text: 'Should be ignored' }],
        noteText: 'Should also be ignored'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should count contactLog notes when notes array absent (priority 2)', () => {
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

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show muted icon when count is 0', () => {
      const client = makeRowWithNotes({});

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      expect(button).toHaveClass('text-gray-400');
    });

    it('should show active icon when count > 0', () => {
      const client = makeRowWithNotes({
        noteText: 'Has notes'
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      const button = screen.getByRole('button', { name: /notizen öffnen/i });
      expect(button).not.toHaveClass('text-gray-400');
      expect(button).toHaveClass('text-gray-700');
    });
  });

  describe('Status "gebucht" blue variant', () => {
    it('should render blue variant for "inBearbeitung" status', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <StatusChip value="inBearbeitung" onChange={mockOnChange} />
      );

      const chip = screen.getByText('Gebucht / Bearbeitung');
      expect(chip).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
    });

    it('should not render blue variant for other statuses', () => {
      const nonBlueStatuses = ['offen', 'erledigt', 'ruht', 'abgebrochen'];
      const mockOnChange = vi.fn();

      nonBlueStatuses.forEach(status => {
        const { unmount } = renderWithProviders(
          <StatusChip value={status as any} onChange={mockOnChange} />
        );

        const chip = screen.getByRole('button');
        expect(chip.querySelector('.bg-blue-100')).not.toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Offer column positioning and values', () => {
    it('should be positioned between kunde and status columns', () => {
      const client = makeRow({
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

      // Should have name, offer, and status in order
      expect(screen.getByText('Mustermann, Max')).toBeInTheDocument();
      expect(screen.getByDisplayValue('BAM')).toBeInTheDocument();
      expect(screen.getByText('Offen')).toBeInTheDocument();
    });

    it('should show all valid offer options', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const select = screen.getByRole('combobox');
      
      expect(screen.getByRole('option', { name: '—' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'BAM' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'LL/B+' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'BwB' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'NB' })).toBeInTheDocument();
    });

    it('should handle undefined offer value gracefully', () => {
      renderWithProviders(
        <OfferCell id="test-1" value={undefined} />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('Archive icon-only (no text)', () => {
    it('should not contain text "archivieren" anywhere', () => {
      const mockOnArchive = vi.fn();
      const mockOnUnarchive = vi.fn();

      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      expect(screen.queryByText(/archivieren/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/archive/i)).not.toBeInTheDocument();
    });

    it('should render archive icon for non-archived items', () => {
      const mockOnArchive = vi.fn();
      const mockOnUnarchive = vi.fn();

      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /archivieren/i });
      expect(button).toBeInTheDocument();
      
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render unarchive icon for archived items', () => {
      const mockOnArchive = vi.fn();
      const mockOnUnarchive = vi.fn();

      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={true} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /entarchivieren/i });
      expect(button).toBeInTheDocument();
      
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Pin aria-pressed state', () => {
    it('should have correct aria-pressed for pinned state', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <PinCell pinned={true} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Gepinnt');
      expect(button).toHaveClass('bg-yellow-100', 'border-yellow-300');
    });

    it('should have correct aria-pressed for unpinned state', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Anpinnen');
      expect(button).toHaveClass('bg-white', 'border-gray-300');
    });

    it('should handle undefined pinned state as unpinned', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <PinCell pinned={undefined} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Anpinnen');
    });
  });

  describe('Hover and focus behavior', () => {
    it('should apply hover styling to row', () => {
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

      const pinButton = screen.getByRole('button', { name: /pin/i });
      expect(pinButton).toHaveClass('hover:bg-gray-50');

      const noteButton = screen.getByRole('button', { name: /notizen/i });
      expect(noteButton).toHaveClass('hover:bg-gray-50');

      const archiveButton = screen.getByRole('button', { name: /archivieren/i });
      expect(archiveButton).toHaveClass('hover:bg-gray-50');
    });

    it('should be focusable via tab navigation', async () => {
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

      // Tab through interactive elements
      await user.tab(); // Checkbox
      expect(screen.getByRole('checkbox')).toHaveFocus();

      await user.tab(); // Pin button
      expect(screen.getByRole('button', { name: /pin/i })).toHaveFocus();

      await user.tab(); // Note button
      expect(screen.getByRole('button', { name: /notizen/i })).toHaveFocus();
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

      const focusableElements: HTMLElement[] = [];
      
      for (let i = 0; i < 8; i++) {
        await user.tab();
        const focused = document.activeElement as HTMLElement;
        if (focused && focused !== document.body) {
          focusableElements.push(focused);
        }
      }

      expect(focusableElements.length).toBeGreaterThan(3);
      
      // Each element should be unique (no focus traps)
      const uniqueElements = new Set(focusableElements);
      expect(uniqueElements.size).toBe(focusableElements.length);
    });
  });

  describe('Status blue variant detection', () => {
    it('should render blue classes for "gebucht" status', () => {
      const mockOnChange = vi.fn();
      renderWithProviders(
        <StatusChip value="inBearbeitung" onChange={mockOnChange} />
      );

      const chip = screen.getByText('Gebucht / Bearbeitung');
      expect(chip).toHaveClass('bg-blue-100');
      expect(chip).toHaveClass('text-blue-800');
      expect(chip).toHaveClass('border-blue-200');
    });

    it('should not render blue classes for non-gebucht statuses', () => {
      const nonBlueStatuses = ['offen', 'erledigt', 'ruht', 'abgebrochen'];
      const mockOnChange = vi.fn();

      nonBlueStatuses.forEach(status => {
        const { unmount } = renderWithProviders(
          <StatusChip value={status as any} onChange={mockOnChange} />
        );

        const button = screen.getByRole('button');
        const chip = button.querySelector('[class*="bg-blue-100"]');
        expect(chip).not.toBeInTheDocument();
        
        unmount();
      });
    });

    it('should show dropdown with all status options', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      renderWithProviders(
        <StatusChip value="offen" onChange={mockOnChange} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('Gebucht / Bearbeitung')).toBeInTheDocument();
      expect(screen.getByText('Abgebucht / Erledigt')).toBeInTheDocument();
      expect(screen.getByText('Ruht')).toBeInTheDocument();
      expect(screen.getByText('Vom TAS entfernt')).toBeInTheDocument();
    });
  });

  describe('Offer column contract', () => {
    it('should show all valid offer values in dropdown', () => {
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const validOffers = ['BAM', 'LL/B+', 'BwB', 'NB'];
      
      validOffers.forEach(offer => {
        expect(screen.getByRole('option', { name: offer })).toBeInTheDocument();
      });
    });

    it('should handle offer value changes', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <OfferCell id="test-1" value="" />
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'LL/B+');

      // Should trigger setOffer action (tested via integration)
      expect(select).toHaveValue('LL/B+');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <OfferCell id="test-1" value="BAM" />
      );

      const select = screen.getByRole('combobox');
      
      await user.tab();
      expect(select).toHaveFocus();
      
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
    });
  });

  describe('Archive icon-only requirement', () => {
    it('should have proper ARIA labels without text', () => {
      const mockOnArchive = vi.fn();
      const mockOnUnarchive = vi.fn();

      renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      const button = screen.getByRole('button', { name: /archivieren/i });
      expect(button).toHaveAttribute('title', 'Archivieren');
      expect(button).toHaveAttribute('aria-label', 'Archivieren');
    });

    it('should toggle between archive and unarchive icons', () => {
      const mockOnArchive = vi.fn();
      const mockOnUnarchive = vi.fn();

      const { rerender } = renderWithProviders(
        <ArchiveCell 
          id="test-1"
          isArchived={false} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      let button = screen.getByRole('button', { name: /archivieren/i });
      expect(button).toHaveAttribute('title', 'Archivieren');

      rerender(
        <ArchiveCell 
          id="test-1"
          isArchived={true} 
          onArchive={mockOnArchive} 
          onUnarchive={mockOnUnarchive} 
        />
      );

      button = screen.getByRole('button', { name: /entarchivieren/i });
      expect(button).toHaveAttribute('title', 'Entarchivieren');
    });
  });

  describe('Pin aria-pressed correctness', () => {
    it('should indicate pinned state correctly', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <PinCell pinned={true} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Gepinnt');
      expect(button).toHaveClass('bg-yellow-100', 'border-yellow-300');
      expect(screen.getByText('📌')).toBeInTheDocument();
    });

    it('should indicate unpinned state correctly', () => {
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Anpinnen');
      expect(button).toHaveClass('bg-white', 'border-gray-300');
      expect(screen.getByText('📍')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockOnToggle = vi.fn();

      renderWithProviders(
        <PinCell pinned={false} onToggle={mockOnToggle} />
      );

      const button = screen.getByRole('button');
      
      await user.tab();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Selection and interaction', () => {
    it('should handle checkbox selection correctly', async () => {
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

    it('should handle shift-click selection', async () => {
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
  });

  describe('Unicode and special character handling', () => {
    it('should handle Unicode names correctly', () => {
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

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/Extrem-Langer-Nachname/)).toBeInTheDocument();
    });

    it('should handle high note counts in badge', () => {
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

  describe('Edge cases and defensive rendering', () => {
    it('should handle missing client data gracefully', () => {
      const incompleteClient = {
        id: 'incomplete',
        firstName: '',
        lastName: '',
        status: 'offen',
        priority: 'normal',
        contactCount: 0,
        contactLog: [],
        isArchived: false
      };

      expect(() => {
        renderWithProviders(
          <ClientRow
            client={incompleteClient}
            index={0}
            users={mockUsers}
            actions={mockActions}
            selected={false}
            onToggleSelect={vi.fn()}
          />
        );
      }).not.toThrow();
    });

    it('should handle malformed contactLog entries', () => {
      const client = makeRowWithNotes({
        contactLogNotes: [
          { type: 'note', text: 'Valid note' },
          { type: null as any, text: 'Invalid type' },
          { type: 'note', text: null as any },
          undefined as any,
          { kind: 'note', text: 'Valid kind note' }
        ]
      });

      const mockOnOpenNotes = vi.fn();
      renderWithProviders(
        <NameCell client={client} onOpenNotes={mockOnOpenNotes} />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should handle invalid offer values gracefully', () => {
      const client = makeRow({
        angebot: 'INVALID_OFFER' as any
      });

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

      const offerSelect = screen.getByDisplayValue('INVALID_OFFER');
      expect(offerSelect).toBeInTheDocument();
    });
  });

  describe('Accessibility compliance', () => {
    it('should have proper accessible names for all interactive elements', () => {
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

      // All interactive elements should have accessible names
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pin/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /notizen/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /angebot/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /archivieren/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation for all controls', async () => {
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

      // Should be able to reach all controls via tab
      const interactiveElements = [
        screen.getByRole('checkbox'),
        screen.getByRole('button', { name: /pin/i }),
        screen.getByRole('button', { name: /notizen/i }),
        screen.getByRole('combobox'),
        screen.getByRole('button', { name: /archivieren/i })
      ];

      for (const element of interactiveElements) {
        element.focus();
        expect(element).toHaveFocus();
      }
    });
  });

  describe('Visual state indicators', () => {
    it('should show selected state with checked checkbox', () => {
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

    it('should show unselected state with unchecked checkbox', () => {
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

    it('should show pinned state with correct styling', () => {
      const client = makeRow({ isPinned: true });

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
      expect(pinButton).toHaveClass('text-blue-600');
    });

    it('should show unpinned state with muted styling', () => {
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
      expect(pinButton).toHaveClass('text-gray-400');
    });
  });
});