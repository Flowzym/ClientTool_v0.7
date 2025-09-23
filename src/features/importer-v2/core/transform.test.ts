/**
 * Tests for data transformation utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  buildPhone, 
  parseDate, 
  normalizeGender, 
  normalizeBookingStatus,
  applyMapping,
  validateTransformedRecord,
  batchTransform,
  type TransformOptions,
  type InternalRecord
} from './transform';
import type { InternalField } from './types';

describe('Transform Utilities', () => {
  describe('buildPhone', () => {
    it('should parse Austrian landline format', () => {
      const result = buildPhone('+43 1 234 5678');
      expect(result.countryDialCode).toBe('+43');
      expect(result.areaDialCode).toBe('1');
      expect(result.phoneNumber).toBe('234 5678');
      expect(result.phoneDisplay).toBe('+43 1 234 5678');
    });

    it('should parse Austrian mobile format', () => {
      const result = buildPhone('+43 664 123 4567');
      expect(result.countryDialCode).toBe('+43');
      expect(result.areaDialCode).toBe('664');
      expect(result.phoneNumber).toBe('123 4567');
      expect(result.phoneDisplay).toBe('+43 664 123 4567');
    });

    it('should parse local Austrian format', () => {
      const result = buildPhone('01 234 5678');
      expect(result.countryDialCode).toBe('+1');
      expect(result.areaDialCode).toBe('234');
      expect(result.phoneNumber).toBe('5678');
      expect(result.phoneDisplay).toBe('01 234 5678');
    });

    it('should handle object input', () => {
      const result = buildPhone({ country: '+43', area: '1', number: '234 5678' });
      expect(result.countryDialCode).toBe('+43');
      expect(result.areaDialCode).toBe('1');
      expect(result.phoneNumber).toBe('234 5678');
      expect(result.phoneDisplay).toBe('+43 1 234 5678');
    });

    it('should handle empty input gracefully', () => {
      const result = buildPhone('');
      expect(result.phoneDisplay).toBe('');
      expect(result.countryDialCode).toBeUndefined();
    });
  });

  describe('parseDate', () => {
    it('should parse German date format', () => {
      expect(parseDate('15.01.2024')).toBe('2024-01-15T00:00:00.000Z');
      expect(parseDate('1.9.2024')).toBe('2024-09-01T00:00:00.000Z');
    });

    it('should parse ISO format', () => {
      expect(parseDate('2024-01-15')).toBe('2024-01-15T00:00:00.000Z');
      expect(parseDate('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate(null)).toBeNull();
    });
  });

  describe('normalizeGender', () => {
    it('should normalize male variants', () => {
      expect(normalizeGender('m')).toBe('M');
      expect(normalizeGender('male')).toBe('M');
      expect(normalizeGender('männlich')).toBe('M');
      expect(normalizeGender('MANN')).toBe('M');
    });

    it('should normalize female variants', () => {
      expect(normalizeGender('f')).toBe('F');
      expect(normalizeGender('w')).toBe('F');
      expect(normalizeGender('female')).toBe('F');
      expect(normalizeGender('weiblich')).toBe('F');
    });

    it('should normalize diverse variants', () => {
      expect(normalizeGender('d')).toBe('D');
      expect(normalizeGender('diverse')).toBe('D');
      expect(normalizeGender('other')).toBe('D');
      expect(normalizeGender('x')).toBe('D');
    });

    it('should return null for unknown values', () =>  {
      expect(normalizeGender('unknown')).toBeNull();
      expect(normalizeGender('')).toBeNull();
      expect(normalizeGender(null)).toBeNull();
    });
  });

  describe('normalizeBookingStatus', () => {
    it('should normalize known status values', () => {
      expect(normalizeBookingStatus('offen')).toBe('offen');
      expect(normalizeBookingStatus('GEBUCHT')).toBe('gebucht');
      expect(normalizeBookingStatus('Abgeschlossen')).toBe('abgeschlossen');
    });

    it('should preserve unknown status as-is', () => {
      expect(normalizeBookingStatus('custom status')).toBe('custom status');
      expect(normalizeBookingStatus('Sonderstatus')).toBe('Sonderstatus');
    });
  });

  describe('applyMapping', () => {
    const mockMapping = new Map<string, InternalField>([
      ['Name', 'firstName'],
      ['Nachname', 'lastName'],
      ['E-Mail', 'email'],
      ['Telefon', 'phone']
    ]);

    const mockOptions: TransformOptions = {
      dateFormat: 'auto',
      phoneFormat: 'international',
      genderMapping: { m: 'M', f: 'F' },
      customFields: []
    };

    it('should map basic fields correctly', () => {
      const row = ['Max', 'Mustermann', 'max@example.com', '+43 1 234 5678'];
      const headers = ['Name', 'Nachname', 'E-Mail', 'Telefon'];
      
      const result = applyMapping(row, headers, mockMapping, mockOptions);
      
      expect(result.firstName).toBe('Max');
      expect(result.lastName).toBe('Mustermann');
      expect(result.email).toBe('max@example.com');
      expect(result.phone).toBe('+43 1 234 5678');
    });

    it('should handle missing values gracefully', () => {
      const row = ['Max', '', 'max@example.com'];
      const headers = ['Name', 'Nachname', 'E-Mail'];
      
      const result = applyMapping(row, headers, mockMapping, mockOptions);
      
      expect(result.firstName).toBe('Max');
      expect(result.lastName).toBe('');
      expect(result.email).toBe('max@example.com');
    });
  });

  describe('validateTransformedRecord', () => {
    it('should validate required fields', () => {
      const record: Partial<InternalRecord> = {
        firstName: 'Max',
        lastName: 'Mustermann'
      };
      
      const result = validateTransformedRecord(record, ['firstName', 'lastName', 'email']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('email ist erforderlich');
    });

    it('should validate email format', () => {
      const record: Partial<InternalRecord> = {
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'invalid-email'
      };
      
      const result = validateTransformedRecord(record, ['firstName', 'lastName', 'email']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('email hat ungültiges Format');
    });

    it('should pass valid record', () => {
      const record: Partial<InternalRecord> = {
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com'
      };
      
      const result = validateTransformedRecord(record, ['firstName', 'lastName', 'email']);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('batchTransform', () => {
    const mockMapping = new Map<string, InternalField>([
      ['Name', 'firstName'],
      ['Email', 'email']
    ]);

    const mockOptions: TransformOptions = {
      dateFormat: 'auto',
      phoneFormat: 'international',
      genderMapping: {},
      customFields: []
    };

    it('should transform valid rows', async () => {
      const rows = [
        ['Max', 'max@example.com'],
        ['Anna', 'anna@example.com']
      ];
      const headers = ['Name', 'Email'];
      
      const results = [];
      const onProgress = (progress: any) => results.push(progress);
      
      const transformed = await batchTransform(
        rows, 
        headers, 
        mockMapping, 
        mockOptions, 
        ['firstName', 'email'],
        onProgress
      );
      
      expect(transformed.successful).toHaveLength(2);
      expect(transformed.failed).toHaveLength(0);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle validation errors gracefully', async () => {
      const rows = [
        ['Max', 'invalid-email'],
        ['Anna', 'anna@example.com']
      ];
      const headers = ['Name', 'Email'];
      
      const transformed = await batchTransform(
        rows, 
        headers, 
        mockMapping, 
        mockOptions, 
        ['firstName', 'email']
      );
      
      expect(transformed.successful).toHaveLength(1);
      expect(transformed.failed).toHaveLength(1);
      expect(transformed.failed[0].errors).toContain('email hat ungültiges Format');
    });
  });
});