/**
 * Tests für parseToISO und safeParseToISO
 * Robuste Datum-Parsing für AT-Formate
 */

import { describe, it, expect } from 'vitest';
import { parseToISO, safeParseToISO } from '../../src/utils/date';

describe('parseToISO', () => {
  describe('supported formats', () => {
    it('should parse ISO format YYYY-MM-DD', () => {
      expect(parseToISO('2025-09-13')).toBe('2025-09-13T00:00:00.000Z');
      expect(parseToISO('2024-12-31')).toBe('2024-12-31T00:00:00.000Z');
    });

    it('should parse DD.MM.YYYY format', () => {
      expect(parseToISO('13.09.2025')).toBe('2025-09-13T00:00:00.000Z');
      expect(parseToISO('31.12.2024')).toBe('2024-12-31T00:00:00.000Z');
    });

    it('should parse DD/MM/YYYY format', () => {
      expect(parseToISO('13/09/2025')).toBe('2025-09-13T00:00:00.000Z');
      expect(parseToISO('31/12/2024')).toBe('2024-12-31T00:00:00.000Z');
    });

    it('should parse single-digit day/month', () => {
      expect(parseToISO('1/9/2025')).toBe('2025-09-01T00:00:00.000Z');
      expect(parseToISO('5.3.2024')).toBe('2024-03-05T00:00:00.000Z');
    });

    it('should handle whitespace', () => {
      expect(parseToISO('  13.09.2025  ')).toBe('2025-09-13T00:00:00.000Z');
      expect(parseToISO(' 2025-09-13 ')).toBe('2025-09-13T00:00:00.000Z');
    });
  });

  describe('invalid formats', () => {
    it('should throw for empty input', () => {
      expect(() => parseToISO('')).toThrow('parseToISO: empty');
      expect(() => parseToISO('   ')).toThrow('parseToISO: empty');
    });

    it('should throw for invalid dates', () => {
      expect(() => parseToISO('32.13.2024')).toThrow('parseToISO: invalid dd.mm.yyyy');
      expect(() => parseToISO('31.02.2025')).toThrow('parseToISO: invalid dd.mm.yyyy');
    });

    it('should throw for unsupported formats', () => {
      expect(() => parseToISO('not-a-date')).toThrow('parseToISO: unsupported format');
      expect(() => parseToISO('13-09-2025')).toThrow('parseToISO: unsupported format');
    });
  });
});

describe('safeParseToISO', () => {
  describe('successful parsing', () => {
    it('should parse valid formats without throwing', () => {
      expect(safeParseToISO('2025-09-13')).toBe('2025-09-13T00:00:00.000Z');
      expect(safeParseToISO('13.09.2025')).toBe('2025-09-13T00:00:00.000Z');
      expect(safeParseToISO('13/09/2025')).toBe('2025-09-13T00:00:00.000Z');
    });
  });

  describe('graceful failure', () => {
    it('should return undefined for null/undefined/empty', () => {
      expect(safeParseToISO(null)).toBeUndefined();
      expect(safeParseToISO(undefined)).toBeUndefined();
      expect(safeParseToISO('')).toBeUndefined();
      expect(safeParseToISO('   ')).toBeUndefined();
    });

    it('should return undefined for invalid dates', () => {
      expect(safeParseToISO('32.13.2024')).toBeUndefined();
      expect(safeParseToISO('31.02.2025')).toBeUndefined();
    });

    it('should return undefined for unsupported formats', () => {
      expect(safeParseToISO('not-a-date')).toBeUndefined();
      expect(safeParseToISO('13-09-2025')).toBeUndefined();
      expect(safeParseToISO('random text')).toBeUndefined();
    });

    it('should handle non-string inputs', () => {
      expect(safeParseToISO(123)).toBeUndefined();
      expect(safeParseToISO({})).toBeUndefined();
      expect(safeParseToISO([])).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle leap years correctly', () => {
      expect(safeParseToISO('29.02.2024')).toBe('2024-02-29T00:00:00.000Z'); // Leap year
      expect(safeParseToISO('29.02.2023')).toBeUndefined(); // Not leap year
    });

    it('should handle month boundaries', () => {
      expect(safeParseToISO('31.01.2025')).toBe('2025-01-31T00:00:00.000Z');
      expect(safeParseToISO('30.04.2025')).toBe('2025-04-30T00:00:00.000Z');
      expect(safeParseToISO('31.04.2025')).toBeUndefined(); // April has only 30 days
    });
  });
});