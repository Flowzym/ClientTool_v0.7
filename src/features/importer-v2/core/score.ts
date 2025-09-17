/**
 * Intelligent column mapping scoring system
 * Combines alias matching, token overlap, fuzzy matching, and content hints
 */

import type { InternalField, ColumnGuess, ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './types';
import { normalizeHeader, getTokenOverlap } from './normalize';
import { getAliases, findFieldByAlias } from './aliases';
import { suggestFieldsFromContent } from './detect';

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculates fuzzy match score using Levenshtein distance
 */
function calculateFuzzyScore(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

/**
 * Calculates Jaro similarity between two strings
 */
function jaroSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  if (matchWindow < 0) return 0;
  
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Scores a single field against a column header
 */
function scoreFieldMatch(
  field: InternalField,
  columnHeader: string,
  sampleRows?: string[][],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ColumnGuess {
  const normalized = normalizeHeader(columnHeader);
  const aliases = getAliases(field);
  const reasons: string[] = [];
  let confidence = 0;
  
  const hints = {
    exactAlias: false,
    tokenOverlap: 0,
    fuzzyScore: 0,
    contentHints: [] as string[]
  };

  // 1. Exact alias match (highest priority)
  const exactMatch = findFieldByAlias(columnHeader);
  if (exactMatch === field) {
    confidence += weights.exactAlias;
    hints.exactAlias = true;
    reasons.push('Exakte Übereinstimmung mit bekanntem Alias');
  }

  // 2. Token overlap scoring
  let bestTokenOverlap = 0;
  let bestAlias = '';
  
  for (const alias of aliases) {
    const overlap = getTokenOverlap(columnHeader, alias);
    if (overlap > bestTokenOverlap) {
      bestTokenOverlap = overlap;
      bestAlias = alias;
    }
  }
  
  if (bestTokenOverlap > 0) {
    const tokenScore = bestTokenOverlap * weights.tokenOverlap;
    confidence += tokenScore;
    hints.tokenOverlap = bestTokenOverlap;
    
    if (bestTokenOverlap >= 0.8) {
      reasons.push(`Hohe Token-Übereinstimmung mit "${bestAlias}" (${Math.round(bestTokenOverlap * 100)}%)`);
    } else if (bestTokenOverlap >= 0.5) {
      reasons.push(`Mittlere Token-Übereinstimmung mit "${bestAlias}" (${Math.round(bestTokenOverlap * 100)}%)`);
    }
  }

  // 3. Fuzzy matching (Levenshtein + Jaro)
  let bestFuzzyScore = 0;
  let bestFuzzyAlias = '';
  
  for (const alias of aliases) {
    const levenshtein = calculateFuzzyScore(normalized.fixed, normalizeHeader(alias).fixed);
    const jaro = jaroSimilarity(normalized.fixed, normalizeHeader(alias).fixed);
    const fuzzyScore = Math.max(levenshtein, jaro);
    
    if (fuzzyScore > bestFuzzyScore) {
      bestFuzzyScore = fuzzyScore;
      bestFuzzyAlias = alias;
    }
  }
  
  if (bestFuzzyScore > 0.6) {
    const fuzzyWeight = bestFuzzyScore * weights.fuzzyMatch;
    confidence += fuzzyWeight;
    hints.fuzzyScore = bestFuzzyScore;
    reasons.push(`Ähnlichkeit mit "${bestFuzzyAlias}" (${Math.round(bestFuzzyScore * 100)}%)`);
  }

  // 4. Content-based hints (if sample data available)
  if (sampleRows && sampleRows.length > 0) {
    // Extract column index for this header (simplified - assumes headers are in order)
    const columnIndex = 0; // TODO: This should be determined by the caller
    const sampleValues = sampleRows
      .map(row => row[columnIndex])
      .filter(val => val && typeof val === 'string')
      .slice(0, 10);

    if (sampleValues.length > 0) {
      const contentSuggestions = suggestFieldsFromContent(sampleValues);
      const matchingSuggestion = contentSuggestions.find(s => s.field === field);
      
      if (matchingSuggestion && matchingSuggestion.confidence > 0.5) {
        const contentBoost = matchingSuggestion.confidence * weights.contentHint;
        confidence += contentBoost;
        hints.contentHints.push(matchingSuggestion.reason);
        reasons.push(`Inhaltsanalyse: ${matchingSuggestion.reason}`);
      }
    }
  }

  // Normalize confidence to 0-1 range
  confidence = Math.min(confidence, 1.0);

  return {
    field,
    confidence,
    reasons,
    hints
  };
}

/**
 * Guesses the best field mapping for a column
 */
export function guessColumn(
  field: InternalField,
  candidates: string[],
  sampleRows?: string[][]
): ColumnGuess {
  if (!candidates || candidates.length === 0) {
    return {
      field,
      confidence: 0,
      reasons: ['Keine Kandidaten verfügbar'],
      hints: {}
    };
  }

  // Score each candidate
  const scores = candidates.map(candidate => 
    scoreFieldMatch(field, candidate, sampleRows)
  );

  // Return the best match
  return scores.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
}

/**
 * Guesses mappings for all fields against available columns
 */
export function guessAllMappings(
  fields: InternalField[],
  columnHeaders: string[],
  sampleRows?: string[][],
  weights?: ScoringWeights
): Record<string, ColumnGuess> {
  const result: Record<string, ColumnGuess> = {};
  const usedColumns = new Set<string>();

  // Sort fields by priority (required fields first)
  const requiredFields: InternalField[] = ['firstName', 'lastName', 'amsId'];
  const sortedFields = [
    ...fields.filter(f => requiredFields.includes(f)),
    ...fields.filter(f => !requiredFields.includes(f))
  ];

  for (const field of sortedFields) {
    // Only consider unused columns to avoid conflicts
    const availableColumns = columnHeaders.filter(col => !usedColumns.has(col));
    
    if (availableColumns.length === 0) {
      result[field] = {
        field,
        confidence: 0,
        reasons: ['Keine verfügbaren Spalten mehr'],
        hints: {}
      };
      continue;
    }

    const bestGuess = guessColumn(field, availableColumns, sampleRows);
    
    // Only use columns with reasonable confidence
    if (bestGuess.confidence > 0.3) {
      // Find the actual column header that produced this score
      const matchedColumn = availableColumns.find(col => {
        const score = scoreFieldMatch(field, col, sampleRows, weights);
        return Math.abs(score.confidence - bestGuess.confidence) < 0.001;
      });
      
      if (matchedColumn) {
        usedColumns.add(matchedColumn);
        result[matchedColumn] = bestGuess;
      }
    }
  }

  return result;
}

/**
 * Calculates overall mapping quality score
 */
export function calculateMappingQuality(
  mappings: Record<string, ColumnGuess>,
  requiredFields: InternalField[] = ['firstName', 'lastName']
): {
  score: number;
  coverage: number;
  requiredCoverage: number;
  averageConfidence: number;
} {
  const allGuesses = Object.values(mappings);
  const mappedFields = allGuesses.map(g => g.field);
  
  // Calculate coverage
  const totalFields = Object.keys(mappings).length;
  const coverage = totalFields > 0 ? allGuesses.length / totalFields : 0;
  
  // Calculate required field coverage
  const mappedRequiredFields = requiredFields.filter(f => mappedFields.includes(f));
  const requiredCoverage = requiredFields.length > 0 ? mappedRequiredFields.length / requiredFields.length : 1;
  
  // Calculate average confidence
  const averageConfidence = allGuesses.length > 0 
    ? allGuesses.reduce((sum, g) => sum + g.confidence, 0) / allGuesses.length 
    : 0;
  
  // Overall score combines coverage and confidence
  const score = (coverage * 0.3 + requiredCoverage * 0.4 + averageConfidence * 0.3);
  
  return {
    score,
    coverage,
    requiredCoverage,
    averageConfidence
  };
}