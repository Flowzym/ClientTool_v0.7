/**
 * Content detection utilities for intelligent field mapping
 * Analyzes sample data to provide hints for column mapping
 */

import type { ContentHint, ContentAnalysis, InternalField } from './types';

// Austrian/German specific patterns
const PATTERNS = {
  // Austrian social security number: 1234 010180 (10 digits, space after 4th)
  svNumber: /^\d{4}\s?\d{6}$/,
  
  // AMS ID patterns (various formats observed)
  amsId: /^(AMS|ams)[-_]?\d{6,10}$/i,
  
  // Austrian postal codes (4 digits, 1000-9999)
  austrianZip: /^[1-9]\d{3}$/,
  
  // German postal codes (5 digits, 01000-99999)
  germanZip: /^\d{5}$/,
  
  // Combined zip pattern
  zip: /^([1-9]\d{3}|\d{5})$/,
  
  // Phone numbers (Austrian/German formats)
  phone: /^(\+43|\+49|0043|0049|0)\s?[\d\s\-\/\(\)]{6,15}$/,
  
  // Email addresses
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Date patterns (various European formats)
  date: /^(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}|\d{4}[\.\/\-]\d{1,2}[\.\/\-]\d{1,2})$/,
  
  // Name patterns (basic heuristics)
  name: /^[A-ZÄÖÜ][a-zäöüß]+(\s[A-ZÄÖÜ][a-zäöüß]+)*$/,
  
  // Address patterns (street + number)
  address: /^.+\s+\d+[a-zA-Z]?(\s*\/\s*\d+[a-zA-Z]?)?$/
};

// Content type confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  medium: 0.6,
  low: 0.3
};

/**
 * Analyzes sample values to detect content type
 */
