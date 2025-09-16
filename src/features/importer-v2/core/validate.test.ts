/**
 * Tests for enhanced validation system
 */

import { describe, it, expect } from 'vitest';
import { validateRow, validateBatch, quickValidate, suggestFixes } from './validate';
import type { InternalField } from './types';

describe('Enhanced Validation', () => {
  describe('validateRow', () => {
    it('should validate required fields', () => {
      const rowData = {
        firstName: '',
        lastName: 'Mustermann'
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      
      expect(issues.some(issue => 
        issue.type === 'error' && 
        issue.field === 'firstName' && 
        issue.message.includes('Pflichtfeld')
      )).toBe(true);
    });

    it('should validate email format', () => {
      const rowData = {
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'invalid-email'
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      
      expect(issues.some(issue => 
        issue.field === 'email' && 
        issue.message.includes('Ungültige E-Mail-Adresse')
      )).toBe(true);
    });

    it('should validate Austrian phone numbers', () => {
      const validPhones = ['+43 1 234 5678', '01 234 5678', '+43 664 123 4567'];
      const invalidPhones = ['123', 'abc', '+1 555 123 4567'];
      
      validPhones.forEach(phone => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          phone
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        const phoneIssues = issues.filter(issue => issue.field === 'phone');
        expect(phoneIssues.length).toBe(0);
      });
      
      invalidPhones.forEach(phone => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          phone
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        expect(issues.some(issue => issue.field === 'phone')).toBe(true);
      });
    });

    it('should validate Austrian postal codes', () => {
      const validZips = ['1010', '8010', '12345']; // Austrian (4) and German (5)
      const invalidZips = ['123', '123456', 'ABC12'];
      
      validZips.forEach(zip => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          zip
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        const zipIssues = issues.filter(issue => issue.field === 'zip');
        expect(zipIssues.length).toBe(0);
      });
      
      invalidZips.forEach(zip => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          zip
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        expect(issues.some(issue => issue.field === 'zip')).toBe(true);
      });
    });

    it('should validate SV numbers', () => {
      const validSvNumbers = ['1234 123456', '1234123456'];
      const invalidSvNumbers = ['123', '12345', 'ABC123456'];
      
      validSvNumbers.forEach(svNumber => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          svNumber
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        const svIssues = issues.filter(issue => issue.field === 'svNumber');
        expect(svIssues.length).toBe(0);
      });
      
      invalidSvNumbers.forEach(svNumber => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          svNumber
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        expect(issues.some(issue => issue.field === 'svNumber')).toBe(true);
      });
    });

    it('should validate date formats', () => {
      const validDates = ['15.03.1985', '2023-12-25', '2023-12-25T10:30:00'];
      const invalidDates = ['32.13.2023', 'invalid-date', '2023/25/12'];
      
      validDates.forEach(birthDate => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          birthDate
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        const dateIssues = issues.filter(issue => issue.field === 'birthDate');
        expect(dateIssues.length).toBe(0);
      });
      
      invalidDates.forEach(birthDate => {
        const rowData = {
          firstName: 'Max',
          lastName: 'Mustermann',
          birthDate
        } as Record<InternalField, any>;
        
        const issues = validateRow(rowData, 1);
        expect(issues.some(issue => issue.field === 'birthDate')).toBe(true);
      });
    });

    it('should validate cross-field consistency', () => {
      // Entry date after exit date
      const rowData = {
        firstName: 'Max',
        lastName: 'Mustermann',
        entryDate: '2023-12-25',
        exitDate: '2023-01-15'
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      
      expect(issues.some(issue => 
        issue.message.includes('Eintrittsdatum liegt nach Austrittsdatum')
      )).toBe(true);
    });

    it('should warn about old follow-up dates', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago
      
      const rowData = {
        firstName: 'Max',
        lastName: 'Mustermann',
        followUp: oldDate.toISOString().split('T')[0]
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      
      expect(issues.some(issue => 
        issue.field === 'followUp' && 
        issue.type === 'warning'
      )).toBe(true);
    });

    it('should require at least one name', () => {
      const rowData = {
        firstName: '',
        lastName: ''
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      
      expect(issues.some(issue => 
        issue.message.includes('Weder Vor- noch Nachname vorhanden')
      )).toBe(true);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple rows and provide stats', () => {
      const rows = [
        { firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com' },
        { firstName: '', lastName: 'Schmidt', email: 'invalid-email' }, // Error
        { firstName: 'Anna', lastName: 'Müller', phone: '123' } // Warning
      ] as Array<Record<InternalField, any>>;
      
      const result = validateBatch(rows);
      
      expect(result.stats.totalRows).toBe(3);
      expect(result.stats.validRows).toBe(1);
      expect(result.stats.errorRows).toBe(1);
      expect(result.stats.warningRows).toBe(1);
      expect(result.valid).toBe(false); // Has errors
    });

    it('should call progress callback', () => {
      const rows = Array(10).fill({
        firstName: 'Max',
        lastName: 'Mustermann'
      }) as Array<Record<InternalField, any>>;
      
      const progressCalls: number[] = [];
      validateBatch(rows, (progress) => {
        progressCalls.push(progress);
      });
      
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1]).toBe(1.0);
    });
  });

  describe('quickValidate', () => {
    it('should quickly validate single values', () => {
      expect(quickValidate('email', 'test@example.com').valid).toBe(true);
      expect(quickValidate('email', 'invalid-email').valid).toBe(false);
      expect(quickValidate('email', 'invalid-email').message).toContain('Ungültige E-Mail-Adresse');
      
      expect(quickValidate('zip', '1010').valid).toBe(true);
      expect(quickValidate('zip', '123').valid).toBe(false);
      
      expect(quickValidate('firstName', 'Max').valid).toBe(true);
      expect(quickValidate('firstName', '').valid).toBe(false);
    });
  });

  describe('suggestFixes', () => {
    it('should suggest bulk fixes for common issues', () => {
      const issues = [
        { type: 'error' as const, row: 1, field: 'email' as InternalField, message: 'Invalid email', value: 'test.example.com' },
        { type: 'error' as const, row: 2, field: 'email' as InternalField, message: 'Invalid email', value: 'user.domain.com' },
        { type: 'error' as const, row: 3, field: 'email' as InternalField, message: 'Invalid email', value: 'admin.company.com' }
      ];
      
      const suggestions = suggestFixes(issues);
      
      expect(suggestions.some(suggestion => 
        suggestion.type === 'bulk_fix' && 
        suggestion.description.includes('E-Mail-Adressen')
      )).toBe(true);
    });

    it('should suggest data transformations', () => {
      const issues = [
        { type: 'warning' as const, row: 1, field: 'phone' as InternalField, message: 'Phone format', value: '01234567' },
        { type: 'warning' as const, row: 2, field: 'phone' as InternalField, message: 'Phone format', value: '09876543' },
        { type: 'warning' as const, row: 3, field: 'phone' as InternalField, message: 'Phone format', value: '05555555' }
      ];
      
      const suggestions = suggestFixes(issues);
      
      expect(suggestions.some(suggestion => 
        suggestion.type === 'data_transform' && 
        suggestion.description.includes('Telefonnummern')
      )).toBe(true);
    });

    it('should not suggest fixes for isolated issues', () => {
      const issues = [
        { type: 'error' as const, row: 1, field: 'email' as InternalField, message: 'Invalid email', value: 'test' },
        { type: 'error' as const, row: 2, field: 'phone' as InternalField, message: 'Invalid phone', value: '123' }
      ];
      
      const suggestions = suggestFixes(issues);
      
      // Should not suggest bulk fixes for single occurrences
      expect(suggestions.length).toBe(0);
    });
  });

  describe('domain-specific validation', () => {
    it('should validate AMS-specific fields', () => {
      const rowData = {
        firstName: 'Max',
        lastName: 'Mustermann',
        amsId: 'A12345',
        status: 'offen',
        priority: 'hoch',
        angebot: 'BAM'
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      const errors = issues.filter(issue => issue.type === 'error');
      
      expect(errors.length).toBe(0); // All valid AMS values
    });

    it('should warn about unknown status values', () => {
      const rowData = {
        firstName: 'Max',
        lastName: 'Mustermann',
        status: 'unknown-status'
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      
      expect(issues.some(issue => 
        issue.field === 'status' && 
        issue.type === 'warning' &&
        issue.message.includes('Unbekannter Status-Wert')
      )).toBe(true);
    });

    it('should warn about short names', () => {
      const rowData = {
        firstName: 'A',
        lastName: 'B'
      } as Record<InternalField, any>;
      
      const issues = validateRow(rowData, 1);
      
      expect(issues.some(issue => 
        issue.field === 'firstName' && 
        issue.message.includes('Name ist sehr kurz')
      )).toBe(true);
    });
  });
});