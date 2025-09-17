/**
 * Tests for alias dictionary functions
 */

import { describe, it, expect } from 'vitest';
import { getAliases, findFieldByAlias, getAllAliases } from '../aliases';

describe('getAliases', () => {
  it('should return aliases for valid fields', () => {
    const firstNameAliases = getAliases('firstName');
    expect(firstNameAliases).toContain('vorname');
    expect(firstNameAliases).toContain('first name');
    expect(firstNameAliases).toContain('rufname');
  });

  it('should include broken encoding variants', () => {
    const firstNameAliases = getAliases('firstName');
    expect(firstNameAliases).toContain('vorname�');
    expect(firstNameAliases).toContain('vor�name');
  });

  it('should return empty array for invalid fields', () => {
    const aliases = getAliases('invalidField' as any);
    expect(aliases).toEqual([]);
  });
});

describe('findFieldByAlias', () => {
  it('should find fields by exact alias match', () => {
    expect(findFieldByAlias('vorname')).toBe('firstName');
    expect(findFieldByAlias('nachname')).toBe('lastName');
    expect(findFieldByAlias('telefon')).toBe('phone');
  });

  it('should be case insensitive', () => {
    expect(findFieldByAlias('VORNAME')).toBe('firstName');
    expect(findFieldByAlias('Nachname')).toBe('lastName');
    expect(findFieldByAlias('TELEFON')).toBe('phone');
  });

  it('should handle broken encoding variants', () => {
    expect(findFieldByAlias('stra�e')).toBe('address');
    expect(findFieldByAlias('ma�nahme')).toBe('angebot');
  });

  it('should return null for unknown aliases', () => {
    expect(findFieldByAlias('unknown')).toBeNull();
    expect(findFieldByAlias('')).toBeNull();
  });

  it('should handle whitespace', () => {
    expect(findFieldByAlias('  vorname  ')).toBe('firstName');
  });
});

describe('getAllAliases', () => {
  it('should return reverse lookup map', () => {
    const allAliases = getAllAliases();
    expect(allAliases['vorname']).toBe('firstName');
    expect(allAliases['nachname']).toBe('lastName');
    expect(allAliases['telefon']).toBe('phone');
  });

  it('should include all aliases from all fields', () => {
    const allAliases = getAllAliases();
    const aliasCount = Object.keys(allAliases).length;
    expect(aliasCount).toBeGreaterThan(100); // Should have many aliases
  });

  it('should be case normalized', () => {
    const allAliases = getAllAliases();
    expect(allAliases['vorname']).toBeDefined();
    expect(allAliases['VORNAME']).toBeUndefined(); // Should be lowercase
  });
});