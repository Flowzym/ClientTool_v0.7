/**
 * Mapping confidence scoring system
 * Combines alias matching, fuzzy matching, and content analysis
 */

import type { InternalField, ColumnGuess, ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './types';
import { ALIASES } from './aliases';
import { normalizeHeader, levenshteinDistance, jaroWinklerSimilarity, tokenOverlapRatio } from './normalize';
import { getContentBoost } from './detect';

/**
 * Calculates exact alias match score
 */
function scoreExactAlias(field: InternalField, normalizedHeader: string): {
  score: number;
  matchedAlias?: string;
} {
  const aliases = ALIASES[field] || [];
  const headerLower = normalizedHeader.toLowerCase();
  
  for (const alias of aliases) {
    if (headerLower === alias.toLowerCase()) {
      return { score: 1.0, matchedAlias: alias };
    }
  }
  
  return { score: 0 };
}

/**
 * Calculates token overlap score
 */
function scoreTokenOverlap(field: InternalField, headerTokens: string[]): {
  score: number;
  overlappingTokens: string[];
} {
  const aliases = ALIASES[field] || [];
  const overlappingTokens: string[] = [];
  let bestOverlap = 0;
  
  for (const alias of aliases) {
    const aliasTokens = alias.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
    const overlap = tokenOverlapRatio(headerTokens, aliasTokens);
    
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      overlappingTokens.length = 0;
      overlappingTokens.push(...headerTokens.filter(token => 
        aliasTokens.some(aliasToken => aliasToken.includes(token) || token.includes(aliasToken))
      ));
    }
  }
  
  return { score: bestOverlap, overlappingTokens };
}

/**
 * Calculates fuzzy matching score using multiple algorithms
 */
function scoreFuzzyMatch(field: InternalField, normalizedHeader: string): {
  score: number;
  bestMatch?: string;
  algorithm: 'levenshtein' | 'jaro-winkler';
} {
  const aliases = ALIASES[field] || [];
  const headerLower = normalizedHeader.toLowerCase();
  
  let bestScore = 0;
  let bestMatch: string | undefined;
  let bestAlgorithm: 'levenshtein' | 'jaro-winkler' = 'levenshtein';
  
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();
    
    // Levenshtein similarity (normalized)
    const levDistance = levenshteinDistance(headerLower, aliasLower);
    const maxLength = Math.max(headerLower.length, aliasLower.length);
    const levSimilarity = maxLength > 0 ? 1 - (levDistance / maxLength) : 0;
    
    // Jaro-Winkler similarity
    const jaroSimilarity = jaroWinklerSimilarity(headerLower, aliasLower);
    
    // Use best algorithm for this pair
    if (jaroSimilarity > levSimilarity && jaroSimilarity > bestScore) {
      bestScore = jaroSimilarity;
      bestMatch = alias;
      bestAlgorithm = 'jaro-winkler';
    } else if (levSimilarity > bestScore) {
      bestScore = levSimilarity;
      bestMatch = alias;
      bestAlgorithm = 'levenshtein';
    }
  }
  
  // Only return meaningful fuzzy matches (>60% similarity)
  return bestScore >= 0.6 ? { score: bestScore, bestMatch, algorithm: bestAlgorithm } : { score: 0, algorithm: 'levenshtein' };
}

/**
 * Calculates position-based hint score
 */
function scorePositionHint(field: InternalField, columnIndex: number, totalColumns: number): number {
  // Common field positions in Austrian/German exports
  const positionHints: Record<InternalField, number[]> = {
    'amsId': [0, 1], // Usually first or second column
    'lastName': [1, 2], // Early columns
    'firstName': [2, 3],
    'birthDate': [3, 4, 5],
    'phone': [4, 5, 6],
    'email': [5, 6, 7],
    'address': [6, 7, 8],
    'status': [-3, -2, -1], // Often near end (negative = from end)
    'priority': [-2, -1],
    'note': [-1] // Usually last column
  };
  
  const hints = positionHints[field];
  if (!hints) return 0;
  
  // Convert negative positions to actual indices
  const actualHints = hints.map(pos => 
    pos < 0 ? totalColumns + pos : pos
  );
  
  // Check if current position matches any hint
  const matches = actualHints.some(hintPos => 
    Math.abs(columnIndex - hintPos) <= 1 // Allow ±1 tolerance
  );
  
  return matches ? 0.3 : 0;
}

/**
 * Main column guessing function
 */
