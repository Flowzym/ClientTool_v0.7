/**
 * Micro-tests for unified date parsing utility
 * Covers all supported formats and edge cases
 */

import { describe, it, expect } from 'vitest';
import { safeParseToISO, parseToISO, nowISO, todayISO } from '../safeParseToISO';

describe('safeParseToISO', () => {
  describe('supported formats', () => {
    it('should parse ISO format correctly', () => {
      expect(safeParseToISO('2024-01-15')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('2024-12-31')).toBe('2024-12-31T00:00:00.000Z');
      expect(safeParseToISO('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00.000Z');
      expect(safeParseToISO('2024-01-15T10:30:00.123Z')).toBe('2024-01-15T10:30:00.123Z');
    });

    it('should parse German format (dd.mm.yyyy)', () => {
      expect(safeParseToISO('15.01.2024')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('31.12.2024')).toBe('2024-12-31T00:00:00.000Z');
      expect(safeParseToISO('1.9.2024')).toBe('2024-09-01T00:00:00.000Z');
    });

    it('should parse German format with slashes (dd/mm/yyyy)', () => {
      expect(safeParseToISO('15/01/2024')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('31/12/2024')).toBe('2024-12-31T00:00:00.000Z');
      expect(safeParseToISO('1/9/2024')).toBe('2024-09-01T00:00:00.000Z');
    });

    it('should parse US format when day > 12 (mm/dd/yyyy)', () => {
      expect(safeParseToISO('01/15/2024')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('12/25/2024')).toBe('2024-12-25T00:00:00.000Z');
      expect(safeParseToISO('3/20/2024')).toBe('2024-03-20T00:00:00.000Z');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(safeParseToISO(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle numeric timestamps', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
      expect(safeParseToISO(timestamp)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle whitespace correctly', () => {
      expect(safeParseToISO('  15.01.2024  ')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO(' 2024-01-15 ')).toBe('2024-01-15T00:00:00.000Z');
    });
  });

  describe('invalid input handling', () => {
    it('should return undefined for null/undefined', () => {
      expect(safeParseToISO(null)).toBeUndefined();
      expect(safeParseToISO(undefined)).toBeUndefined();
    });

    it('should return undefined for empty strings', () => {
      expect(safeParseToISO('')).toBeUndefined();
      expect(safeParseToISO('   ')).toBeUndefined();
      expect(safeParseToISO('\t\n')).toBeUndefined();
    });

    it('should return undefined for invalid dates', () => {
      expect(safeParseToISO('32.01.2024')).toBeUndefined(); // Invalid day
      expect(safeParseToISO('15.13.2024')).toBeUndefined(); // Invalid month
      expect(safeParseToISO('29.02.2023')).toBeUndefined(); // Not leap year
      expect(safeParseToISO('31.04.2024')).toBeUndefined(); // April has 30 days
    });

    it('should return undefined for non-date strings', () => {
      expect(safeParseToISO('not-a-date')).toBeUndefined();
      expect(safeParseToISO('random text')).toBeUndefined();
      expect(safeParseToISO('123abc')).toBeUndefined();
    });

    it('should return undefined for non-string/non-Date types', () => {
      expect(safeParseToISO({})).toBeUndefined();
      expect(safeParseToISO([])).toBeUndefined();
      expect(safeParseToISO(true)).toBeUndefined();
      expect(safeParseToISO(false)).toBeUndefined();
    });

    it('should handle invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      expect(safeParseToISO(invalidDate)).toBeUndefined();
    });
  });

  describe('ambiguous date handling', () => {
    it('should prefer German format for ambiguous dates (day ≤ 12)', () => {
      // 05/03/2024 could be March 5th (German) or May 3rd (US)
      // Should interpret as German: 5th March
      expect(safeParseToISO('05/03/2024')).toBe('2024-03-05T00:00:00.000Z');
      expect(safeParseToISO('12/11/2024')).toBe('2024-11-12T00:00:00.000Z');
    });

    it('should use US format when day > 12', () => {
      // 03/15/2024 can only be March 15th (US format)
      expect(safeParseToISO('03/15/2024')).toBe('2024-03-15T00:00:00.000Z');
      expect(safeParseToISO('11/25/2024')).toBe('2024-11-25T00:00:00.000Z');
    });
  });

  describe('leap year handling', () => {
    it('should handle leap years correctly', () => {
      expect(safeParseToISO('29.02.2024')).toBe('2024-02-29T00:00:00.000Z'); // 2024 is leap year
      expect(safeParseToISO('29.02.2023')).toBeUndefined(); // 2023 is not leap year
      expect(safeParseToISO('29.02.2000')).toBe('2000-02-29T00:00:00.000Z'); // 2000 is leap year
      expect(safeParseToISO('29.02.1900')).toBeUndefined(); // 1900 is not leap year
    });
  });

  describe('timezone neutrality', () => {
    it('should return UTC timestamps consistently', () => {
      const result = safeParseToISO('15.01.2024');
      expect(result).toBe('2024-01-15T00:00:00.000Z');
      expect(result?.endsWith('Z')).toBe(true);
    });

    it('should preserve timezone info from ISO input', () => {
      expect(safeParseToISO('2024-01-15T10:30:00+01:00')).toBe('2024-01-15T09:30:00.000Z');
      expect(safeParseToISO('2024-01-15T10:30:00-05:00')).toBe('2024-01-15T15:30:00.000Z');
    });
  });
});

describe('parseToISO (strict)', () => {
  it('should return ISO string for valid input', () => {
    expect(parseToISO('15.01.2024')).toBe('2024-01-15T00:00:00.000Z');
    expect(parseToISO('2024-01-15')).toBe('2024-01-15T00:00:00.000Z');
  });

  it('should throw for invalid input', () => {
    expect(() => parseToISO('invalid-date')).toThrow('Invalid date input');
    expect(() => parseToISO('')).toThrow('Invalid date input');
    expect(() => parseToISO(null)).toThrow('Invalid date input');
  });
});

describe('nowISO', () => {
  it('should return current timestamp as ISO string', () => {
    const before = Date.now();
    const result = nowISO();
    const after = Date.now();
    
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    const resultTime = new Date(result).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });
});

describe('todayISO', () => {
  it('should return today as YYYY-MM-DD', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    // Should be today's date
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});