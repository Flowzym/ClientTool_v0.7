/**
 * Tests für ImportService
 */

import { describe, it, expect } from 'vitest';
import { importService } from './ImportService';

// Mock file für Tests
function createMockFile(content: string, name: string, type: string = 'text/csv'): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe('ImportService', () => {
  describe('Header-Mapping', () => {
    it('should map common header variants to domain fields', async () => {
      const csvContent = 'Nachname;Vorname;Status;Angebot\nMustermann;Max;offen;BAM';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle unknown headers gracefully', async () => {
      const csvContent = 'UnknownColumn;Nachname;Vorname\nSomeValue;Mustermann;Max';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });
  });

  describe('Name-Parser', () => {
    it('should parse "Nachname, Vorname" format', async () => {
      const csvContent = 'Name\n"Mustermann, Max"';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it('should parse "Titel Vorname Nachname" format', async () => {
      const csvContent = 'Name\n"Dr. Max Mustermann"';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it('should handle single name as lastName', async () => {
      const csvContent = 'Name\nMustermann';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });
  });

  describe('Datum-Normalizer', () => {
    it('should normalize DD.MM.YYYY format', async () => {
      const csvContent = 'Nachname;Vorname;Geburtsdatum\nMustermann;Max;15.03.1985';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it('should normalize DD/MM/YYYY format', async () => {
      const csvContent = 'Nachname;Vorname;Geburtsdatum\nMustermann;Max;15/03/1985';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it('should handle invalid dates gracefully', async () => {
      const csvContent = 'Nachname;Vorname;Geburtsdatum\nMustermann;Max;32.13.2024';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      // Ungültiges Datum sollte übersprungen werden
    });
  });

  describe('CSV-Delimiter-Erkennung', () => {
    it('should detect semicolon delimiter', async () => {
      const csvContent = 'Nachname;Vorname;Status\nMustermann;Max;offen';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it('should fallback to comma delimiter', async () => {
      const csvContent = 'Nachname,Vorname,Status\nMustermann,Max,offen';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty files', async () => {
      const csvContent = '';
      const file = createMockFile(csvContent, 'empty.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append'
      });
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle files with only headers', async () => {
      const csvContent = 'Nachname;Vorname;Status';
      const file = createMockFile(csvContent, 'headers-only.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append'
      });
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Keine Datenzeilen gefunden');
    });

    it('should skip empty rows', async () => {
      const csvContent = 'Nachname;Vorname;Status\nMustermann;Max;offen\n;;;\nSchmidt;Anna;inBearbeitung';
      const file = createMockFile(csvContent, 'test.csv');
      
      const result = await importService.importFile(file, {
        sourceId: 'test',
        mode: 'append',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
    });
  });
});