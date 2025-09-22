/**
 * Tests for mapping scoring and column guessing
 */

import { describe, it, expect } from 'vitest';
import { guessColumn, findBestMappings, validateMappingQuality } from '../score';
import type { InternalField } from '../types';

describe('Mapping Scoring', () => {
  describe('guessColumn', () => {
    it('should find exact alias matches with high confidence', () => {
      const candidates = ['Vorname', 'Nachname', 'E-Mail'];
      const guesses = guessColumn('firstName', candidates);
      
      expect(guesses.length).toBeGreaterThan(0);
      const bestGuess = guesses[0];
      expect(bestGuess.field).toBe('firstName');
      expect(bestGuess.confidence).toBeGreaterThan(0.9);
      expect(bestGuess.hints.exactAlias).toBe(true);
    });

    it('should handle broken umlaut headers', () => {
      const candidates = ['Stra�e', 'Ma�nahme', 'Priorit�t'];
      
      // Should still match despite broken encoding
      const addressGuesses = guessColumn('address', candidates);
      expect(addressGuesses.length).toBeGreaterThan(0);
      expect(addressGuesses[0].confidence).toBeGreaterThan(0.5);
    });

    it('should use fuzzy matching for similar headers', () => {
      const candidates = ['Telefonnummer', 'Email-Adresse', 'Geburtsdatum'];
      const phoneGuesses = guessColumn('phone', candidates);
      
      expect(phoneGuesses.length).toBeGreaterThan(0);
      const phoneGuess = phoneGuesses[0];
      expect(phoneGuess.confidence).toBeGreaterThan(0.4);
      expect(phoneGuess.hints.fuzzyScore).toBeGreaterThan(0);
    });

    it('should boost confidence with content analysis', () => {
      const candidates = ['Unbekannt', 'Datum', 'Text'];
      const sampleRows = [
        ['Wert1', '15.03.1985', 'Notiz1'],
        ['Wert2', '22.07.1992', 'Notiz2'],
        ['Wert3', '08.12.1978', 'Notiz3']
      ];
      
      const dateGuesses = guessColumn('birthDate', candidates, sampleRows);
      expect(dateGuesses.length).toBeGreaterThan(0);
      
      // Should boost confidence for column with date content
      const dateGuess = dateGuesses.find(g => g.confidence > 0.3);
      expect(dateGuess).toBeDefined();
    });

    it('should handle token overlap matching', () => {
      const candidates = ['AMS Berater Name', 'Kunden Nummer', 'Telefon Nr'];
      const amsGuesses = guessColumn('amsAdvisor', candidates);
      
      expect(amsGuesses.length).toBeGreaterThan(0);
      const amsGuess = amsGuesses[0];
      expect(amsGuess.confidence).toBeGreaterThan(0.3);
      expect(amsGuess.hints.tokenOverlap).toBeGreaterThan(0);
    });
  });

  describe('findBestMappings', () => {
    it('should find non-conflicting mappings', () => {
      const fields: InternalField[] = ['firstName', 'lastName', 'email'];
      const headers = ['Vorname', 'Nachname', 'E-Mail', 'Telefon'];
      
      const mappings = findBestMappings(fields, headers);
      
      // Should map first 3 columns to fields
      expect(Object.keys(mappings)).toHaveLength(3);
      expect(mappings['0']?.field).toBe('firstName');
      expect(mappings['1']?.field).toBe('lastName');
      expect(mappings['2']?.field).toBe('email');
    });

    it('should avoid duplicate field assignments', () => {
      const fields: InternalField[] = ['firstName', 'lastName'];
      const headers = ['Vorname', 'Vor-Name', 'Nachname']; // Two similar to firstName
      
      const mappings = findBestMappings(fields, headers);
      
      // Should not assign firstName to both columns
      const assignedFields = Object.values(mappings).map(m => m.field);
      const uniqueFields = new Set(assignedFields);
      expect(assignedFields.length).toBe(uniqueFields.size);
    });

    it('should handle headers with broken encoding', () => {
      const fields: InternalField[] = ['address', 'priority'];
      const headers = ['Stra�e', 'Priorit�t', 'Sonstiges'];
      
      const mappings = findBestMappings(fields, headers);
      
      expect(mappings['0']?.field).toBe('address');
      expect(mappings['1']?.field).toBe('priority');
    });
  });

  describe('validateMappingQuality', () => {
    it('should detect missing required fields', () => {
      const mappings = {
        '0': { field: 'firstName' as InternalField, confidence: 0.9, reasons: [], hints: {} }
      };
      const requiredFields: InternalField[] = ['firstName', 'lastName'];
      
      const validation = validateMappingQuality(mappings, requiredFields);
      
      expect(validation.score).toBeLessThan(1.0);
      expect(validation.issues.some(issue => 
        issue.type === 'missing_required' && issue.field === 'lastName'
      )).toBe(true);
    });

    it('should detect low confidence mappings', () => {
      const mappings = {
        '0': { field: 'firstName' as InternalField, confidence: 0.3, reasons: [], hints: {} },
        '1': { field: 'lastName' as InternalField, confidence: 0.9, reasons: [], hints: {} }
      };
      
      const validation = validateMappingQuality(mappings, ['firstName', 'lastName']);
      
      expect(validation.issues.some(issue => 
        issue.type === 'low_confidence' && issue.field === 'firstName'
      )).toBe(true);
    });

    it('should detect duplicate field mappings', () => {
      const mappings = {
        '0': { field: 'firstName' as InternalField, confidence: 0.9, reasons: [], hints: {} },
        '1': { field: 'firstName' as InternalField, confidence: 0.8, reasons: [], hints: {} }
      };
      
      const validation = validateMappingQuality(mappings, ['firstName']);
      
      expect(validation.issues.some(issue => 
        issue.type === 'duplicate_mapping' && issue.field === 'firstName'
      )).toBe(true);
    });

    it('should return high score for perfect mappings', () => {
      const mappings = {
        '0': { field: 'firstName' as InternalField, confidence: 0.95, reasons: [], hints: {} },
        '1':  { field: 'lastName' as InternalField, confidence: 0.92, reasons: [], hints: {} }
      };
      
      const validation = validateMappingQuality(mappings, ['firstName', 'lastName']);
      
      expect(validation.score).toBeGreaterThan(0.8);
      expect(validation.issues.filter(issue => issue.severity === 'error')).toHaveLength(0);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical AMS export headers', () => {
      const fields: InternalField[] = [
        'amsId', 'firstName', 'lastName', 'birthDate', 
        'phone', 'email', 'status', 'amsAdvisor'
      ];
      
      const headers = [
        'AMS-Nummer', 'Vorname', 'Nachname', 'Geburtsdatum',
        'Telefon', 'E-Mail', 'Status', 'AMS-Berater'
      ];
      
      const mappings = findBestMappings(fields, headers);
      
      // Should map all fields with high confidence
      expect(Object.keys(mappings)).toHaveLength(8);
      Object.values(mappings).forEach(mapping => {
        expect(mapping.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should handle messy real-world headers', () => {
      const fields: InternalField[] = ['firstName', 'lastName', 'address', 'phone'];
      
      const messyHeaders = [
        'Vor name', // Space in middle
        'Nach-Name', // Hyphen
        'Stra�e Nr.', // Broken encoding + abbreviation
        'Tel.-Nr.' // Abbreviation
      ];
      
      const mappings = findBestMappings(fields, messyHeaders);
      
      // Should still find reasonable mappings
      expect(Object.keys(mappings).length).toBeGreaterThan(2);
      
      // Verify specific mappings
      expect(mappings['0']?.field).toBe('firstName');
      expect(mappings['1']?.field).toBe('lastName');
      expect(mappings['2']?.field).toBe('address');
    });

    it('should prioritize exact matches over fuzzy ones', () => {
      const candidates = ['Vorname', 'Vor-Name', 'VornameFuzzy'];
      const guesses = guessColumn('firstName', candidates);
      
      // Exact match should have highest confidence
      expect(guesses[0].confidence).toBeGreaterThan(0.9);
      expect(guesses[0].hints.exactAlias).toBe(true);
      
      // Fuzzy matches should have lower confidence
      if (guesses.length > 1) {
        expect(guesses[1].confidence).toBeLessThan(guesses[0].confidence);
      }
    });
  });
});