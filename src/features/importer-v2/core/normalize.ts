/**
 * Header normalization and display utilities
 * Repairs broken encodings, normalizes for matching, preserves display quality
 */

import type { NormalizationResult } from './types';

// Mojibake repair patterns (common broken encoding artifacts)
const MOJIBAKE_REPAIRS: Array<{ pattern: RegExp; replacement: string; description: string }> = [
  // Common German umlauts and ß
  { pattern: /stra�e/gi, replacement: 'straße', description: 'Straße repair' },
  { pattern: /ma�nahme/gi, replacement: 'maßnahme', description: 'Maßnahme repair' },
  { pattern: /gro�e/gi, replacement: 'größe', description: 'Größe repair' },
  { pattern: /fu�/gi, replacement: 'fuß', description: 'Fuß repair' },
  { pattern: /wei�/gi, replacement: 'weiß', description: 'Weiß repair' },
  { pattern: /hei�/gi, replacement: 'heiß', description: 'Heiß repair' },
  { pattern: /geb�ude/gi, replacement: 'gebäude', description: 'Gebäude repair' },
  { pattern: /t�tigkeit/gi, replacement: 'tätigkeit', description: 'Tätigkeit repair' },
  { pattern: /qualit�t/gi, replacement: 'qualität', description: 'Qualität repair' },
  { pattern: /aktivit�t/gi, replacement: 'aktivität', description: 'Aktivität repair' },
  { pattern: /priorit�t/gi, replacement: 'priorität', description: 'Priorität repair' },
  { pattern: /zust�ndigkeit/gi, replacement: 'zuständigkeit', description: 'Zuständigkeit repair' },
  { pattern: /verf�gung/gi, replacement: 'verfügung', description: 'Verfügung repair' },
  { pattern: /erl�uterung/gi, replacement: 'erläuterung', description: 'Erläuterung repair' },
  { pattern: /erg�nzung/gi, replacement: 'ergänzung', description: 'Ergänzung repair' },
  { pattern: /pr�fung/gi, replacement: 'prüfung', description: 'Prüfung repair' },
  { pattern: /geb�hren/gi, replacement: 'gebühren', description: 'Gebühren repair' },
  
  // UTF-8 mojibake patterns
  { pattern: /Ã¤/g, replacement: 'ä', description: 'UTF-8 ä repair' },
  { pattern: /Ã¶/g, replacement: 'ö', description: 'UTF-8 ö repair' },
  { pattern: /Ã¼/g, replacement: 'ü', description: 'UTF-8 ü repair' },
  { pattern: /ÃŸ/g, replacement: 'ß', description: 'UTF-8 ß repair' },
  { pattern: /Ã„/g, replacement: 'Ä', description: 'UTF-8 Ä repair' },
  { pattern: /Ã–/g, replacement: 'Ö', description: 'UTF-8 Ö repair' },
  { pattern: /Ãœ/g, replacement: 'Ü', description: 'UTF-8 Ü repair' },
  
  // Generic � replacement patterns
  { pattern: /([a-z])�([a-z])/gi, replacement: '$1ß$2', description: 'Generic ß repair' },
  { pattern: /([a-z])�/gi, replacement: '$1ä', description: 'Generic ä repair' }
];

// German stop words to filter out during tokenization
const GERMAN_STOP_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
  'und', 'oder', 'aber', 'von', 'zu', 'mit', 'bei', 'für', 'auf', 'an', 'in',
  'am', 'im', 'zum', 'zur', 'vom', 'beim', 'fürs', 'ans', 'ins',
  'nr', 'no', 'nummer', 'number'
]);

/**
 * Normalizes header for matching purposes
 * Repairs mojibake, removes diacritics, tokenizes, filters stop words
 */
export function normalizeHeader(raw: string): NormalizationResult {
  if (!raw || typeof raw !== 'string') {
    return {
      fixed: '',
      tokens: [],
      original: raw || '',
      repairs: []
    };
  }

  let fixed = raw.trim();
  const repairs: string[] = [];

  // Step 1: Repair mojibake patterns
  for (const { pattern, replacement, description } of MOJIBAKE_REPAIRS) {
    const before = fixed;
    fixed = fixed.replace(pattern, replacement);
    if (before !== fixed) {
      repairs.push(`${description}: ${before} → ${fixed}`);
    }
  }

  // Step 2: Normalize whitespace
  fixed = fixed.replace(/\s+/g, ' ').trim();

  // Step 3: Convert to lowercase for matching
  const normalized = fixed.toLowerCase();

  // Step 4: Remove diacritics for matching (ä→ae, ö→oe, ü→ue, ß→ss)
  const dediacriticized = normalized
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/á/g, 'a')
    .replace(/à/g, 'a')
    .replace(/â/g, 'a')
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ì/g, 'i')
    .replace(/î/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ò/g, 'o')
    .replace(/ô/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ù/g, 'u')
    .replace(/û/g, 'u');

  // Step 5: Remove special characters and normalize separators
  const cleaned = dediacriticized
    .replace(/[^\w\s]/g, ' ') // Replace special chars with space
    .replace(/[_-]+/g, ' ')   // Replace underscores/hyphens with space
    .replace(/\s+/g, ' ')     // Normalize whitespace again
    .trim();

  // Step 6: Tokenize and filter stop words
  const tokens = cleaned
    .split(/\s+/)
    .filter(token => token.length > 0)
    .filter(token => !GERMAN_STOP_WORDS.has(token));

  return {
    fixed: cleaned,
    tokens,
    original: raw,
    repairs
  };
}

/**
 * Returns properly formatted header for display in UI
 * Repairs mojibake but preserves original formatting and case
 */
export function displayHeader(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let display = raw.trim();

  // Only repair mojibake, preserve original case and formatting
  for (const { pattern, replacement } of MOJIBAKE_REPAIRS) {
    display = display.replace(pattern, replacement);
  }

  // Clean up excessive whitespace but preserve structure
  display = display.replace(/\s+/g, ' ').trim();

  return display;
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates Jaro-Winkler similarity between two strings
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (matchWindow < 0) return 0.0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Calculates token overlap ratio between two headers
 */
export function tokenOverlapRatio(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(token => set2.has(token)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Checks if two normalized headers are equivalent
 */
export function headersMatch(header1: string, header2: string): boolean {
  const norm1 = normalizeHeader(header1);
  const norm2 = normalizeHeader(header2);
  
  return norm1.fixed === norm2.fixed;
}

/**
 * Gets token overlap ratio between two headers (convenience function)
 */
export function getTokenOverlap(header1: string, header2: string): number {
  const norm1 = normalizeHeader(header1);
  const norm2 = normalizeHeader(header2);
  
  return tokenOverlapRatio(norm1.tokens, norm2.tokens);
}