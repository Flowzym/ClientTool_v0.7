/**
 * Tests for header normalization and encoding repair
 */

import { describe, it, expect } from 'vitest';
import { normalizeHeader, displayHeader, levenshteinDistance, jaroWinklerSimilarity, tokenOverlapRatio } from '../normalize';

describe('Header Normalization', () => {
  describe('normalizeHeader', () => {
    it('should repair broken umlauts and ß', () => {
      const testCases = [
        { input: 'Stra�e', expected: 'Straße' },
        { input: 'Ma�nahme', expected: 'Maßnahme' },
        { input: 'Ma�nahmennummer', expected: 'Maßnahmennummer' },
        { input: 'Geb�ude', expected: 'Gebäude' },
        { input: 'Gr��e', expected: 'Größe' },
        { input: 'Priorit�t', expected: 'Priorität' },
        { input: 'Aktivit�t', expected: 'Aktivität' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeHeader(input);
        expect(result.fixed).toBe(expected);
        expect(result.repairs.length).toBeGreaterThan(0);
      });
    });

    it('should handle UTF-8 mojibake artifacts', () => {
      const testCases = [
        { input: 'Ã¤', expected: 'ä' },
        { input: 'Ã¶', expected: 'ö' },
        { input: 'Ã¼', expected: 'ü' },
        { input: 'ÃŸ', expected: 'ß' },
        { input: 'Ã„', expected: 'Ä' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeHeader(input);
        expect(result.fixed).toBe(expected);
      });
    });

    it('should normalize whitespace and clean text', () => {
      const result = normalizeHeader('  Vor   name   ');
      expect(result.fixed).toBe('Vor name');
      expect(result.tokens).toContain('vor');
      expect(result.tokens).toContain('name');
    });

    it('should tokenize headers correctly', () => {
      const result = normalizeHeader('AMS-Berater_Nachname');
      expect(result.tokens).toEqual(['ams', 'berater', 'nachname']);
    });

    it('should handle empty and invalid input', () => {
      expect(normalizeHeader('').fixed).toBe('');
      expect(normalizeHeader(null as any).fixed).toBe('');
      expect(normalizeHeader(undefined as any).fixed).toBe('');
    });

    it('should preserve original for reference', () => {
      const original = 'Stra�e mit Fehlern';
      const result = normalizeHeader(original);
      expect(result.original).toBe(original);
      expect(result.fixed).toBe('Straße mit Fehlern');
    });
  });

  describe('displayHeader', () => {
    it('should return display-friendly headers', () => {
      expect(displayHeader('stra�e')).toBe('Straße');
      expect(displayHeader('ma�nahme')).toBe('Maßnahme');
      expect(displayHeader('vor name')).toBe('Vor Name');
      expect(displayHeader('ams-id')).toBe('Ams-Id');
    });

    it('should handle empty input gracefully', () => {
      expect(displayHeader('')).toBe('');
      expect(displayHeader(null as any)).toBe('');
      expect(displayHeader(undefined as any)).toBe('');
    });
  });

  describe('levenshteinDistance', () => {
    it('should calculate edit distance correctly', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('abc', 'abc')).toBe(0);
      expect(levenshteinDistance('abc', 'ab')).toBe(1);
      expect(levenshteinDistance('abc', 'def')).toBe(3);
      expect(levenshteinDistance('telefon', 'telefonnummer')).toBe(6);
    });

    it('should handle German characters', () => {
      expect(levenshteinDistance('straße', 'strasse')).toBe(1);
      expect(levenshteinDistance('größe', 'groesse')).toBe(2);
    });
  });

  describe('jaroWinklerSimilarity', () => {
    it('should calculate similarity correctly', () => {
      expect(jaroWinklerSimilarity('', '')).toBe(1.0);
      expect(jaroWinklerSimilarity('abc', 'abc')).toBe(1.0);
      expect(jaroWinklerSimilarity('', 'abc')).toBe(0.0);
      expect(jaroWinklerSimilarity('abc', '')).toBe(0.0);
    });

    it('should give higher scores for prefix matches', () => {
      const prefixScore = jaroWinklerSimilarity('telefon', 'telefonnummer');
      const noPrefix = jaroWinklerSimilarity('telefon', 'nummerfon');
      expect(prefixScore).toBeGreaterThan(noPrefix);
    });

    it('should handle German field names', () => {
      const score = jaroWinklerSimilarity('nachname', 'nach-name');
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('tokenOverlapRatio', () => {
    it('should calculate token overlap correctly', () => {
      expect(tokenOverlapRatio(['a', 'b'], ['a', 'b'])).toBe(1.0);
      expect(tokenOverlapRatio(['a', 'b'], ['a', 'c'])).toBe(0.5);
      expect(tokenOverlapRatio(['a'], ['b'])).toBe(0.0);
      expect(tokenOverlapRatio([], ['a'])).toBe(0.0);
    });

    it('should handle German tokens', () => {
      const ratio = tokenOverlapRatio(
        ['ams', 'berater', 'nachname'],
        ['ams', 'betreuer', 'nachname']
      );
      expect(ratio).toBeGreaterThan(0.5); // 2/3 overlap
    });
  });

  describe('real-world broken headers', () => {
    it('should fix common Excel export artifacts', () => {
      const brokenHeaders = [
        'Stra�ennummer',
        'Geb�hren',
        'Pr�fung',
        'Erg�nzung',
        'Erl�uterung',
        'Verf�gung',
        'Zust�ndigkeit',
        'T�tigkeit',
        'Qualit�t'
      ];

      const expectedFixed = [
        'Straßennummer',
        'Gebühren',
        'Prüfung',
        'Ergänzung',
        'Erläuterung',
        'Verfügung',
        'Zuständigkeit',
        'Tätigkeit',
        'Qualität'
      ];

      brokenHeaders.forEach((broken, index) => {
        const result = normalizeHeader(broken);
        expect(result.fixed).toBe(expectedFixed[index]);
        expect(result.repairs.length).toBeGreaterThan(0);
      });
    });

    it('should handle complex broken headers', () => {
      const result = normalizeHeader('AMS-Ma�nahmen_Stra�e Nr.');
      expect(result.fixed).toBe('AMS-Maßnahmen_Straße Nr.');
      expect(result.tokens).toEqual(['ams', 'massnahmen', 'strasse', 'nr']);
      expect(result.repairs.length).toBe(2); // Two repairs
    });

    it('should preserve readable headers unchanged', () => {
      const goodHeaders = [
        'Vorname',
        'Nachname', 
        'E-Mail',
        'Telefon',
        'Straße',
        'Maßnahme'
      ];

      goodHeaders.forEach(header => {
        const result = normalizeHeader(header);
        expect(result.fixed).toBe(header);
        expect(result.repairs).toHaveLength(0);
      });
    });
  });
});