export function guessColumn(
  field: InternalField,
  candidates: string[],
  sampleRows?: string[][],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ColumnGuess[] {
  const guesses: ColumnGuess[] = [];
  
  candidates.forEach((candidate, columnIndex) => {
    const normalized = normalizeHeader(candidate);
    const reasons: string[] = [];
    let totalScore = 0;
    
    // 1. Exact alias match
    const exactMatch = scoreExactAlias(field, normalized.fixed);
    if (exactMatch.score > 0) {
      totalScore += exactMatch.score * weights.exactAlias;
      reasons.push(`Exakte Übereinstimmung: "${exactMatch.matchedAlias}"`);
    }
    
    // 2. Token overlap
    const tokenMatch = scoreTokenOverlap(field, normalized.tokens);
    if (tokenMatch.score > 0) {
      totalScore += tokenMatch.score * weights.tokenOverlap;
      reasons.push(`Token-Überlappung: ${tokenMatch.overlappingTokens.join(', ')}`);
    }
    
    // 3. Fuzzy matching
    const fuzzyMatch = scoreFuzzyMatch(field, normalized.fixed);
    if (fuzzyMatch.score > 0) {
      totalScore += fuzzyMatch.score * weights.fuzzyMatch;
      reasons.push(`Ähnlichkeit (${fuzzyMatch.algorithm}): "${fuzzyMatch.bestMatch}" (${Math.round(fuzzyMatch.score * 100)}%)`);
    }
    
    // 4. Content analysis boost
    if (sampleRows && sampleRows.length > 0) {
      const columnSamples = sampleRows
        .map(row => row[columnIndex])
        .filter(val => val != null && String(val).trim().length > 0)
        .map(val => String(val).trim());
      
      if (columnSamples.length > 0) {
        const contentBoost = getContentBoost(field, columnSamples);
        if (contentBoost > 0) {
          totalScore += contentBoost * weights.contentHint;
          reasons.push(`Inhalts-Analyse: ${Math.round(contentBoost * 100)}% Übereinstimmung`);
        }
      }
    }
    
    // 5. Position hint
    const positionBoost = scorePositionHint(field, columnIndex, candidates.length);
    if (positionBoost > 0) {
      totalScore += positionBoost * weights.positionHint;
      reasons.push(`Position-Hinweis: Spalte ${columnIndex + 1}`);
    }
    
    // Only include meaningful guesses (>10% confidence)
    if (totalScore >= 0.1) {
      guesses.push({
        field,
        confidence: Math.min(totalScore, 1.0), // Cap at 100%
        reasons,
        hints: {
          exactAlias: exactMatch.score > 0,
          tokenOverlap: tokenMatch.score,
          fuzzyScore: fuzzyMatch.score,
          contentHints: sampleRows ? ['content-analyzed'] : []
        }
      });
    }
  });
  
  // Sort by confidence (highest first)
  return guesses.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Finds best mapping for all fields across all columns
 */
export function findBestMappings(
  fields: InternalField[],
  headers: string[],
  sampleRows?: string[][],
  weights?: ScoringWeights
): Record<string, ColumnGuess> {
  const mappings: Record<string, ColumnGuess> = {};
  const usedColumns = new Set<number>();
  
  // Score all field-column combinations
  const allGuesses: Array<{ columnIndex: number; guess: ColumnGuess }> = [];
  
  fields.forEach(field => {
    const guesses = guessColumn(field, headers, sampleRows, weights);
    guesses.forEach((guess, index) => {
      allGuesses.push({ columnIndex: index, guess });
    });
  });
  
  // Sort all guesses by confidence
  allGuesses.sort((a, b) => b.guess.confidence - a.guess.confidence);
  
  // Assign best non-conflicting mappings
  for (const { columnIndex, guess } of allGuesses) {
    const columnKey = columnIndex.toString();
    
    // Skip if column already mapped or field already assigned
    if (usedColumns.has(columnIndex) || Object.values(mappings).some(m => m.field === guess.field)) {
      continue;
    }
    
    // Only assign high-confidence mappings automatically
    if (guess.confidence >= 0.7) {
      mappings[columnKey] = guess;
      usedColumns.add(columnIndex);
    }
  }
  
  return mappings;
}

/**
 * Validates mapping quality and suggests improvements
 */
export function validateMappingQuality(
  mappings: Record<string, ColumnGuess>,
  requiredFields: InternalField[]
): {
  score: number; // 0-1 overall quality
  issues: Array<{
    type: 'missing_required' | 'low_confidence' | 'duplicate_mapping';
    field?: InternalField;
    message: string;
    severity: 'error' | 'warning';
  }>;
} {
  const issues: any[] = [];
  let score = 1.0;
  
  // Check for missing required fields
  const mappedFields = new Set(Object.values(mappings).map(m => m.field));
  const missingRequired = requiredFields.filter(field => !mappedFields.has(field));
  
  missingRequired.forEach(field => {
    issues.push({
      type: 'missing_required',
      field,
      message: `Pflichtfeld "${field}" ist nicht zugeordnet`,
      severity: 'error'
    });
    score -= 0.2; // Penalty for missing required fields
  });
  
  // Check for low confidence mappings
  Object.values(mappings).forEach(mapping => {
    if (mapping.confidence < 0.5) {
      issues.push({
        type: 'low_confidence',
        field: mapping.field,
        message: `Niedrige Zuordnungs-Sicherheit für "${mapping.field}" (${Math.round(mapping.confidence * 100)}%)`,
        severity: 'warning'
      });
      score -= 0.1;
    }
  });
  
  // Check for duplicate field mappings
  const fieldCounts = new Map<InternalField, number>();
  Object.values(mappings).forEach(mapping => {
    fieldCounts.set(mapping.field, (fieldCounts.get(mapping.field) || 0) + 1);
  });
  
  fieldCounts.forEach((count, field) => {
    if (count > 1) {
      issues.push({
        type: 'duplicate_mapping',
        field,
        message: `Feld "${field}" ist mehrfach zugeordnet`,
        severity: 'error'
      });
      score -= 0.3;
    }
  });
  
  return {
    score: Math.max(0, score),
    issues
  };
}