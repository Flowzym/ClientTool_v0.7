/**
 * Tests für NameCell Notiz-Badge-Logik
 */

import { describe, it, expect } from 'vitest';

// Mock der countNotes-Funktion aus NameCell
function countNotes(client: any): number {
  // 1) notes array
  if (Array.isArray(client?.notes)) return client.notes.length;
  // 2) contactLog entries with type/kind === 'note'
  if (Array.isArray(client?.contactLog)) {
    const n = client.contactLog.filter((e:any) => (e?.type === 'note' || e?.kind === 'note')).length;
    if (n > 0) return n;
  }
  // 3) fallback: note text
  if (client?.note && String(client.note).trim().length > 0) return 1;
  return 0;
}

describe('NameCell Notiz-Badge', () => {
  it('should count notes array correctly', () => {
    const client = {
      notes: ['Notiz 1', 'Notiz 2', 'Notiz 3']
    };
    
    expect(countNotes(client)).toBe(3);
  });

  it('should count contactLog note entries', () => {
    const client = {
      contactLog: [
        { type: 'note', text: 'Kontakt-Notiz' },
        { type: 'call', text: 'Anruf' },
        { kind: 'note', text: 'Weitere Notiz' }
      ]
    };
    
    expect(countNotes(client)).toBe(2);
  });

  it('should fallback to note text field', () => {
    const client = {
      note: 'Einzelne Notiz'
    };
    
    expect(countNotes(client)).toBe(1);
  });

  it('should return 0 for empty note', () => {
    const client = {
      note: ''
    };
    
    expect(countNotes(client)).toBe(0);
  });

  it('should return 0 for no notes', () => {
    const client = {};
    
    expect(countNotes(client)).toBe(0);
  });

  it('should prioritize notes array over other sources', () => {
    const client: any = {
      notes: ['Array-Notiz'],
      contactLog: [{ type: 'note', text: 'Log-Notiz' }],
      note: 'Text-Notiz'
    };
    
    expect(countNotes(client)).toBe(1); // notes array wins
  });
});