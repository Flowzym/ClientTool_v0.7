/**
 * Tests for CSV export utilities
 * Covers BOM, separators, escaping, Unicode, injection guards
 */

import { describe, it, expect } from 'vitest';
import {
  buildCsvHeader,
  serializeRow,
  joinCsv,
  escapeCsvValue,
  arrayToCsv,
  defaultCsvOptions,
  type ColumnSpec,
  type CsvOptions
} from '../csvUtils';

describe('CSV Export Utilities', () => {
  const sampleColumns: ColumnSpec[] = [
    { key: 'firstName', label: 'Vorname' },
    { key: 'lastName', label: 'Nachname' },
    { key: 'email', label: 'E-Mail' },
    { key: 'status', label: 'Status' }
  ];

  const sampleData = [
    { firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', status: 'offen' },
    { firstName: 'Anna', lastName: 'Schmidt', email: 'anna@test.at', status: 'inBearbeitung' }
  ];

  describe('buildCsvHeader', () => {
    it('should build header with comma separator', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',' };
      const header = buildCsvHeader(sampleColumns, opts);
      
      expect(header).toBe('Vorname,Nachname,E-Mail,Status');
    });

    it('should build header with semicolon separator', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ';' };
      const header = buildCsvHeader(sampleColumns, opts);
      
      expect(header).toBe('Vorname;Nachname;E-Mail;Status');
    });

    it('should use key as label when label is missing', () => {
      const columnsWithoutLabels: ColumnSpec[] = [
        { key: 'firstName' },
        { key: 'lastName' }
      ];
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',' };
      const header = buildCsvHeader(columnsWithoutLabels, opts);
      
      expect(header).toBe('firstName,lastName');
    });

    it('should escape header labels that contain separator', () => {
      const columnsWithSpecialLabels: ColumnSpec[] = [
        { key: 'name', label: 'Name, Full' },
        { key: 'address', label: 'Address; Complete' }
      ];
      
      const commaOpts: CsvOptions = { ...defaultCsvOptions, separator: ',' };
      const commaHeader = buildCsvHeader(columnsWithSpecialLabels, commaOpts);
      expect(commaHeader).toBe('"Name, Full",Address; Complete');
      
      const semicolonOpts: CsvOptions = { ...defaultCsvOptions, separator: ';' };
      const semicolonHeader = buildCsvHeader(columnsWithSpecialLabels, semicolonOpts);
      expect(semicolonHeader).toBe('Name, Full;"Address; Complete"');
    });
  });

  describe('serializeRow', () => {
    it('should serialize row with comma separator', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',' };
      const row = serializeRow(sampleData[0], sampleColumns, opts);
      
      expect(row).toBe('Max,Mustermann,max@example.com,offen');
    });

    it('should serialize row with semicolon separator', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ';' };
      const row = serializeRow(sampleData[0], sampleColumns, opts);
      
      expect(row).toBe('Max;Mustermann;max@example.com;offen');
    });

    it('should apply column transforms', () => {
      const columnsWithTransform: ColumnSpec[] = [
        { key: 'firstName', label: 'Vorname' },
        { key: 'isActive', label: 'Aktiv', transform: (val: boolean) => val ? 'Ja' : 'Nein' },
        { key: 'count', label: 'Anzahl', transform: (val: number) => val * 2 }
      ];
      
      const dataWithTransforms = {
        firstName: 'Max',
        isActive: true,
        count: 5
      };
      
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',' };
      const row = serializeRow(dataWithTransforms, columnsWithTransform, opts);
      
      expect(row).toBe('Max,Ja,10');
    });

    it('should handle missing values gracefully', () => {
      const incompleteData = { firstName: 'Max' }; // Missing other fields
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',' };
      const row = serializeRow(incompleteData, sampleColumns, opts);
      
      expect(row).toBe('Max,,,');
    });
  });

  describe('escapeCsvValue', () => {
    const baseOpts: CsvOptions = { ...defaultCsvOptions, separator: ',' };

    it('should escape values containing comma separator', () => {
      expect(escapeCsvValue('Smith, John', baseOpts)).toBe('"Smith, John"');
      expect(escapeCsvValue('Normal text', baseOpts)).toBe('Normal text');
    });

    it('should escape values containing semicolon when using semicolon separator', () => {
      const semicolonOpts: CsvOptions = { ...defaultCsvOptions, separator: ';' };
      expect(escapeCsvValue('Text; with semicolon', semicolonOpts)).toBe('"Text; with semicolon"');
      expect(escapeCsvValue('Text, with comma', semicolonOpts)).toBe('Text, with comma');
    });

    it('should escape and double quotes correctly', () => {
      expect(escapeCsvValue('He said "Hello"', baseOpts)).toBe('"He said ""Hello"""');
      expect(escapeCsvValue('Multiple "quotes" and "more"', baseOpts)).toBe('"Multiple ""quotes"" and ""more"""');
    });

    it('should escape newlines correctly', () => {
      expect(escapeCsvValue('Line 1\nLine 2', baseOpts)).toBe('"Line 1\nLine 2"');
      expect(escapeCsvValue('Line 1\r\nLine 2', baseOpts)).toBe('"Line 1\r\nLine 2"');
    });

    it('should handle Unicode characters correctly', () => {
      expect(escapeCsvValue('Müller', baseOpts)).toBe('Müller');
      expect(escapeCsvValue('Österreich', baseOpts)).toBe('Österreich');
      expect(escapeCsvValue('Emoji 🚀 test', baseOpts)).toBe('Emoji 🚀 test');
      expect(escapeCsvValue('Müller, Hans', baseOpts)).toBe('"Müller, Hans"');
    });

    it('should apply injection guards when enabled', () => {
      const guardedOpts: CsvOptions = { ...baseOpts, guardForSpreadsheetInjection: true };
      
      expect(escapeCsvValue('=SUM(A1:A10)', guardedOpts)).toBe("'=SUM(A1:A10)");
      expect(escapeCsvValue('+1234567890', guardedOpts)).toBe("'+1234567890");
      expect(escapeCsvValue('-cmd', guardedOpts)).toBe("'-cmd");
      expect(escapeCsvValue('@import', guardedOpts)).toBe("'@import");
      expect(escapeCsvValue('normal text', guardedOpts)).toBe('normal text');
    });

    it('should not apply injection guards when disabled', () => {
      const unguardedOpts: CsvOptions = { ...baseOpts, guardForSpreadsheetInjection: false };
      
      expect(escapeCsvValue('=SUM(A1:A10)', unguardedOpts)).toBe('=SUM(A1:A10)');
      expect(escapeCsvValue('+1234567890', unguardedOpts)).toBe('+1234567890');
      expect(escapeCsvValue('-cmd', unguardedOpts)).toBe('-cmd');
      expect(escapeCsvValue('@import', unguardedOpts)).toBe('@import');
    });

    it('should handle null and undefined values', () => {
      expect(escapeCsvValue(null, baseOpts)).toBe('');
      expect(escapeCsvValue(undefined, baseOpts)).toBe('');
      expect(escapeCsvValue('', baseOpts)).toBe('');
    });

    it('should handle boolean and numeric values', () => {
      expect(escapeCsvValue(true, baseOpts)).toBe('true');
      expect(escapeCsvValue(false, baseOpts)).toBe('false');
      expect(escapeCsvValue(42, baseOpts)).toBe('42');
      expect(escapeCsvValue(0, baseOpts)).toBe('0');
      expect(escapeCsvValue(3.14159, baseOpts)).toBe('3.14159');
    });

    it('should handle complex escaping scenarios', () => {
      // Value with separator, quotes, and newlines
      const complexValue = 'Name: "John, Jr."\nAddress: 123 Main St.\nNote: Special chars @#$';
      const escaped = escapeCsvValue(complexValue, baseOpts);
      
      expect(escaped).toBe('"Name: ""John, Jr.""\nAddress: 123 Main St.\nNote: Special chars @#$"');
    });
  });

  describe('joinCsv', () => {
    const sampleLines = ['Header1,Header2', 'Value1,Value2', 'Value3,Value4'];

    it('should join lines with default line ending', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, includeBOM: false };
      const result = joinCsv(sampleLines, opts);
      
      expect(result).toBe('Header1,Header2\nValue1,Value2\nValue3,Value4');
    });

    it('should join lines with CRLF line ending', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, includeBOM: false, lineEnding: '\r\n' };
      const result = joinCsv(sampleLines, opts);
      
      expect(result).toBe('Header1,Header2\r\nValue1,Value2\r\nValue3,Value4');
    });

    it('should add BOM when includeBOM is true', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, includeBOM: true };
      const result = joinCsv(sampleLines, opts);
      
      expect(result).toBe('\uFEFFHeader1,Header2\nValue1,Value2\nValue3,Value4');
      expect(result.charCodeAt(0)).toBe(0xFEFF); // UTF-8 BOM
    });

    it('should not add BOM when includeBOM is false', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, includeBOM: false };
      const result = joinCsv(sampleLines, opts);
      
      expect(result.charCodeAt(0)).not.toBe(0xFEFF);
      expect(result.startsWith('Header1')).toBe(true);
    });

    it('should handle empty lines array', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, includeBOM: false };
      const result = joinCsv([], opts);
      
      expect(result).toBe('');
    });

    it('should handle single line', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, includeBOM: false };
      const result = joinCsv(['Single line'], opts);
      
      expect(result).toBe('Single line');
    });
  });

  describe('arrayToCsv', () => {
    it('should convert array to CSV with comma separator', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',', includeBOM: false };
      const csv = arrayToCsv(sampleData, sampleColumns, opts);
      
      const expectedLines = [
        'Vorname,Nachname,E-Mail,Status',
        'Max,Mustermann,max@example.com,offen',
        'Anna,Schmidt,anna@test.at,inBearbeitung'
      ];
      
      expect(csv).toBe(expectedLines.join('\n'));
    });

    it('should convert array to CSV with semicolon separator', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ';', includeBOM: false };
      const csv = arrayToCsv(sampleData, sampleColumns, opts);
      
      const expectedLines = [
        'Vorname;Nachname;E-Mail;Status',
        'Max;Mustermann;max@example.com;offen',
        'Anna;Schmidt;anna@test.at;inBearbeitung'
      ];
      
      expect(csv).toBe(expectedLines.join('\n'));
    });

    it('should handle data with special characters requiring escaping', () => {
      const specialData = [
        { 
          firstName: 'Max, Jr.', 
          lastName: 'Müller', 
          email: 'max@example.com', 
          status: 'Status with "quotes"' 
        },
        { 
          firstName: 'Anna', 
          lastName: 'Schmidt-Weber', 
          email: 'anna@test.at', 
          status: 'Multi\nline\nstatus' 
        }
      ];
      
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',', includeBOM: false };
      const csv = arrayToCsv(specialData, sampleColumns, opts);
      
      const expectedLines = [
        'Vorname,Nachname,E-Mail,Status',
        '"Max, Jr.",Müller,max@example.com,"Status with ""quotes"""',
        'Anna,Schmidt-Weber,anna@test.at,"Multi\nline\nstatus"'
      ];
      
      expect(csv).toBe(expectedLines.join('\n'));
    });

    it('should apply transforms correctly', () => {
      const columnsWithTransforms: ColumnSpec[] = [
        { key: 'name', label: 'Name' },
        { key: 'isActive', label: 'Aktiv', transform: (val: boolean) => val ? 'Ja' : 'Nein' },
        { key: 'date', label: 'Datum', transform: (val: string) => new Date(val).toLocaleDateString('de-DE') }
      ];
      
      const dataWithTransforms = [
        { name: 'Test User', isActive: true, date: '2024-01-15T10:30:00Z' },
        { name: 'Another User', isActive: false, date: '2024-02-20T14:45:00Z' }
      ];
      
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',', includeBOM: false };
      const csv = arrayToCsv(dataWithTransforms, columnsWithTransforms, opts);
      
      expect(csv).toContain('Name,Aktiv,Datum');
      expect(csv).toContain('Test User,Ja,');
      expect(csv).toContain('Another User,Nein,');
    });

    it('should include BOM when requested', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',', includeBOM: true };
      const csv = arrayToCsv(sampleData.slice(0, 1), sampleColumns, opts);
      
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      expect(csv.substring(1)).toContain('Vorname,Nachname');
    });

    it('should handle empty data array', () => {
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',', includeBOM: false };
      const csv = arrayToCsv([], sampleColumns, opts);
      
      expect(csv).toBe('Vorname,Nachname,E-Mail,Status');
    });
  });

  describe('injection guard scenarios', () => {
    const guardedOpts: CsvOptions = { 
      ...defaultCsvOptions, 
      separator: ',', 
      guardForSpreadsheetInjection: true 
    };

    it('should guard against formula injection', () => {
      const maliciousData = [
        { formula: '=SUM(A1:A10)', command: '+cmd|"/c calc"||', minus: '-2+3', at: '@import' }
      ];
      
      const columns: ColumnSpec[] = [
        { key: 'formula' },
        { key: 'command' },
        { key: 'minus' },
        { key: 'at' }
      ];
      
      const csv = arrayToCsv(maliciousData, columns, guardedOpts);
      
      expect(csv).toContain("'=SUM(A1:A10)");
      expect(csv).toContain("'+cmd|");
      expect(csv).toContain("'-2+3");
      expect(csv).toContain("'@import");
    });

    it('should not guard normal values starting with safe characters', () => {
      const safeData = [
        { text: 'Normal text', number: '123', email: 'test@example.com' }
      ];
      
      const columns: ColumnSpec[] = [
        { key: 'text' },
        { key: 'number' },
        { key: 'email' }
      ];
      
      const csv = arrayToCsv(safeData, columns, guardedOpts);
      
      expect(csv).toContain('Normal text,123,test@example.com');
      expect(csv).not.toContain("'Normal");
      expect(csv).not.toContain("'123");
      expect(csv).not.toContain("'test@");
    });
  });

  describe('Unicode and special character handling', () => {
    it('should preserve Unicode characters correctly', () => {
      const unicodeData = [
        { 
          name: 'Müller', 
          city: 'Österreich', 
          note: 'Café résumé naïve 北京',
          emoji: 'Test 🚀 🎉 ✅'
        }
      ];
      
      const columns: ColumnSpec[] = [
        { key: 'name' },
        { key: 'city' },
        { key: 'note' },
        { key: 'emoji' }
      ];
      
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',', includeBOM: false };
      const csv = arrayToCsv(unicodeData, columns, opts);
      
      expect(csv).toContain('Müller');
      expect(csv).toContain('Österreich');
      expect(csv).toContain('Café résumé naïve 北京');
      expect(csv).toContain('Test 🚀 🎉 ✅');
    });

    it('should handle Unicode with separators requiring escaping', () => {
      const unicodeWithSeparators = [
        { text: 'Müller, Hans (Österreich)' }
      ];
      
      const columns: ColumnSpec[] = [{ key: 'text' }];
      const opts: CsvOptions = { ...defaultCsvOptions, separator: ',', includeBOM: false };
      const csv = arrayToCsv(unicodeWithSeparators, columns, opts);
      
      expect(csv).toContain('"Müller, Hans (Österreich)"');
    });
  });

  describe('real-world client data scenarios', () => {
    it('should handle typical client export data', () => {
      const clientData = [
        {
          amsId: 'A12345',
          firstName: 'Max',
          lastName: 'Mustermann',
          title: 'Dr.',
          email: 'max.mustermann@example.com',
          phone: '+43 1 234 5678',
          status: 'inBearbeitung',
          note: 'Erstkontakt erfolgreich.\nTermin vereinbart.',
          isArchived: false
        },
        {
          amsId: 'A67890',
          firstName: 'Anna',
          lastName: 'Schmidt-Weber',
          title: null,
          email: 'anna@test.at',
          phone: '+43 699 987 6543',
          status: 'erledigt',
          note: 'Maßnahme abgeschlossen',
          isArchived: true
        }
      ];

      const clientColumns: ColumnSpec[] = [
        { key: 'amsId', label: 'AMS-ID' },
        { key: 'firstName', label: 'Vorname' },
        { key: 'lastName', label: 'Nachname' },
        { key: 'title', label: 'Titel' },
        { key: 'email', label: 'E-Mail' },
        { key: 'phone', label: 'Telefon' },
        { key: 'status', label: 'Status' },
        { key: 'note', label: 'Notiz' },
        { key: 'isArchived', label: 'Archiviert', transform: (val: boolean) => val ? 'Ja' : 'Nein' }
      ];

      const opts: CsvOptions = { 
        separator: ';', 
        includeBOM: true, 
        guardForSpreadsheetInjection: true,
        lineEnding: '\n'
      };
      
      const csv = arrayToCsv(clientData, clientColumns, opts);
      
      // Should start with BOM
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      
      // Should contain proper header
      expect(csv).toContain('AMS-ID;Vorname;Nachname;Titel;E-Mail;Telefon;Status;Notiz;Archiviert');
      
      // Should handle multiline note with escaping
      expect(csv).toContain('"Erstkontakt erfolgreich.\nTermin vereinbart."');
      
      // Should apply boolean transform
      expect(csv).toContain(';Nein\n'); // First client not archived
      expect(csv).toContain(';Ja'); // Second client archived
      
      // Should handle null title
      expect(csv).toContain(';;anna@test.at'); // Empty title field
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long values', () => {
      const longValue = 'A'.repeat(10000);
      const escaped = escapeCsvValue(longValue, defaultCsvOptions);
      
      expect(escaped).toBe(longValue); // No escaping needed for just repeated chars
      expect(escaped.length).toBe(10000);
    });

    it('should handle values with only special characters', () => {
      const specialData = [
        { field1: '"""', field2: '\n\n\n', field3: ',,,' }
      ];
      
      const columns: ColumnSpec[] = [
        { key: 'field1' },
        { key: 'field2' },
        { key: 'field3' }
      ];
      
      const csv = arrayToCsv(specialData, columns, defaultCsvOptions);
      
      expect(csv).toContain('""""""""""'); // Triple quotes escaped
      expect(csv).toContain('"\n\n\n"'); // Newlines quoted
      expect(csv).toContain('",,,"'); // Commas quoted
    });

    it('should maintain consistent line ending format', () => {
      const data = [{ a: '1' }, { a: '2' }];
      const columns: ColumnSpec[] = [{ key: 'a' }];
      
      const lfOpts: CsvOptions = { ...defaultCsvOptions, lineEnding: '\n' };
      const crlfOpts: CsvOptions = { ...defaultCsvOptions, lineEnding: '\r\n' };
      
      const lfCsv = arrayToCsv(data, columns, lfOpts);
      const crlfCsv = arrayToCsv(data, columns, crlfOpts);
      
      expect(lfCsv.split('\n')).toHaveLength(3); // header + 2 rows
      expect(lfCsv).not.toContain('\r\n');
      
      expect(crlfCsv.split('\r\n')).toHaveLength(3);
      expect(crlfCsv).toContain('\r\n');
    });
  });
});