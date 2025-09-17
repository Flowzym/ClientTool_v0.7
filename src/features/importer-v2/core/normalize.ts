/**
 
 * Header normalization and display utilities
 * Repairs broken encodings, normalizes for matching, preserves display quality
 */

import type { NormalizationResult } from './types';

// Mojibake repair mappings (common broken encoding artifacts)
const MOJIBAKE_REPAIRS: Record<string, string> = {
  // UTF-8 → Latin-1 → UTF-8 double encoding
  'Ã¤': 'ä', 'Ã¶': 'ö', 'Ã¼': 'ü',
  'Ã„': 'Ä', 'Ã–': 'Ö', 'Ãœ': 'Ü',
  'ÃŸ': 'ß',
  
  // Windows-1252 artifacts
  'â€™': "'", 'â€œ': '"', 'â€�': '"',
  'â€"': '–', 'â€"': '—',
  
  // Common replacement characters
  '�': '', // Remove replacement character
  'Â': '', // Remove spurious Â
  
  // Specific broken field names
  'Stra�e': 'Straße',
  'Ma�nahme': 'Maßnahme',
  'Ma�nahmennummer': 'Maßnahmennummer',
  'Geb�ude': 'Gebäude',
  'Schl�ssel': 'Schlüssel',
  'Gr��e': 'Größe',
  'Wei�': 'Weiß',
  'Fu�': 'Fuß',
  'Stra�ennummer': 'Straßennummer',
  'Geb�hren': 'Gebühren',
  'Pr�fung': 'Prüfung',
  'Erg�nzung': 'Ergänzung',
  'Erl�uterung': 'Erläuterung',
  'Verf�gung': 'Verfügung',
  'Zust�ndigkeit': 'Zuständigkeit',
  'T�tigkeit': 'Tätigkeit',
  'Qualit�t': 'Qualität',
  'Priorit�t': 'Priorität',
  'Aktivit�t': 'Aktivität'
};

// Diacritic removal for matching (ä→ae, ß→ss)
const DIACRITIC_MAP: Record<string, string> = {
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue',
  'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
  'ß': 'ss',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u',
  'ç': 'c', 'ñ': 'n'
};

/**
 * Repairs broken encoding artifacts in header strings
 */
function repairMojibake(text: string): { repaired: string; repairs: string[] } {
  let repaired = text;
  const repairs: string[] = [];
  
  for (const [broken, fixed] of Object.entries(MOJIBAKE_REPAIRS)) {
    if (repaired.includes(broken)) {
      repaired = repaired.replace(new RegExp(broken, 'g'), fixed);
      repairs.push(`${broken} → ${fixed}`);
    }
  }
  
  return { repaired, repairs };
}

/**
 * Removes diacritics for matching purposes (ä→ae, ß→ss)
 */
function removeDiacritics(text: string): string {
  let result = text;
  for (const [diacritic, replacement] of Object.entries(DIACRITIC_MAP)) {
    result = result.replace(new RegExp(diacritic, 'g'), replacement);
  }
  return result;
}

/**
 * Normalizes special characters and punctuation
 */
function normalizeSpecialChars(text: string): string {
  return text
    .replace(/[_\-\.\/\\]/g, ' ') // Convert separators to spaces
    .replace(/[()[\]{}]/g, '') // Remove brackets
    .replace(/[,:;]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Tokenizes normalized text into searchable tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 0)
    .filter(token => !['und', 'der', 'die', 'das', 'von', 'zu', 'im', 'am', 'an', 'auf'].includes(token));
}

/**
 * Normalizes header for matching purposes
 * Repairs mojibake, removes diacritics, normalizes whitespace and special chars
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

  // Step 1: Repair mojibake
  const { repaired, repairs } = repairMojibake(raw.trim());
  
  // Step 2: Remove diacritics for matching
  const withoutDiacritics = removeDiacritics(repaired);
  
  // Step 3: Normalize special characters
  const normalized = normalizeSpecialChars(withoutDiacritics);
  
  // Step 4: Tokenize
  const tokens = tokenize(normalized);
  
  return {
    fixed: normalized.toLowerCase(),
    tokens,
    original: raw,
    repairs
  };
}

/**
 * Returns properly formatted header for display in UI
 * Repairs mojibake but preserves proper German capitalization and umlauts
 */
export function displayHeader(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  // Repair mojibake but keep proper formatting
  const { repaired } = repairMojibake(raw.trim());
  
  // Clean up whitespace but preserve case and umlauts
  return repaired
    .replace(/\s+/g, ' ')
    .trim();
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
 * Gets token overlap ratio between two headers
 */
export function getTokenOverlap(header1: string, header2: string): number {
  const tokens1 = normalizeHeader(header1).tokens;
  const tokens2 = normalizeHeader(header2).tokens;
  
  if (tokens1.length === 0 && tokens2.length === 0) return 1;
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  
  return intersection.size / Math.max(set1.size, set2.size);
}