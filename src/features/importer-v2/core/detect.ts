/**
 * Content detection and pattern analysis
 * Analyzes sample data to provide hints for field mapping
 */

import type { ContentHint, ContentAnalysis } from './types';

// Pattern definitions for content detection
const PATTERNS = {
  // Austrian/German date formats
  date: [
    /^\d{1,2}[.\/]\d{1,2}[.\/]\d{4}$/, // dd.mm.yyyy or dd/mm/yyyy
    /^\d{4}-\d{2}-\d{2}$/, // yyyy-mm-dd
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
  ],
  
  // Email patterns
  email: [
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  ],
  
  // Phone patterns (Austrian/German)
  phone: [
    /^(\+43|0043|0)\s*\d{1,4}[\s\/-]*\d{3,4}[\s\/-]*\d{3,4}$/, // Austrian
    /^(\+49|0049|0)\s*\d{2,4}[\s\/-]*\d{3,8}$/, // German
    /^\d{2,4}[\s\/-]*\d{6,}$/, // Generic
  ],
  
  // Postal codes
  zip: [
    /^\d{4,5}$/, // Austrian (4) or German (5) postal codes
  ],
  
  // Social security number patterns
  svNumber: [
    /^\d{4}\s?\d{6}$/, // Austrian SV format: 1234 123456
    /^\d{10}$/, // Compact format
  ],
  
  // AMS-ID patterns
  amsId: [
    /^A\d{4,6}$/, // A + 4-6 digits
    /^AMS\d{4,6}$/, // AMS prefix
  ],
  
  // Name patterns (capitalized words)
  name: [
    /^[A-ZÄÖÜ][a-zäöüß]+(?:[-\s][A-ZÄÖÜ][a-zäöüß]+)*$/, // German names with umlauts
  ],
  
  // Address patterns
  address: [
    /^[A-ZÄÖÜ][a-zäöüß]+(?:straße|gasse|weg|platz|allee|ring|str\.?)\s+\d+/, // German street formats
  ]
};

/**
 * Analyzes sample data to detect content patterns
 */
export function analyzeContent(samples: string[]): ContentHint[] {
  const hints: ContentHint[] = [];
  
  if (!samples || samples.length === 0) {
    return hints;
  }
  
  // Filter out empty/null samples
  const validSamples = samples
    .filter(sample => sample != null && String(sample).trim().length > 0)
    .map(sample => String(sample).trim());
  
  if (validSamples.length === 0) {
    return hints;
  }

  // Test each pattern type
  for (const [type, patterns] of Object.entries(PATTERNS)) {
    let matchCount = 0;
    const matchingSamples: string[] = [];
    
    for (const sample of validSamples) {
      const matches = patterns.some(pattern => pattern.test(sample));
      if (matches) {
        matchCount++;
        matchingSamples.push(sample);
      }
    }
    
    if (matchCount > 0) {
      const confidence = matchCount / validSamples.length;
      
      // Only include hints with reasonable confidence
      if (confidence >= 0.3) {
        hints.push({
          type: type as ContentHint['type'],
          confidence,
          samples: matchingSamples.slice(0, 3), // Keep first 3 examples
          pattern: patterns[0].source
        });
      }
    }
  }
  
  // Sort by confidence (highest first)
  return hints.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Provides content analysis for a column
 */
export function analyzeColumn(
  columnName: string,
  sampleData: string[]
): ContentAnalysis {
  const hints = analyzeContent(sampleData);
  
  // Build pattern map for quick access
  const patterns: ContentAnalysis['patterns'] = {};
  
  hints.forEach(hint => {
    switch (hint.type) {
      case 'date':
        patterns.datePattern = new RegExp(hint.pattern || PATTERNS.date[0].source);
        break;
      case 'email':
        patterns.emailPattern = new RegExp(hint.pattern || PATTERNS.email[0].source);
        break;
      case 'phone':
        patterns.phonePattern = new RegExp(hint.pattern || PATTERNS.phone[0].source);
        break;
      case 'zip':
        patterns.zipPattern = new RegExp(hint.pattern || PATTERNS.zip[0].source);
        break;
      case 'svNumber':
        patterns.svPattern = new RegExp(hint.pattern || PATTERNS.svNumber[0].source);
        break;
      case 'amsId':
        patterns.amsIdPattern = new RegExp(hint.pattern || PATTERNS.amsId[0].source);
        break;
    }
  });
  
  return { hints, patterns };
}

/**
 * Detects if sample data matches a specific content type
 */
export function detectContentType(
  samples: string[],
  targetType: ContentHint['type']
): { matches: boolean; confidence: number; examples: string[] } {
  const hints = analyzeContent(samples);
  const hint = hints.find(h => h.type === targetType);
  
  if (!hint) {
    return { matches: false, confidence: 0, examples: [] };
  }
  
  return {
    matches: hint.confidence >= 0.5,
    confidence: hint.confidence,
    examples: hint.samples
  };
}

/**
 * Provides content-based boost for field mapping
 */
export function getContentBoost(
  fieldType: string,
  sampleData: string[]
): number {
  // Map internal fields to content types
  const fieldToContentType: Record<string, ContentHint['type']> = {
    'birthDate': 'date',
    'amsBookingDate': 'date',
    'entryDate': 'date',
    'exitDate': 'date',
    'followUp': 'date',
    'lastActivity': 'date',
    'email': 'email',
    'phone': 'phone',
    'zip': 'zip',
    'svNumber': 'svNumber',
    'amsId': 'amsId',
    'firstName': 'name',
    'lastName': 'name',
    'address': 'address'
  };
  
  const contentType = fieldToContentType[fieldType];
  if (!contentType) return 0;
  
  const detection = detectContentType(sampleData, contentType);
  return detection.matches ? detection.confidence * 0.5 : 0; // 50% boost max
}