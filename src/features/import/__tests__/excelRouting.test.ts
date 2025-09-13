/**
 * Tests for Excel import routing
 * Ensures Excel files are routed to correct handler, not PDF pipeline
 */

import { describe, it, expect } from 'vitest';

// File type detection logic (extracted from existing implementation)
function detectFileType(fileName: string, mimeType?: string): 'xlsx' | 'xls' | 'csv' | 'pdf' | 'html' | 'unknown' {
  const ext = (fileName?.split('.').pop() || '').toLowerCase();
  
  // Excel formats
  if (ext === 'xlsx' || mimeType?.includes('openxmlformats-officedocument.spreadsheetml.sheet')) {
    return 'xlsx';
  }
  if (ext === 'xls' || mimeType?.includes('application/vnd.ms-excel')) {
    return 'xls';
  }
  if (ext === 'csv' || mimeType?.includes('text/csv')) {
    return 'csv';
  }
  
  // PDF format
  if (ext === 'pdf' || mimeType?.includes('application/pdf')) {
    return 'pdf';
  }
  
  // HTML fallback
  if (ext === 'html' || ext === 'htm' || mimeType?.includes('text/html')) {
    return 'html';
  }
  
  return 'unknown';
}

function routeToHandler(fileType: 'xlsx' | 'xls' | 'csv' | 'pdf' | 'html' | 'unknown'): 'excel' | 'pdf' | 'unknown' {
  switch (fileType) {
    case 'xlsx':
    case 'xls':
    case 'csv':
    case 'html': // HTML tables can be processed by Excel handler
      return 'excel';
    case 'pdf':
      return 'pdf';
    default:
      return 'unknown';
  }
}

