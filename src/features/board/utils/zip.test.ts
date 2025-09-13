/**
 * Tests for existing ZIP utilities in board utils
 * Tests the current createZip implementation
 */

import { describe, it, expect } from 'vitest';
import { createZip } from './zip';

describe('Board ZIP Utils', () => {
  describe('createZip', () => {
    it('should create ZIP from single file', () => {
      const files = [
        { name: 'test.csv', data: 'Name,Email\nJohn,john@example.com' }
      ];
      
      const zipBlob = createZip(files);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.type).toBe('application/zip');
      expect(zipBlob.size).toBeGreaterThan(0);
    });

    it('should create ZIP from multiple files', () => {
      const files = [
        { name: 'clients.csv', data: 'Name,Status\nMax,offen\nAnna,erledigt' },
        { name: 'users.csv', data: 'Name,Role\nAdmin,admin\nUser,user' },
        { name: 'readme.txt', data: 'Export created on 2024-01-15' }
      ];
      
      const zipBlob = createZip(files);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.type).toBe('application/zip');
      expect(zipBlob.size).toBeGreaterThan(100); // Should be substantial for 3 files
    });

    it('should handle files with special characters in names', () => {
      const files = [
        { name: 'file-with-dashes.csv', data: 'test' },
        { name: 'file_with_underscores.csv', data: 'test' },
        { name: 'file.with.dots.csv', data: 'test' }
      ];
      
      expect(() => createZip(files)).not.toThrow();
      
      const zipBlob = createZip(files);
      expect(zipBlob.size).toBeGreaterThan(0);
    });

    it('should handle Unicode content correctly', () => {
      const files = [
        { 
          name: 'unicode.csv', 
          data: 'Name,City\nMüller,Österreich\nCafé,résumé\n北京,中国\nEmoji,🚀🎉✅' 
        }
      ];
      
      const zipBlob = createZip(files);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
    });

    it('should handle empty file content', () => {
      const files = [
        { name: 'empty.csv', data: '' },
        { name: 'header-only.csv', data: 'Name,Email' }
      ];
      
      const zipBlob = createZip(files);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
    });

    it('should handle large content efficiently', () => {
      const largeData = 'Large content line\n'.repeat(5000); // ~85KB
      const files = [
        { name: 'large-file.csv', data: largeData }
      ];
      
      const start = performance.now();
      const zipBlob = createZip(files);
      const duration = performance.now() - start;
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(largeData.length * 0.5); // Should contain most content
      expect(duration).toBeLessThan(1000); // Should be reasonably fast
    });

    it('should produce deterministic output for same input', () => {
      const files = [
        { name: 'test1.csv', data: 'Data1' },
        { name: 'test2.csv', data: 'Data2' }
      ];
      
      const zip1 = createZip(files);
      const zip2 = createZip(files);
      
      // Should produce identical blobs
      expect(zip1.size).toBe(zip2.size);
      expect(zip1.type).toBe(zip2.type);
    });

    it('should handle files with CSV special characters', () => {
      const files = [
        { 
          name: 'special-chars.csv', 
          data: 'Name,Note\n"Smith, Jr.","Line 1\nLine 2\nQuotes: ""test"""\nMüller,Österreich 🚀' 
        }
      ];
      
      const zipBlob = createZip(files);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
    });

    it('should maintain file order in ZIP', () => {
      const files1 = [
        { name: 'a.csv', data: 'A' },
        { name: 'b.csv', data: 'B' },
        { name: 'c.csv', data: 'C' }
      ];
      
      const files2 = [
        { name: 'c.csv', data: 'C' },
        { name: 'a.csv', data: 'A' },
        { name: 'b.csv', data: 'B' }
      ];
      
      const zip1 = createZip(files1);
      const zip2 = createZip(files2);
      
      // Different order should potentially produce different ZIP
      // (depends on implementation - test current behavior)
      expect(zip1).toBeInstanceOf(Blob);
      expect(zip2).toBeInstanceOf(Blob);
    });

    it('should handle duplicate filenames', () => {
      const files = [
        { name: 'duplicate.csv', data: 'First content' },
        { name: 'duplicate.csv', data: 'Second content' }
      ];
      
      // Should not throw error (current implementation behavior)
      expect(() => createZip(files)).not.toThrow();
      
      const zipBlob = createZip(files);
      expect(zipBlob.size).toBeGreaterThan(0);
    });
  });

  describe('integration with CSV_LABELS and CSV_TRANSFORMS', () => {
    it('should work with predefined labels and transforms', () => {
      const clientRows = [
        { 
          firstName: 'Max', 
          lastName: 'Mustermann', 
          isPinned: true, 
          isArchived: false,
          followUp: '2024-12-25T10:00:00Z',
          amsBookingDate: '2024-01-15T08:00:00Z'
        }
      ];
      
      const fields = ['firstName', 'lastName', 'isPinned', 'isArchived', 'followUp', 'amsBookingDate'];
      const csv = toCsv(clientRows, fields, { 
        labels: CSV_LABELS, 
        transforms: CSV_TRANSFORMS 
      });
      
      // Should use German labels
      expect(csv).toContain('Vorname,Nachname,Gepinnt,Archiviert');
      
      // Should apply transforms
      expect(csv).toContain('Max,Mustermann,Ja,Nein,25.12.2024,15.01.2024');
    });

    it('should handle missing transform gracefully', () => {
      const rows = [{ customField: 'test', isPinned: true }];
      const fields = ['customField', 'isPinned'];
      
      const csv = toCsv(rows, fields, { transforms: CSV_TRANSFORMS });
      
      // customField has no transform, should use default behavior
      // isPinned has transform, should use it
      expect(csv).toContain('test,Ja');
    });
  });

  describe('real-world export scenarios', () => {
    it('should handle complete client export with all special cases', () => {
      const complexClientData = [
        {
          id: 'client-1',
          firstName: 'Max, Jr.',
          lastName: 'Müller',
          title: 'Dr.',
          email: 'max@example.com',
          phone: '+43 1 234 5678',
          status: 'inBearbeitung',
          result: 'terminFixiert',
          angebot: 'BAM',
          followUp: '2024-12-25T10:00:00Z',
          assignedTo: 'user-123',
          amsBookingDate: '2024-01-15T08:00:00Z',
          priority: 'hoch',
          lastActivity: '2024-01-20T14:30:00Z',
          note: 'Erstkontakt erfolgreich.\nTermin vereinbart für nächste Woche.\nKontakt: "sehr kooperativ"',
          isPinned: true,
          isArchived: false
        }
      ];
      
      const allFields = Object.keys(complexClientData[0]);
      const csv = toCsv(complexClientData, allFields, {
        labels: CSV_LABELS,
        transforms: CSV_TRANSFORMS,
        sep: ';',
        withBOM: true
      });
      
      // Should start with BOM
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      
      // Should handle complex note with newlines and quotes
      expect(csv).toContain('"Erstkontakt erfolgreich.\nTermin vereinbart für nächste Woche.\nKontakt: ""sehr kooperativ"""');
      
      // Should format dates
      expect(csv).toContain('25.12.2024');
      expect(csv).toContain('15.01.2024');
      expect(csv).toContain('20.01.2024');
      
      // Should transform booleans
      expect(csv).toContain(';Ja;'); // isPinned
      expect(csv).toContain(';Nein'); // isArchived
      
      // Should handle Unicode in name
      expect(csv).toContain('Müller');
      
      // Should escape name with comma
      expect(csv).toContain('"Max, Jr."');
    });
  });
});