export function detectContentType(
  samples: string[],
  maxSamples: number = 10
): ContentHint[] {
  if (!samples || samples.length === 0) {
    return [];
  }

  const validSamples = samples
    .filter(s => s && typeof s === 'string' && s.trim().length > 0)
    .slice(0, maxSamples);

  if (validSamples.length === 0) {
    return [];
  }

  const hints: ContentHint[] = [];

  // Test each pattern type
  const tests = [
    { type: 'svNumber' as const, pattern: PATTERNS.svNumber },
    { type: 'amsId' as const, pattern: PATTERNS.amsId },
    { type: 'zip' as const, pattern: PATTERNS.zip },
    { type: 'phone' as const, pattern: PATTERNS.phone },
    { type: 'email' as const, pattern: PATTERNS.email },
    { type: 'date' as const, pattern: PATTERNS.date },
    { type: 'name' as const, pattern: PATTERNS.name },
    { type: 'address' as const, pattern: PATTERNS.address }
  ];

  for (const test of tests) {
    const matches = validSamples.filter(sample => test.pattern.test(sample.trim()));
    const confidence = matches.length / validSamples.length;

    if (confidence >= CONFIDENCE_THRESHOLDS.low) {
      hints.push({
        type: test.type,
        confidence,
        samples: matches.slice(0, 3), // Keep first 3 matches as examples
        pattern: test.pattern.source
      });
    }
  }

  // Sort by confidence (highest first)
  return hints.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyzes content and provides field suggestions based on detected patterns
 */
export function suggestFieldsFromContent(
  samples: string[]
): Array<{ field: InternalField; confidence: number; reason: string }> {
  const hints = detectContentType(samples);
  const suggestions: Array<{ field: InternalField; confidence: number; reason: string }> = [];

  for (const hint of hints) {
    switch (hint.type) {
      case 'svNumber':
        suggestions.push({
          field: 'svNumber',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen dem SV-Nummer Format`
        });
        break;

      case 'amsId':
        suggestions.push({
          field: 'amsId',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen dem AMS-ID Format`
        });
        break;

      case 'zip':
        suggestions.push({
          field: 'zip',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte sind gültige Postleitzahlen`
        });
        break;

      case 'phone':
        suggestions.push({
          field: 'phone',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte sind Telefonnummern`
        });
        break;

      case 'email':
        suggestions.push({
          field: 'email',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte sind E-Mail-Adressen`
        });
        break;

      case 'date':
        if (hint.confidence >= CONFIDENCE_THRESHOLDS.medium) {
          // Could be birth date or entry/exit date - need more context
          suggestions.push({
            field: 'birthDate',
            confidence: hint.confidence * 0.7, // Reduce confidence as it's ambiguous
            reason: `${Math.round(hint.confidence * 100)}% der Werte sind Datumsangaben (möglicherweise Geburtsdatum)`
          });
        }
        break;

      case 'name':
        if (hint.confidence >= CONFIDENCE_THRESHOLDS.medium) {
          // Could be first or last name - need header context
          suggestions.push({
            field: 'firstName',
            confidence: hint.confidence * 0.6,
            reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen Namensmustern`
          });
          suggestions.push({
            field: 'lastName',
            confidence: hint.confidence * 0.6,
            reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen Namensmustern`
          });
        }
        break;

      case 'address':
        suggestions.push({
          field: 'address',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen Adressmustern`
        });
        break;
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Performs comprehensive content analysis on sample data
 */
export function analyzeContent(samples: string[]): ContentAnalysis {
  const hints = detectContentType(samples);
  
  const patterns: ContentAnalysis['patterns'] = {};
  
  // Extract specific patterns for later use
  for (const hint of hints) {
    switch (hint.type) {
      case 'date':
        patterns.datePattern = PATTERNS.date;
        break;
      case 'email':
        patterns.emailPattern = PATTERNS.email;
        break;
      case 'phone':
        patterns.phonePattern = PATTERNS.phone;
        break;
      case 'zip':
        patterns.zipPattern = PATTERNS.zip;
        break;
      case 'svNumber':
        patterns.svPattern = PATTERNS.svNumber;
        break;
      case 'amsId':
        patterns.amsIdPattern = PATTERNS.amsId;
        break;
    }
  }

  return {
    hints,
    patterns
  };
}

/**
 * Validates if a value matches expected pattern for a field
 */
export function validateFieldContent(
  field: InternalField,
  value: string
): { valid: boolean; confidence: number; message?: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, confidence: 0, message: 'Leerer oder ungültiger Wert' };
  }

  const trimmedValue = value.trim();

  switch (field) {
    case 'svNumber':
      if (PATTERNS.svNumber.test(trimmedValue)) {
        return { valid: true, confidence: 1.0 };
      }
      return { valid: false, confidence: 0, message: 'Ungültiges SV-Nummer Format (erwartet: 1234 123456)' };

    case 'amsId':
      if (PATTERNS.amsId.test(trimmedValue)) {
        return { valid: true, confidence: 1.0 };
      }
      return { valid: false, confidence: 0, message: 'Ungültiges AMS-ID Format' };

    case 'zip':
      if (PATTERNS.zip.test(trimmedValue)) {
        return { valid: true, confidence: 1.0 };
      }
      return { valid: false, confidence: 0, message: 'Ungültige Postleitzahl (4-5 Ziffern erwartet)' };

    case 'phone':
      if (PATTERNS.phone.test(trimmedValue)) {
        return { valid: true, confidence: 1.0 };
      }
      return { valid: false, confidence: 0, message: 'Ungültiges Telefonnummer Format' };

    case 'email':
      if (PATTERNS.email.test(trimmedValue)) {
        return { valid: true, confidence: 1.0 };
      }
      return { valid: false, confidence: 0, message: 'Ungültige E-Mail-Adresse' };

    case 'birthDate':
    case 'entryDate':
    case 'exitDate':
    case 'amsBookingDate':
    case 'lastActivity':
      if (PATTERNS.date.test(trimmedValue)) {
        return { valid: true, confidence: 0.9 }; // Slightly lower as date parsing can be ambiguous
      }
      return { valid: false, confidence: 0, message: 'Ungültiges Datumsformat' };

    default:
      // For other fields, just check if not empty
      return { valid: trimmedValue.length > 0, confidence: 0.8 };
  }
}