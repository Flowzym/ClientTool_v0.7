/**
 * Tests for column mapping scoring functions
 */

import { describe, it, expect } from 'vitest';
import { guessColumn, guessAllMappings, calculateMappingQuality } from '../score';
import type { InternalField } from '../types';

describe('guessColumn', () => {
  it('should score exact alias matches highly', () => {
    const result = guessColumn('firstName', ['vorname', 'nachname', 'telefon']);
    expect(result.field).toBe('firstName');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.hints.exactAlias).toBe(true);
  });

  it('should handle broken encoding variants', () => {
    const result = guessColumn('firstName', ['vorname�', 'nachname', 'telefon']);
    expect(result.field).toBe('firstName');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should score token overlap', () => {
    const result = guessColumn('firstName', ['vor name', 'nach name', 'telefon nummer']);
    expect(result.field).toBe('firstName');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.hints.tokenOverlap).toBeGreaterThan(0);
  });

  it('should handle fuzzy matching', () => {
    const result = guessColumn('firstName', ['vornme', 'nachname', 'telefon']); // typo in "vorname"
    expect(result.field).toBe('firstName');
    expect(result.confidence).toBeGreaterThan(0.3);
    expect(result.hints.fuzzyScore).toBeGreaterThan(0);
  });

  it('should return low confidence for no matches', () => {
    const result = guessColumn('firstName', ['unrelated', 'columns', 'here']);
    expect(result.field).toBe('firstName');
    expect(result.confidence).toBeLessThan(0.3);
  });

  it('should handle empty candidates', () => {
    const result = guessColumn('firstName', []);
    expect(result.field).toBe('firstName');
    expect(result.confidence).toBe(0);
    expect(result.reasons).toContain('Keine Kandidaten verfügbar');
  });
});

describe('guessAllMappings', () => {
  it('should map multiple fields correctly', () => {
    const fields: InternalField[] = ['firstName', 'lastName', 'phone'];
    const columns = ['vorname', 'nachname', 'telefon'];
    
    const result = guessAllMappings(fields, columns);
    
    expect(Object.keys(result)).toHaveLength(3);
    expect(result['vorname']?.field).toBe('firstName');
    expect(result['nachname']?.field).toBe('lastName');
    expect(result['telefon']?.field).toBe('phone');
  });

  it('should prioritize required fields', () => {
    const fields: InternalField[] = ['firstName', 'lastName', 'email'];
    const columns = ['vorname', 'nachname']; // Missing email column
    
    const result = guessAllMappings(fields, columns);
    
    // Should map the available required fields
    expect(result['vorname']?.field).toBe('firstName');
    expect(result['nachname']?.field).toBe('lastName');
  });

  it('should avoid duplicate column assignments', () => {
    const fields: InternalField[] = ['firstName', 'lastName'];
    const columns = ['name']; // Ambiguous column
    
    const result = guessAllMappings(fields, columns);
    
    // Should assign to only one field (likely firstName due to priority)
    const assignedColumns = Object.keys(result);
    expect(assignedColumns).toHaveLength(1);
  });
});

describe('calculateMappingQuality', () => {
  it('should calculate quality metrics correctly', () => {
    const mappings = {
      'vorname': { field: 'firstName' as InternalField, confidence: 0.9, reasons: [], hints: {} },
      'nachname': { field: 'lastName' as InternalField, confidence: 0.8, reasons: [], hints: {} },
      'telefon': { field: 'phone' as InternalField, confidence: 0.7, reasons: [], hints: {} }
    };
    
    const quality = calculateMappingQuality(mappings, ['firstName', 'lastName']);
    
    expect(quality.score).toBeGreaterThan(0.7);
    expect(quality.coverage).toBe(1.0); // All columns mapped
    expect(quality.requiredCoverage).toBe(1.0); // All required fields mapped
    expect(quality.averageConfidence).toBeCloseTo(0.8);
  });

  it('should penalize missing required fields', () => {
    const mappings = {
      'telefon': { field: 'phone' as InternalField, confidence: 0.9, reasons: [], hints: {} }
    };
    
    const quality = calculateMappingQuality(mappings, ['firstName', 'lastName']);
    
    expect(quality.requiredCoverage).toBe(0); // No required fields mapped
    expect(quality.score).toBeLessThan(0.5); // Should be low due to missing required fields
  });

  it('should handle empty mappings', () => {
    const quality = calculateMappingQuality({}, ['firstName', 'lastName']);
    
    expect(quality.score).toBe(0);
    expect(quality.coverage).toBe(0);
    expect(quality.requiredCoverage).toBe(0);
    expect(quality.averageConfidence).toBe(0);
  });
});