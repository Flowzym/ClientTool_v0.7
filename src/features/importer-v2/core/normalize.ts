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
 * Removes diacritics for fuzzy matching (ä→ae, ß→ss)
 */
function removeDiacritics(text: string): string {
  let result = text;
  
  for (const [diacritic, replacement] of Object.entries(DIACRITIC_MAP)) {
    result = result.replace(new RegExp(diacritic, 'g'), replacement);
  }
  
  return result;
}

/**
 * Tokenizes header into searchable tokens
 */
function tokenizeHeader(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]/g, ' ') // Keep German chars for now
    .split(/\s+/)
    .filter(token => token.length > 1) // Remove single chars
    .map(token => removeDiacritics(token)); // Remove diacritics for matching
}

/**
 * Normalizes header for matching (repairs encoding, cleans, tokenizes)
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
  
  // Step 2: Basic cleaning
  const cleaned = repaired
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Step 3: Create normalized version for matching
  const normalized = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/g, '') // Remove special chars but keep German
    .trim();
  
  // Step 4: Tokenize for fuzzy matching
  const tokens = tokenizeHeader(normalized);
  
  return {
    fixed: cleaned, // Repaired but readable
    tokens,
    original: raw,
    repairs
  };
}

/**
 * Returns display-friendly header (repaired encoding, proper casing)
 */
export function displayHeader(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  const { repaired } = repairMojibake(raw.trim());
  
  // Basic title case for common words
  return repaired
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase()); // Title case
}

/**
 * Calculates Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
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
 * Calculates Jaro-Winkler similarity for fuzzy matching
 */
export function jaroWinklerSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  if (matchWindow < 0) return 0.0;

  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(a.length, b.length, 4); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Calculates token overlap ratio between two token sets
 */
export function tokenOverlapRatio(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter(token => setB.has(token)));
  
  return intersection.size / Math.max(setA.size, setB.size);
}