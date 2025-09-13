/**
 * Tests for existing CSV utilities in board utils
 * Tests the current implementation without changes
 */

import { describe, it, expect } from 'vitest';
import { 
  formatDDMMYYYYFromISO, 
  escapeCsv, 
  toCsv, 
  CSV_LABELS, 
  CSV_TRANSFORMS,
  type ToCsvOpts 
} from './csv';

describe('Board CSV Utils', () => {
  describe('formatDDMMYYYYFromISO', () => {
    it('should format ISO dates to DD.MM.YYYY', () => {
      expect(formatDDMMYYYYFromISO('2024-01-15T10:30:00Z')).toBe('15.01.2024');
      expect(formatDDMMYYYYFromISO('2024-12-31T23:59:59Z')).toBe('31.12.2024');
      expect(formatDDMMYYYYFromISO('2024-02-29T00:00:00Z')).toBe('29.02.2024'); // Leap year
    });

    it('should handle invalid dates gracefully', () => {
      expect(formatDDMMYYYYFromISO('invalid-date')).toBe('invalid-date');
      expect(formatDDMMYYYYFromISO('')).toBe('');
      expect(formatDDMMYYYYFromISO('2024-13-45')).toBe('2024-13-45'); // Invalid but returned as-is
    });

    it('should handle date-only ISO strings', () => {
      expect(formatDDMMYYYYFromISO('2024-01-15')).toBe('15.01.2024');
    });
  });

  describe('escapeCsv', () => {
    it('should escape values containing comma', () => {
      expect(escapeCsv('Smith, John')).toBe('"Smith, John"');
      expect(escapeCsv('Normal text')).toBe('Normal text');
    });

    it('should escape values containing semicolon', () => {
      expect(escapeCsv('Text; with semicolon')).toBe('"Text; with semicolon"');
    });

    it('should escape values containing newlines', () => {
      expect(escapeCsv('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('should escape and double quotes', () => {
      expect(escapeCsv('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it('should handle null and undefined', () => {
      expect(escapeCsv(null)).toBe('');
      expect(escapeCsv(undefined)).toBe('');
    });

    it('should handle other data types', () => {
      expect(escapeCsv(42)).toBe('42');
      expect(escapeCsv(true)).toBe('true');
      expect(escapeCsv(false)).toBe('false');
    });
  });

  describe('toCsv', () => {
    const sampleRows = [
      { firstName: 'Max', lastName: 'Mustermann', isPinned: true, followUp: '2024-12-25T10:00:00Z' },
      { firstName: 'Anna', lastName: 'Schmidt', isPinned: false, followUp: null }
    ];

    const sampleFields = ['firstName', 'lastName', 'isPinned', 'followUp'];

    it('should create CSV with default options', () => {
      const csv = toCsv(sampleRows, sampleFields);
      
      const lines = csv.split('\n');
      expect(lines[0]).toBe('firstName,lastName,isPinned,followUp');
      expect(lines[1]).toBe('Max,Mustermann,Ja,25.12.2024');
      expect(lines[2]).toBe('Anna,Schmidt,Nein,');
    });

    it('should use custom labels when provided', () => {
      const opts: ToCsvOpts = {
        labels: { firstName: 'Vorname', lastName: 'Nachname' }
      };
      
      const csv = toCsv(sampleRows, sampleFields, opts);
      
      expect(csv).toContain('Vorname,Nachname,isPinned,followUp');
    });

    it('should apply custom transforms', () => {
      const opts: ToCsvOpts = {
        transforms: { 
          firstName: (name: string) => name.toUpperCase(),
          isPinned: (pinned: boolean) => pinned ? 'YES' : 'NO'
        }
      };
      
      const csv = toCsv(sampleRows, sampleFields, opts);
      
      expect(csv).toContain('MAX,Mustermann,YES');
      expect(csv).toContain('ANNA,Schmidt,NO');
    });

    it('should use semicolon separator when specified', () => {
      const opts: ToCsvOpts = { sep: ';' };
      const csv = toCsv(sampleRows, sampleFields, opts);
      
      expect(csv).toContain('firstName;lastName;isPinned;followUp');
      expect(csv).toContain('Max;Mustermann;Ja;25.12.2024');
    });

    it('should include BOM when withBOM is true', () => {
      const opts: ToCsvOpts = { withBOM: true };
      const csv = toCsv(sampleRows, sampleFields, opts);
      
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      expect(csv.substring(1)).toContain('firstName,lastName');
    });

    it('should not include BOM when withBOM is false', () => {
      const opts: ToCsvOpts = { withBOM: false };
      const csv = toCsv(sampleRows, sampleFields, opts);
      
      expect(csv.charCodeAt(0)).not.toBe(0xFEFF);
      expect(csv.startsWith('firstName')).toBe(true);
    });

    it('should apply CSV_TRANSFORMS correctly', () => {
      const rowsWithTransformableFields = [
        { isPinned: true, isArchived: false, followUp: '2024-01-15T10:30:00Z' },
        { isPinned: false, isArchived: true, followUp: null }
      ];
      
      const fields = ['isPinned', 'isArchived', 'followUp'];
      const opts: ToCsvOpts = { transforms: CSV_TRANSFORMS };
      
      const csv = toCsv(rowsWithTransformableFields, fields, opts);
      
      expect(csv).toContain('Ja,Nein,15.01.2024');
      expect(csv).toContain('Nein,Ja,');
    });

    it('should handle array values correctly', () => {
      const rowsWithArrays = [
        { name: 'Test', tags: ['tag1', 'tag2', 'tag3'] },
        { name: 'Another', tags: [] }
      ];
      
      const fields = ['name', 'tags'];
      const csv = toCsv(rowsWithArrays, fields);
      
      expect(csv).toContain('Test,"tag1, tag2, tag3"');
      expect(csv).toContain('Another,');
    });

    it('should handle ISO date detection and formatting', () => {
      const rowsWithDates = [
        { 
          name: 'Test',
          created: '2024-01-15T10:30:00Z',
          updated: '2024-02-20T14:45:00Z',
          notADate: 'regular-text-2024-01-15'
        }
      ];
      
      const fields = ['name', 'created', 'updated', 'notADate'];
      const csv = toCsv(rowsWithDates, fields);
      
      expect(csv).toContain('15.01.2024'); // created formatted
      expect(csv).toContain('20.02.2024'); // updated formatted
      expect(csv).toContain('regular-text-2024-01-15'); // not formatted (doesn't match ISO pattern)
    });
  });

  describe('CSV_LABELS and CSV_TRANSFORMS integration', () => {
    it('should use predefined labels correctly', () => {
      const clientData = [
        { firstName: 'Max', lastName: 'Mustermann', isPinned: true }
      ];
      
      const fields = ['firstName', 'lastName', 'isPinned'];
      const opts: ToCsvOpts = { labels: CSV_LABELS };
      
      const csv = toCsv(clientData, fields, opts);
      
      expect(csv).toContain('Vorname,Nachname,Gepinnt');
    });

    it('should apply predefined transforms correctly', () => {
      const clientData = [
        { 
          isPinned: true, 
          isArchived: false,
          followUp: '2024-12-25T10:00:00Z',
          amsBookingDate: '2024-01-15T08:00:00Z'
        }
      ];
      
      const fields = ['isPinned', 'isArchived', 'followUp', 'amsBookingDate'];
      const opts: ToCsvOpts = { transforms: CSV_TRANSFORMS };
      
      const csv = toCsv(clientData, fields, opts);
      
      expect(csv).toContain('Ja,Nein,25.12.2024,15.01.2024');
    });
  });
});