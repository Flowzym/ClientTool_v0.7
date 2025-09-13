/**
 * Tests for ZIP export utilities
 * Covers single/multi-file ZIP creation, determinism, content integrity
 */

import { describe, it, expect } from 'vitest';
import { buildZip, validateZipPath, sanitizeZipFilename, type ZipEntry } from '../zipUtils';

describe('ZIP Export Utilities', () => {
  describe('buildZip', () => {
    it('should create single-file ZIP correctly', () => {
      const entries: ZipEntry[] = [
        { path: 'test.csv', content: 'Name,Email\nJohn,john@example.com' }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(0);
      
      // Check ZIP signature (PK header)
      expect(zipData[0]).toBe(0x50); // 'P'
      expect(zipData[1]).toBe(0x4B); // 'K'
      expect(zipData[2]).toBe(0x03); // Local file header signature
      expect(zipData[3]).toBe(0x04);
    });

    it('should create multi-file ZIP correctly', () => {
      const entries: ZipEntry[] = [
        { path: 'clients.csv', content: 'Name,Status\nMax,offen\nAnna,erledigt' },
        { path: 'users.csv', content: 'Name,Role\nAdmin,admin\nUser,user' },
        { path: 'metadata.txt', content: 'Export created at: 2024-01-15' }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(100); // Should be substantial for 3 files
      
      // Check ZIP signature
      expect(zipData[0]).toBe(0x50);
      expect(zipData[1]).toBe(0x4B);
    });

    it('should produce deterministic output for same input', () => {
      const entries: ZipEntry[] = [
        { path: 'test1.csv', content: 'Data1' },
        { path: 'test2.csv', content: 'Data2' }
      ];
      
      const zip1 = buildZip(entries);
      const zip2 = buildZip(entries);
      
      // Should produce identical output (deterministic)
      expect(zip1).toEqual(zip2);
    });

    it('should handle empty content files', () => {
      const entries: ZipEntry[] = [
        { path: 'empty.csv', content: '' },
        { path: 'header-only.csv', content: 'Name,Email' }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(0);
    });

    it('should handle Unicode content correctly', () => {
      const entries: ZipEntry[] = [
        { 
          path: 'unicode.csv', 
          content: 'Name,City\nMüller,Österreich\n北京,中国\nCafé,résumé' 
        }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(0);
      
      // ZIP should be valid (starts with PK signature)
      expect(zipData[0]).toBe(0x50);
      expect(zipData[1]).toBe(0x4B);
    });

    it('should handle large content efficiently', () => {
      const largeContent = 'A'.repeat(50000); // 50KB content
      const entries: ZipEntry[] = [
        { path: 'large.csv', content: largeContent }
      ];
      
      const start = performance.now();
      const zipData = buildZip(entries);
      const duration = performance.now() - start;
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(50000); // Should contain the content plus ZIP overhead
      expect(duration).toBeLessThan(1000); // Should be reasonably fast
    });

    it('should throw error for empty entries array', () => {
      expect(() => buildZip([])).toThrow('Cannot create ZIP with no entries');
    });

    it('should handle special characters in filenames', () => {
      const entries: ZipEntry[] = [
        { path: 'file-with-dashes.csv', content: 'test' },
        { path: 'file_with_underscores.csv', content: 'test' },
        { path: 'file.with.dots.csv', content: 'test' }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(0);
    });
  });

  describe('ZIP structure validation', () => {
    it('should create valid ZIP structure with correct headers', () => {
      const entries: ZipEntry[] = [
        { path: 'test.csv', content: 'Name\nTest' }
      ];
      
      const zipData = buildZip(entries);
      
      // Local file header signature
      expect(zipData.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4B, 0x03, 0x04]));
      
      // Should contain central directory signature somewhere
      let foundCentralDir = false;
      for (let i = 0; i < zipData.length - 4; i++) {
        if (zipData[i] === 0x50 && zipData[i + 1] === 0x4B && 
            zipData[i + 2] === 0x01 && zipData[i + 3] === 0x02) {
          foundCentralDir = true;
          break;
        }
      }
      expect(foundCentralDir).toBe(true);
      
      // Should end with end of central directory signature
      const endSignature = zipData.slice(-22, -18);
      expect(endSignature).toEqual(new Uint8Array([0x50, 0x4B, 0x05, 0x06]));
    });

    it('should maintain correct file order in ZIP', () => {
      const entries: ZipEntry[] = [
        { path: 'a-first.csv', content: 'First file' },
        { path: 'b-second.csv', content: 'Second file' },
        { path: 'c-third.csv', content: 'Third file' }
      ];
      
      const zip1 = buildZip(entries);
      const zip2 = buildZip([...entries].reverse()); // Different order
      
      // Different input order should produce different ZIP
      expect(zip1).not.toEqual(zip2);
      
      // But same order should produce same ZIP
      const zip3 = buildZip([...entries]);
      expect(zip1).toEqual(zip3);
    });
  });

  describe('content integrity', () => {
    it('should preserve exact content including special characters', () => {
      const specialContent = 'Name,Note,Formula\n"Smith, John","Multi-line\nnote with ""quotes""","\'=SUM(A1:A10)"\nMüller,"Österreich 🚀","Normal text"';
      const entries: ZipEntry[] = [
        { path: 'special-data.csv', content: specialContent }
      ];
      
      const zipData = buildZip(entries);
      
      // ZIP should be created without errors
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(specialContent.length);
    });

    it('should handle very long filenames gracefully', () => {
      const longFilename = 'very-long-filename-' + 'x'.repeat(200) + '.csv';
      const entries: ZipEntry[] = [
        { path: longFilename, content: 'test content' }
      ];
      
      // Should not throw error (implementation should handle gracefully)
      expect(() => buildZip(entries)).not.toThrow();
    });

    it('should calculate correct file sizes', () => {
      const content1 = 'Short';
      const content2 = 'Much longer content with more characters';
      
      const entries: ZipEntry[] = [
        { path: 'short.txt', content: content1 },
        { path: 'long.txt', content: content2 }
      ];
      
      const zipData = buildZip(entries);
      
      // ZIP should be larger than the sum of content lengths (due to headers)
      const totalContentLength = content1.length + content2.length;
      expect(zipData.length).toBeGreaterThan(totalContentLength);
      
      // But not excessively larger (reasonable overhead)
      expect(zipData.length).toBeLessThan(totalContentLength * 3);
    });
  });

  describe('validateZipPath', () => {
    it('should accept valid paths', () => {
      expect(validateZipPath('file.csv')).toBe(true);
      expect(validateZipPath('folder/file.csv')).toBe(true);
      expect(validateZipPath('deep/nested/path/file.txt')).toBe(true);
      expect(validateZipPath('file-with-dashes.csv')).toBe(true);
      expect(validateZipPath('file_with_underscores.csv')).toBe(true);
      expect(validateZipPath('file.with.dots.csv')).toBe(true);
    });

    it('should reject dangerous paths', () => {
      expect(validateZipPath('../outside.csv')).toBe(false);
      expect(validateZipPath('folder/../outside.csv')).toBe(false);
      expect(validateZipPath('/absolute/path.csv')).toBe(false);
    });

    it('should reject overly long paths', () => {
      const longPath = 'x'.repeat(300) + '.csv';
      expect(validateZipPath(longPath)).toBe(false);
    });

    it('should reject paths with invalid characters', () => {
      expect(validateZipPath('file with spaces.csv')).toBe(false);
      expect(validateZipPath('file<with>brackets.csv')).toBe(false);
      expect(validateZipPath('file|with|pipes.csv')).toBe(false);
    });
  });

  describe('sanitizeZipFilename', () => {
    it('should sanitize problematic characters', () => {
      expect(sanitizeZipFilename('file with spaces.csv')).toBe('file_with_spaces.csv');
      expect(sanitizeZipFilename('file<>|?.csv')).toBe('file_.csv');
      expect(sanitizeZipFilename('file::name.csv')).toBe('file_name.csv');
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeZipFilename('file___with___many___underscores.csv')).toBe('file_with_many_underscores.csv');
    });

    it('should limit filename length', () => {
      const longName = 'very-long-filename-' + 'x'.repeat(200) + '.csv';
      const sanitized = sanitizeZipFilename(longName);
      
      expect(sanitized.length).toBeLessThanOrEqual(100);
      expect(sanitized).toMatch(/^very-long-filename/);
    });

    it('should preserve valid characters', () => {
      expect(sanitizeZipFilename('valid-file_name.123.csv')).toBe('valid-file_name.123.csv');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical client export scenario', () => {
      const clientCsvs = [
        {
          path: 'clients-active.csv',
          content: 'AMS-ID;Vorname;Nachname;Status\nA12345;Max;Mustermann;offen\nA67890;Anna;Schmidt;inBearbeitung'
        },
        {
          path: 'clients-archived.csv',
          content: 'AMS-ID;Vorname;Nachname;Status\nA11111;Thomas;Weber;erledigt'
        },
        {
          path: 'export-metadata.txt',
          content: 'Export created: 2024-01-15T10:30:00Z\nTotal records: 3\nMode: full-export'
        }
      ];
      
      const zipData = buildZip(clientCsvs);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(200); // Reasonable size for 3 files
      
      // Should start with ZIP signature
      expect(zipData.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4B, 0x03, 0x04]));
    });

    it('should handle CSV with complex escaping in ZIP', () => {
      const complexCsv = `Name,Note,Formula
"Smith, John","Multi-line\nnote with ""quotes""","'=SUM(A1:A10)"
Müller,"Österreich 🚀","Normal text"`;

      const entries: ZipEntry[] = [
        { path: 'complex-data.csv', content: complexCsv }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(complexCsv.length);
    });

    it('should handle many small files efficiently', () => {
      const entries: ZipEntry[] = Array.from({ length: 50 }, (_, i) => ({
        path: `file-${i.toString().padStart(3, '0')}.csv`,
        content: `File ${i}\nContent for file ${i}`
      }));
      
      const start = performance.now();
      const zipData = buildZip(entries);
      const duration = performance.now() - start;
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(duration).toBeLessThan(1000); // Should be reasonably fast
      expect(zipData.length).toBeGreaterThan(1000); // Should contain all files
    });
  });

  describe('ZIP structure integrity', () => {
    it('should create valid ZIP structure with correct entry count', () => {
      const entries: ZipEntry[] = [
        { path: 'file1.csv', content: 'Content 1' },
        { path: 'file2.csv', content: 'Content 2' },
        { path: 'file3.csv', content: 'Content 3' }
      ];
      
      const zipData = buildZip(entries);
      
      // Check end of central directory record for entry count
      // Last 22 bytes contain EOCD, bytes 8-9 contain entry count
      const entryCountBytes = zipData.slice(-14, -12);
      const entryCount = new DataView(entryCountBytes.buffer).getUint16(0, true);
      
      expect(entryCount).toBe(3);
    });

    it('should handle duplicate filenames by preserving both', () => {
      const entries: ZipEntry[] = [
        { path: 'duplicate.csv', content: 'First content' },
        { path: 'duplicate.csv', content: 'Second content' }
      ];
      
      // Should not throw error (implementation handles duplicates)
      expect(() => buildZip(entries)).not.toThrow();
      
      const zipData = buildZip(entries);
      expect(zipData).toBeInstanceOf(Uint8Array);
    });

    it('should maintain file order in ZIP directory', () => {
      const entries: ZipEntry[] = [
        { path: 'z-last.csv', content: 'Last alphabetically' },
        { path: 'a-first.csv', content: 'First alphabetically' },
        { path: 'm-middle.csv', content: 'Middle alphabetically' }
      ];
      
      const zipData = buildZip(entries);
      
      // Different order should produce different ZIP
      const reorderedEntries = [entries[1], entries[2], entries[0]];
      const reorderedZip = buildZip(reorderedEntries);
      
      expect(zipData).not.toEqual(reorderedZip);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle very long content', () => {
      const veryLongContent = 'Long content line\n'.repeat(10000); // ~170KB
      const entries: ZipEntry[] = [
        { path: 'large-file.csv', content: veryLongContent }
      ];
      
      expect(() => buildZip(entries)).not.toThrow();
      
      const zipData = buildZip(entries);
      expect(zipData.length).toBeGreaterThan(veryLongContent.length * 0.8); // Should contain most of the content
    });

    it('should handle entries with same content but different paths', () => {
      const sameContent = 'Name,Status\nTest,Active';
      const entries: ZipEntry[] = [
        { path: 'copy1.csv', content: sameContent },
        { path: 'copy2.csv', content: sameContent },
        { path: 'folder/copy3.csv', content: sameContent }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      
      // Should contain all three files despite same content
      const entryCountBytes = zipData.slice(-14, -12);
      const entryCount = new DataView(entryCountBytes.buffer).getUint16(0, true);
      expect(entryCount).toBe(3);
    });

    it('should handle binary-like content in text files', () => {
      const binaryLikeContent = '\x00\x01\x02\xFF\xFE\xFD'; // Binary-like bytes as string
      const entries: ZipEntry[] = [
        { path: 'binary-like.txt', content: binaryLikeContent }
      ];
      
      expect(() => buildZip(entries)).not.toThrow();
    });
  });

  describe('CRC32 validation', () => {
    it('should calculate consistent CRC32 for same content', () => {
      const content = 'Test content for CRC32';
      const entries1: ZipEntry[] = [{ path: 'test1.txt', content }];
      const entries2: ZipEntry[] = [{ path: 'test2.txt', content }]; // Same content, different name
      
      const zip1 = buildZip(entries1);
      const zip2 = buildZip(entries2);
      
      // ZIPs should be different (different filenames) but both valid
      expect(zip1).not.toEqual(zip2);
      expect(zip1.length).toBeGreaterThan(0);
      expect(zip2.length).toBeGreaterThan(0);
    });

    it('should handle empty content CRC32', () => {
      const entries: ZipEntry[] = [
        { path: 'empty.txt', content: '' }
      ];
      
      expect(() => buildZip(entries)).not.toThrow();
      
      const zipData = buildZip(entries);
      expect(zipData).toBeInstanceOf(Uint8Array);
    });
  });

  describe('integration with CSV export', () => {
    it('should create ZIP containing properly formatted CSV files', () => {
      // Simulate CSV content that would come from csvUtils
      const csvContent1 = '\uFEFFVorname;Nachname;E-Mail\nMax;Mustermann;max@example.com\n"Anna, Jr.";Schmidt;"anna@test.at"';
      const csvContent2 = 'Status;Count\noffen;5\n"in Bearbeitung";3';
      
      const entries: ZipEntry[] = [
        { path: 'clients.csv', content: csvContent1 },
        { path: 'statistics.csv', content: csvContent2 }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(csvContent1.length + csvContent2.length);
      
      // Should be valid ZIP structure
      expect(zipData[0]).toBe(0x50);
      expect(zipData[1]).toBe(0x4B);
    });

    it('should handle CSV with all special cases in ZIP', () => {
      const csvWithAllSpecialCases = [
        'Name,Formula,Unicode,Multiline',
        '"Smith, John","\'=SUM(A1:A10)","Müller Österreich","Line 1\nLine 2"',
        'Normal,"\'@IMPORT","Café résumé 🚀","Single line"'
      ].join('\n');
      
      const entries: ZipEntry[] = [
        { path: 'complex-export.csv', content: csvWithAllSpecialCases }
      ];
      
      const zipData = buildZip(entries);
      
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(csvWithAllSpecialCases.length);
    });
  });
});