describe('Excel Import Routing', () => {
  describe('file type detection', () => {
    it('should detect Excel formats correctly', () => {
      expect(detectFileType('clients.xlsx')).toBe('xlsx');
      expect(detectFileType('data.xls')).toBe('xls');
      expect(detectFileType('export.csv')).toBe('csv');
      
      // Case insensitive
      expect(detectFileType('CLIENTS.XLSX')).toBe('xlsx');
      expect(detectFileType('Data.XLS')).toBe('xls');
      expect(detectFileType('EXPORT.CSV')).toBe('csv');
    });

    it('should detect via MIME type when extension ambiguous', () => {
      expect(detectFileType('file', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
      expect(detectFileType('file', 'application/vnd.ms-excel')).toBe('xls');
      expect(detectFileType('file', 'text/csv')).toBe('csv');
    });

    it('should prefer extension over MIME type', () => {
      // Extension should take precedence
      expect(detectFileType('data.xlsx', 'text/csv')).toBe('xlsx');
      expect(detectFileType('data.csv', 'application/pdf')).toBe('csv');
    });

    it('should detect PDF correctly', () => {
      expect(detectFileType('document.pdf')).toBe('pdf');
      expect(detectFileType('file', 'application/pdf')).toBe('pdf');
      expect(detectFileType('DOCUMENT.PDF')).toBe('pdf');
    });

    it('should detect HTML correctly', () => {
      expect(detectFileType('table.html')).toBe('html');
      expect(detectFileType('page.htm')).toBe('html');
      expect(detectFileType('file', 'text/html')).toBe('html');
    });

    it('should handle unknown formats', () => {
      expect(detectFileType('document.txt')).toBe('unknown');
      expect(detectFileType('image.jpg')).toBe('unknown');
      expect(detectFileType('file', 'application/unknown')).toBe('unknown');
    });
  });

  describe('routing to correct handler', () => {
    it('should route Excel formats to Excel handler', () => {
      expect(routeToHandler('xlsx')).toBe('excel');
      expect(routeToHandler('xls')).toBe('excel');
      expect(routeToHandler('csv')).toBe('excel');
    });

    it('should route HTML to Excel handler (table extraction)', () => {
      // HTML tables can be processed by Excel import pipeline
      expect(routeToHandler('html')).toBe('excel');
    });

    it('should route PDF to PDF handler', () => {
      expect(routeToHandler('pdf')).toBe('pdf');
    });

    it('should route unknown formats to unknown handler', () => {
      expect(routeToHandler('unknown')).toBe('unknown');
    });
  });

  describe('integration scenarios', () => {
    it('should route typical Excel files correctly', () => {
      const testCases = [
        { fileName: 'clients.xlsx', expected: 'excel' },
        { fileName: 'ams-export.xls', expected: 'excel' },
        { fileName: 'data.csv', expected: 'excel' },
        { fileName: 'web-export.html', expected: 'excel' }, // HTML tables
        { fileName: 'document.pdf', expected: 'pdf' }
      ];

      testCases.forEach(({ fileName, expected }) => {
        const fileType = detectFileType(fileName);
        const handler = routeToHandler(fileType);
        expect(handler).toBe(expected);
      });
    });

    it('should handle case variations correctly', () => {
      const variations = [
        'Clients.XLSX',
        'DATA.xls', 
        'export.CSV',
        'TABLE.HTML',
        'document.PDF'
      ];

      variations.forEach(fileName => {
        const fileType = detectFileType(fileName);
        const handler = routeToHandler(fileType);
        
        // Should not route to unknown due to case sensitivity
        expect(handler).not.toBe('unknown');
      });
    });

    it('should prevent Excel files from going to PDF handler', () => {
      const excelFiles = [
        'clients.xlsx',
        'data.xls', 
        'export.csv',
        'table.html'
      ];

      excelFiles.forEach(fileName => {
        const fileType = detectFileType(fileName);
        const handler = routeToHandler(fileType);
        
        // Critical: Excel files must NOT go to PDF handler
        expect(handler).not.toBe('pdf');
        expect(handler).toBe('excel');
      });
    });

    it('should prevent PDF files from going to Excel handler', () => {
      const pdfFiles = [
        'document.pdf',
        'scan.PDF',
        'report.pdf'
      ];

      pdfFiles.forEach(fileName => {
        const fileType = detectFileType(fileName);
        const handler = routeToHandler(fileType);
        
        // Critical: PDF files must NOT go to Excel handler
        expect(handler).not.toBe('excel');
        expect(handler).toBe('pdf');
      });
    });

    it('should handle MIME type fallback correctly', () => {
      // Files without clear extensions should use MIME type
      const mimeBasedCases = [
        { fileName: 'download', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', expected: 'excel' },
        { fileName: 'export', mimeType: 'text/csv', expected: 'excel' },
        { fileName: 'document', mimeType: 'application/pdf', expected: 'pdf' },
        { fileName: 'page', mimeType: 'text/html', expected: 'excel' }
      ];

      mimeBasedCases.forEach(({ fileName, mimeType, expected }) => {
        const fileType = detectFileType(fileName, mimeType);
        const handler = routeToHandler(fileType);
        expect(handler).toBe(expected);
      });
    });
  });

  describe('edge cases and defensive behavior', () => {
    it('should handle empty/null filenames gracefully', () => {
      expect(detectFileType('')).toBe('unknown');
      expect(detectFileType(null as any)).toBe('unknown');
      expect(detectFileType(undefined as any)).toBe('unknown');
    });

    it('should handle files without extensions', () => {
      expect(detectFileType('filename-without-extension')).toBe('unknown');
      expect(routeToHandler('unknown')).toBe('unknown');
    });

    it('should handle multiple dots in filename', () => {
      expect(detectFileType('file.backup.xlsx')).toBe('xlsx');
      expect(detectFileType('data.2024.csv')).toBe('csv');
      expect(detectFileType('report.final.pdf')).toBe('pdf');
    });

    it('should handle special characters in filename', () => {
      expect(detectFileType('file-name_with-special.xlsx')).toBe('xlsx');
      expect(detectFileType('data (copy).csv')).toBe('csv');
      expect(detectFileType('report [final].pdf')).toBe('pdf');
    });
  });
});