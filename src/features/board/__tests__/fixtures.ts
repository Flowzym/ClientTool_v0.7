/**
 * Test fixtures for Board component testing
 * Provides realistic client data with sensible defaults
 */

import type { Client, User } from '../../../domain/models';

export function makeRow(overrides: Partial<Client> = {}): Client {
  return {
    id: 'test-client-1',
    amsId: 'A12345',
    firstName: 'Max',
    lastName: 'Mustermann',
    title: undefined,
    birthDate: '1985-03-15',
    phone: '+43 1 234 5678',
    email: 'max.mustermann@example.com',
    address: 'Teststraße 123, 1010 Wien',
    zip: '1010',
    city: 'Wien',
    gender: 'M',
    svNumber: '1234567890',
    countryCode: 'AT',
    areaCode: '01',
    phoneNumber: '2345678',
    amsBookingDate: '2024-01-15T08:00:00Z',
    entryDate: '2024-01-10T00:00:00Z',
    exitDate: undefined,
    amsAgentLastName: 'Berater',
    amsAgentFirstName: 'Max',
    note: 'Testklient für Unit-Tests',
    internalCode: 'TEST-001',
    assignedTo: 'user-1',
    priority: 'normal',
    status: 'offen',
    result: undefined,
    angebot: 'BAM',
    followUp: undefined,
    lastActivity: '2024-01-15T10:30:00Z',
    contactCount: 0,
    contactLog: [],
    isArchived: false,
    archivedAt: undefined,
    sourceId: 'test-source',
    rowKey: 'test-row-key',
    sourceRowHash: 'test-hash',
    lastImportedAt: '2024-01-15T08:00:00Z',
    lastSeenInSourceAt: '2024-01-15T08:00:00Z',
    protectedFields: [],
    isPinned: false,
    pinnedAt: undefined,
    amsAdvisor: undefined,
    source: {
      fileName: 'test.xlsx',
      importedAt: '2024-01-15T08:00:00Z',
      mappingPreset: 'test'
    },
    ...overrides
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Test User',
    role: 'editor',
    active: true,
    avatar: undefined,
    initials: 'TU',
    ...overrides
  };
}

export function seedRows(count: number, overrides: Partial<Client> = {}): Client[] {
  return Array.from({ length: count }, (_, i) => 
    makeRow({
      id: `test-client-${i + 1}`,
      amsId: `A${String(12345 + i).padStart(5, '0')}`,
      firstName: ['Max', 'Anna', 'Thomas', 'Maria', 'Peter'][i % 5],
      lastName: ['Mustermann', 'Schmidt', 'Weber', 'Fischer', 'Bauer'][i % 5],
      status: ['offen', 'inBearbeitung', 'terminVereinbart', 'erledigt'][i % 4] as any,
      priority: ['niedrig', 'normal', 'hoch', 'dringend'][i % 4] as any,
      angebot: ['BAM', 'LL/B+', 'BwB', 'NB'][i % 4] as any,
      isPinned: i % 3 === 0,
      isArchived: i % 5 === 4,
      contactCount: i % 3,
      ...overrides
    })
  );
}

export function makeRowWithNotes(noteConfig: {
  notesArray?: string[];
  contactLogNotes?: Array<{ type: string; text: string }>;
  noteText?: string;
}): Client {
  const base = makeRow();
  
  if (noteConfig.notesArray) {
    (base as any).notes = noteConfig.notesArray;
  }
  
  if (noteConfig.contactLogNotes) {
    base.contactLog = noteConfig.contactLogNotes.map((note, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      channel: 'telefon' as const,
      note: note.text,
      ...note
    }));
  }
  
  if (noteConfig.noteText) {
    base.note = noteConfig.noteText;
  }
  
  return base;
}

export const mockUsers: User[] = [
  makeUser({ id: 'admin@local', name: 'Admin (Demo)', role: 'admin' }),
  makeUser({ id: 'editor@local', name: 'Editor (Demo)', role: 'editor' }),
  makeUser({ id: 'user@local', name: 'User (Demo)', role: 'user' })
];