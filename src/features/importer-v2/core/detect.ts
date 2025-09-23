/**
 * Content detection utilities for intelligent field mapping
 * Analyzes sample data to provide hints for column mapping
 */

import type { ContentHint, ContentAnalysis, InternalField } from './types';

// Austrian/German specific patterns
const PATTERNS = {
  // Austrian postal codes (4 digits) and German (5 digits)
  zip: /^\d{4,5}$/,
  
  // Austrian phone numbers
  phone: /^(\+43|0043|0)\s*\d{1,4}[\s\/-]*\d{3,4}[\s\/-]*\d{3,4}$/,
  
  // Austrian SV numbers (10 digits, sometimes with space after 4th)
  svNumber: /^\d{4}\s?\d{6}$/,
  
  // AMS ID pattern (A + 4-6 digits)
  amsId: /^A\d{4,6}$/,
  
  // Email pattern
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // German date patterns
  date: /^\d{1,2}[./]\d{1,2}[./]\d{4}$|^\d{4}-\d{2}-\d{2}$/,
  
  // Austrian address patterns
  address: /^.+\s+\d+[a-zA-Z]?$/,
  
  // Name patterns (capitalized words)
  name: /^[A-ZÄÖÜ][a-zäöüß]+(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)*$/
};

/**
 * Analyzes sample values to detect content type
 */
export function detectContentType(
  samples: string[],
  maxSamples: number = 10
): ContentHint[] {
  const hints: ContentHint[] = [];
  const sampleSet = samples.slice(0, maxSamples).filter(s => s && s.trim());
  
  if (sampleSet.length === 0) return hints;

  // Test each pattern type
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    const matches = sampleSet.filter(sample => pattern.test(sample.trim()));
    const confidence = matches.length / sampleSet.length;
    
    if (confidence > 0.3) { // At least 30% match rate
      hints.push({
        type: type as ContentHint['type'],
        confidence,
        samples: matches.slice(0, 3), // Show first 3 examples
        pattern: pattern.source
      });
    }
  }

  // Sort by confidence
  return hints.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyzes content and provides field suggestions based on detected patterns
 */
export function suggestFieldsFromContent(
  samples: string[]
): Array<{ field: InternalField; confidence: number; reason: string }> {
  const suggestions: Array<{ field: InternalField; confidence: number; reason: string }> = [];
  const hints = detectContentType(samples);

  for (const hint of hints) {
    switch (hint.type) {
      case 'amsId':
        suggestions.push({
          field: 'amsId',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen AMS-ID Pattern`
        });
        break;
        
      case 'email':
        suggestions.push({
          field: 'email',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte sind gültige E-Mail-Adressen`
        });
        break;
        
      case 'phone':
        suggestions.push({
          field: 'phone',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen österreichischen Telefonnummern`
        });
        break;
        
      case 'zip':
        suggestions.push({
          field: 'zip',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte sind gültige Postleitzahlen`
        });
        break;
        
      case 'svNumber':
        suggestions.push({
          field: 'svNumber',
          confidence: hint.confidence,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen SV-Nummern`
        });
        break;
        
      case 'date':
        // Could be birthDate, entryDate, exitDate, etc.
        suggestions.push({
          field: 'birthDate',
          confidence: hint.confidence * 0.8, // Slightly lower since ambiguous
          reason: `${Math.round(hint.confidence * 100)}% der Werte sind Datumsangaben (möglicherweise Geburtsdatum)`
        });
        break;
        
      case 'name':
        // Could be firstName or lastName
        suggestions.push({
          field: 'firstName',
          confidence: hint.confidence * 0.7,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen Namensmustern (möglicherweise Vorname)`
        });
        suggestions.push({
          field: 'lastName',
          confidence: hint.confidence * 0.7,
          reason: `${Math.round(hint.confidence * 100)}% der Werte entsprechen Namensmustern (möglicherweise Nachname)`
        });
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

  // Extract patterns for each detected type
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

  return { hints, patterns };
}

/**
 * Validates if a value matches expected pattern for a field
 */
export function validateFieldContent(
  field: InternalField,
  value: string
): { valid: boolean; confidence: number; message?: string } {
  if (!value || !value.trim()) {
    return { valid: true, confidence: 1.0 }; // Empty values are valid
  }

  const trimmed = value.trim();

  switch (field) {
    case 'email':
      const emailValid = PATTERNS.email.test(trimmed);
      return {
        valid: emailValid,
        confidence: emailValid ? 1.0 : 0.0,
        message: emailValid ? undefined : 'Ungültige E-Mail-Adresse'
      };

    case 'phone':
      const phoneValid = PATTERNS.phone.test(trimmed);
      return {
        valid: phoneValid,
        confidence: phoneValid ? 1.0 : 0.5, // More lenient for phone
        message: phoneValid ? undefined : 'Telefonnummer entspricht nicht österreichischem Format'
      };

    case 'zip':
      const zipValid = PATTERNS.zip.test(trimmed);
      return {
        valid: zipValid,
        confidence: zipValid ? 1.0 : 0.0,
        message: zipValid ? undefined : 'Postleitzahl muss 4-5 Ziffern haben'
      };

    case 'svNumber':
      const svValid = PATTERNS.svNumber.test(trimmed);
      return {
        valid: svValid,
        confidence: svValid ? 1.0 : 0.0,
        message: svValid ? undefined : 'SV-Nummer muss 10 Ziffern haben (optional mit Leerzeichen nach 4. Ziffer)'
      };

    case 'amsId':
      const amsValid = PATTERNS.amsId.test(trimmed);
      return {
        valid: amsValid,
        confidence: amsValid ? 1.0 : 0.0,
        message: amsValid ? undefined : 'AMS-ID muss Format A + 4-6 Ziffern haben'
      };

    case 'birthDate':
    case 'entryDate':
    case 'exitDate':
    case 'amsBookingDate':
    case 'followUp':
    case 'lastActivity':
      const dateValid = PATTERNS.date.test(trimmed);
      return {
        valid: dateValid,
        confidence: dateValid ? 1.0 : 0.5, // More lenient for dates
        message: dateValid ? undefined : 'Datum muss Format DD.MM.YYYY oder YYYY-MM-DD haben'
      };

    default:
      return { valid: true, confidence: 0.5 }; // Default: accept but low confidence
  }
}