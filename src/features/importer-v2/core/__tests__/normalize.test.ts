/**
 * Tests for header normalization functions
 */

import { describe, it, expect } from 'vitest';
import { normalizeHeader, displayHeader, headersMatch, getTokenOverlap } from '../normalize';

describe('normalizeHeader', () => {
  it('should repair common mojibake patterns', () => {
    const result = normalizeHeader('Stra�e');
    expect(result.fixed).toBe('strasse');
    expect(result.repairs).toContain('� → ');
  });

  it('should repair specific broken field names', () => {
    const result = normalizeHeader('Ma�nahmennummer');
    expect(result.fixed).toBe('massnahmennummer');
    expect(result.repairs).toContain('Ma�nahmennummer → Maßnahmennummer');
  });

  it('should remove diacritics for matching', () => {
    const result = normalizeHeader('Größe');
    expect(result.fixed).toBe('groesse');
    expect(result.tokens).toContain('groesse');
  });

  it('should handle ß correctly', () => {
    const result = normalizeHeader('Straße');
    expect(result.fixed).toBe('strasse');
    expect(result.tokens).toContain('strasse');
  });

  it('should normalize special characters', () => {
    const result = normalizeHeader('Telefon-Nr./Handy');
    expect(result.fixed).toBe('telefon nr handy');
    expect(result.tokens).toEqual(['telefon', 'nr', 'handy']);
  });

  it('should handle multiple whitespace', () => {
    const result = normalizeHeader('  Vor   Name  ');
    expect(result.fixed).toBe('vor name');
    expect(result.tokens).toEqual(['vor', 'name']);
  });

  it('should filter out common German stop words', () => {
    const result = normalizeHeader('Name von der Person');
    expect(result.tokens).toEqual(['name', 'person']);
  });

  it('should handle empty or invalid input', () => {
    expect(normalizeHeader('').fixed).toBe('');
    expect(normalizeHeader(null as any).fixed).toBe('');
    expect(normalizeHeader(undefined as any).fixed).toBe('');
  });
});

describe('displayHeader', () => {
  it('should repair mojibake but preserve formatting', () => {
    expect(displayHeader('Stra�e')).toBe('Straße');
    expect(displayHeader('Ma�nahmennummer')).toBe('Maßnahmennummer');
  });

  it('should preserve proper German capitalization', () => {
    expect(displayHeader('NACHNAME')).toBe('NACHNAME');
    expect(displayHeader('nachname')).toBe('nachname');
  });

  it('should clean up whitespace but preserve case', () => {
    expect(displayHeader('  Vor   Name  ')).toBe('Vor Name');
  });

  it('should handle empty input', () => {
    expect(displayHeader('')).toBe('');
    expect(displayHeader(null as any)).toBe('');
  });
});

describe('headersMatch', () => {
  it('should match equivalent headers', () => {
    expect(headersMatch('Straße', 'Strasse')).toBe(true);
    expect(headersMatch('Telefon-Nr.', 'Telefon Nr')).toBe(true);
    expect(headersMatch('  Vor Name  ', 'VorName')).toBe(true);
  });

  it('should match broken and fixed variants', () => {
    expect(headersMatch('Stra�e', 'Straße')).toBe(true);
    expect(headersMatch('Ma�nahme', 'Maßnahme')).toBe(true);
  });

  it('should not match different headers', () => {
    expect(headersMatch('Vorname', 'Nachname')).toBe(false);
    expect(headersMatch('Telefon', 'Email')).toBe(false);
  });
});

describe('getTokenOverlap', () => {
  it('should calculate correct overlap ratios', () => {
    expect(getTokenOverlap('Vor Name', 'Vorname')).toBeCloseTo(1.0);
    expect(getTokenOverlap('Telefon Nummer', 'Telefon Nr')).toBeCloseTo(0.5);
    expect(getTokenOverlap('Email Adresse', 'Telefon Nummer')).toBe(0);
  });

  it('should handle identical headers', () => {
    expect(getTokenOverlap('Nachname', 'Nachname')).toBe(1.0);
  });

  it('should handle empty headers', () => {
    expect(getTokenOverlap('', '')).toBe(1.0);
    expect(getTokenOverlap('Test', '')).toBe(0);
    expect(getTokenOverlap('', 'Test')).toBe(0);
  });
});