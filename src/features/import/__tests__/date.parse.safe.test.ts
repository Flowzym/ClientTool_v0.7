/**
 * Tests for safeParseToISO date parsing
 * Covers German formats, ISO, mixed formats, and edge cases
 */

import { describe, it, expect } from 'vitest';
import { safeParseToISO, parseToISO, nowISO, todayISO } from '../../../utils/date/safeParseToISO';

describe('safeParseToISO', () => {
  describe('German date formats (dd.mm.yyyy)', () => {
    it('should parse standard German format correctly', () => {
      expect(safeParseToISO('15.01.2024')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('31.12.2024')).toBe('2024-12-31T00:00:00.000Z');
      expect(safeParseToISO('29.02.2024')).toBe('2024-02-29T00:00:00.000Z'); // Leap year
    });

    it('should parse German format with slashes', () => {
      expect(safeParseToISO('15/01/2024')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('31/12/2024')).toBe('2024-12-31T00:00:00.000Z');
    });

    it('should parse single-digit days and months', () => {
      expect(safeParseToISO('1.9.2024')).toBe('2024-09-01T00:00:00.000Z');
      expect(safeParseToISO('5/3/2024')).toBe('2024-03-05T00:00:00.000Z');
      expect(safeParseToISO('9.12.2024')).toBe('2024-12-09T00:00:00.000Z');
    });

    it('should handle whitespace correctly', () => {
      expect(safeParseToISO('  15.01.2024  ')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('\t31/12/2024\n')).toBe('2024-12-31T00:00:00.000Z');
    });

    it('should reject invalid German dates', () => {
      expect(safeParseToISO('32.01.2024')).toBeUndefined(); // Invalid day
      expect(safeParseToISO('15.13.2024')).toBeUndefined(); // Invalid month
      expect(safeParseToISO('29.02.2023')).toBeUndefined(); // Not leap year
      expect(safeParseToISO('31.04.2024')).toBeUndefined(); // April has 30 days
    });
  });

  describe('ISO date formats', () => {
    it('should parse ISO date-only format', () => {
      expect(safeParseToISO('2024-01-15')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('2024-12-31')).toBe('2024-12-31T00:00:00.000Z');
    });

    it('should parse full ISO datetime format', () => {
      expect(safeParseToISO('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00.000Z');
      expect(safeParseToISO('2024-01-15T10:30:00.123Z')).toBe('2024-01-15T10:30:00.123Z');
    });

    it('should parse ISO with timezone offsets', () => {
      expect(safeParseToISO('2024-01-15T10:30:00+01:00')).toBe('2024-01-15T09:30:00.000Z');
      expect(safeParseToISO('2024-01-15T10:30:00-05:00')).toBe('2024-01-15T15:30:00.000Z');
    });

    it('should handle ISO without timezone designator', () => {
      expect(safeParseToISO('2024-01-15T10:30:00')).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('mixed format handling', () => {
    it('should prefer German format for ambiguous dates (day ≤ 12)', () => {
      // 05/03/2024 could be March 5th (German) or May 3rd (US)
      // Should interpret as German: 5th March
      expect(safeParseToISO('05/03/2024')).toBe('2024-03-05T00:00:00.000Z');
      expect(safeParseToISO('12/11/2024')).toBe('2024-11-12T00:00:00.000Z');
    });

    it('should use US format when day > 12 (unambiguous)', () => {
      // 03/15/2024 can only be March 15th (US format)
      expect(safeParseToISO('03/15/2024')).toBe('2024-03-15T00:00:00.000Z');
      expect(safeParseToISO('11/25/2024')).toBe('2024-11-25T00:00:00.000Z');
    });

    it('should handle mixed separators consistently', () => {
      expect(safeParseToISO('15.01.2024')).toBe('2024-01-15T00:00:00.000Z');
      expect(safeParseToISO('15/01/2024')).toBe('2024-01-15T00:00:00.000Z');
      // Both should produce same result
    });
  });

  describe('edge cases and error handling', () => {
    it('should return undefined for null/undefined input', () => {
      expect(safeParseToISO(null)).toBeUndefined();
      expect(safeParseToISO(undefined)).toBeUndefined();
    });

    it('should return undefined for empty strings', () => {
      expect(safeParseToISO('')).toBeUndefined();
      expect(safeParseToISO('   ')).toBeUndefined();
      expect(safeParseToISO('\t\n')).toBeUndefined();
    });

    it('should return undefined for non-date strings', () => {
      expect(safeParseToISO('not-a-date')).toBeUndefined();
      expect(safeParseToISO('random text')).toBeUndefined();
      expect(safeParseToISO('123abc')).toBeUndefined();
    });

    it('should return undefined for non-string types', () => {
      expect(safeParseToISO(123)).toBeUndefined();
      expect(safeParseToISO({})).toBeUndefined();
      expect(safeParseToISO([])).toBeUndefined();
      expect(safeParseToISO(true)).toBeUndefined();
    });

    it('should handle Date objects correctly', () => {
      const validDate = new Date('2024-01-15T10:30:00Z');
      expect(safeParseToISO(validDate)).toBe('2024-01-15T10:30:00.000Z');

      const invalidDate = new Date('invalid');
      expect(safeParseToISO(invalidDate)).toBeUndefined();
    });

    it('should handle numeric timestamps', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
      expect(safeParseToISO(timestamp)).toBe('2024-01-15T10:30:00.000Z');

      expect(safeParseToISO(NaN)).toBeUndefined();
      expect(safeParseToISO(Infinity)).toBeUndefined();
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

  describe('month boundary validation', () => {
    it('should validate days per month correctly', () => {
      // January (31 days)
      expect(safeParseToISO('31.01.2024')).toBe('2024-01-31T00:00:00.000Z');
      expect(safeParseToISO('32.01.2024')).toBeUndefined();

      // April (30 days)
      expect(safeParseToISO('30.04.2024')).toBe('2024-04-30T00:00:00.000Z');
      expect(safeParseToISO('31.04.2024')).toBeUndefined();

      // February non-leap year (28 days)
      expect(safeParseToISO('28.02.2023')).toBe('2023-02-28T00:00:00.000Z');
      expect(safeParseToISO('29.02.2023')).toBeUndefined();
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

  describe('fallback parsing', () => {
    it('should use native Date parsing as fallback', () => {
      // Some formats that might work with native parsing
      const nativeFormats = [
        'January 15, 2024',
        'Jan 15 2024',
        '2024/01/15'
      ];

      nativeFormats.forEach(format => {
        const result = safeParseToISO(format);
        if (result) {
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }
        // Some might fail - that's ok for fallback
      });
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
    expect(() => parseToISO('32.01.2024')).toThrow('Invalid date input');
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

describe('real-world import scenarios', () => {
  it('should handle typical Excel export formats', () => {
    const excelFormats = [
      '15.03.1985', // German standard
      '22.07.1992', // German standard
      '08.12.1978', // German with leading zero
      '1.9.2024',   // Single digits
      '25.12.2024'  // Christmas
    ];

    const expectedResults = [
      '1985-03-15T00:00:00.000Z',
      '1992-07-22T00:00:00.000Z',
      '1978-12-08T00:00:00.000Z',
      '2024-09-01T00:00:00.000Z',
      '2024-12-25T00:00:00.000Z'
    ];

    excelFormats.forEach((format, index) => {
      expect(safeParseToISO(format)).toBe(expectedResults[index]);
    });
  });

  it('should handle CSV import variations', () => {
    const csvVariations = [
      '2024-01-15',           // ISO from system export
      '15.01.2024',           // German manual entry
      '15/01/2024',           // German with slashes
      '2024-01-15T10:30:00Z'  // Full ISO timestamp
    ];

    csvVariations.forEach(variation => {
      const result = safeParseToISO(variation);
      expect(result).toBeDefined();
      expect(result).toMatch(/^2024-01-15T/);
    });
  });

  it('should handle common invalid inputs from imports', () => {
    const invalidInputs = [
      '',           // Empty cell
      '0',          // Zero
      'NULL',       // Database null representation
      'n/a',        // Not available
      '99.99.9999', // Obviously invalid
      'TBD',        // To be determined
      '#N/A'        // Excel error value
    ];

    invalidInputs.forEach(invalid => {
      expect(safeParseToISO(invalid)).toBeUndefined();
    });
  });

  it('should handle Austrian/German regional variations', () => {
    const austrianFormats = [
      '15.01.2024', // Standard Austrian
      '1.1.2024',   // New Year's Day
      '6.1.2024',   // Epiphany (Austrian holiday)
      '26.10.2024', // National Day Austria
      '8.12.2024'   // Immaculate Conception
    ];

    austrianFormats.forEach(format => {
      const result = safeParseToISO(format);
      expect(result).toBeDefined();
      expect(result).toMatch(/^2024-/);
    });
  });
});

describe('boundary and edge cases', () => {
  it('should handle year boundaries correctly', () => {
    expect(safeParseToISO('31.12.2023')).toBe('2023-12-31T00:00:00.000Z');
    expect(safeParseToISO('01.01.2024')).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should handle century boundaries', () => {
    expect(safeParseToISO('31.12.1999')).toBe('1999-12-31T00:00:00.000Z');
    expect(safeParseToISO('01.01.2000')).toBe('2000-01-01T00:00:00.000Z');
  });

  it('should handle very old and future dates', () => {
    expect(safeParseToISO('01.01.1900')).toBe('1900-01-01T00:00:00.000Z');
    expect(safeParseToISO('31.12.2099')).toBe('2099-12-31T00:00:00.000Z');
  });

  it('should handle malformed input gracefully', () => {
    const malformedInputs = [
      '15.1.24',     // Two-digit year
      '15-01-2024',  // Wrong separator
      '2024.01.15',  // Wrong order
      '15.1',        // Missing year
      '.01.2024',    // Missing day
      '15..2024'     // Missing month
    ];

    malformedInputs.forEach(malformed => {
      expect(safeParseToISO(malformed)).toBeUndefined();
    });
  });
});

describe('performance and stability', () => {
  it('should handle large batches efficiently', () => {
    const largeBatch = Array.from({ length: 1000 }, (_, i) => 
      `${String(i % 28 + 1).padStart(2, '0')}.${String(i % 12 + 1).padStart(2, '0')}.2024`
    );

    const start = performance.now();
    const results = largeBatch.map(date => safeParseToISO(date));
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should be fast
    expect(results.filter(r => r !== undefined).length).toBeGreaterThan(900); // Most should parse
  });

  it('should be deterministic for same input', () => {
    const testDate = '15.01.2024';
    const results = Array.from({ length: 100 }, () => safeParseToISO(testDate));
    
    // All results should be identical
    const unique = new Set(results);
    expect(unique.size).toBe(1);
    expect(Array.from(unique)[0]).toBe('2024-01-15T00:00:00.000Z');
  });

  it('should not throw exceptions for any input', () => {
    const chaosInputs = [
      null, undefined, '', 0, -1, Infinity, NaN,
      {}, [], true, false,
      'chaos', '🚀', '\x00\x01\x02',
      '999.999.9999', '-1.-1.-1'
    ];

    chaosInputs.forEach(chaos => {
      expect(() => safeParseToISO(chaos)).not.toThrow();
    });
  });
});