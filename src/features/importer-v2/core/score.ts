/**
 * Intelligent column mapping scoring system
 * Combines alias matching, token overlap, fuzzy matching, and content hints
 */

import type { InternalField, ColumnGuess, ScoringWeights } from './types';
import { DEFAULT_SCORING_WEIGHTS } from './types';
import { getAliases } from './aliases';
import { normalizeHeader, jaroWinklerSimilarity, tokenOverlapRatio } from './normalize';
import { suggestFieldsFromContent } from './detect';

/**
 * Guesses the best field mapping for a column
 */
export function guessColumn(
  field: InternalField,
  candidates: string[],
  sampleRows?: string[][],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ColumnGuess {
  if (candidates.length === 0) {
    return {
      field,
      confidence: 0,
      reasons: ['Keine Kandidaten verfügbar'],
      hints: {}
    };
  }

  const fieldAliases = getAliases(field);
  const reasons: string[] = [];
  let bestConfidence = 0;
  let bestHints: ColumnGuess['hints'] = {};

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (!candidate) continue;

    const normalized = normalizeHeader(candidate);
    let confidence = 0;
    const hints: ColumnGuess['hints'] = {};

    // 1. Exact alias match (highest priority)
    const exactMatch = fieldAliases.some(alias => 
      normalizeHeader(alias).fixed === normalized.fixed
    );
    
    if (exactMatch) {
      confidence += weights.exactAlias;
      hints.exactAlias = true;
      reasons.push(`Exakte Alias-Übereinstimmung für "${candidate}"`);
    }

    // 2. Token overlap scoring
    let maxTokenOverlap = 0;
    for (const alias of fieldAliases) {
      const aliasNorm = normalizeHeader(alias);
      const overlap = tokenOverlapRatio(normalized.tokens, aliasNorm.tokens);
      maxTokenOverlap = Math.max(maxTokenOverlap, overlap);
    }
    
    if (maxTokenOverlap > 0.3) {
      confidence += weights.tokenOverlap * maxTokenOverlap;
      hints.tokenOverlap = maxTokenOverlap;
      reasons.push(`Token-Überlappung: ${Math.round(maxTokenOverlap * 100)}%`);
    }

    // 3. Fuzzy matching (Jaro-Winkler)
    let maxFuzzyScore = 0;
    for (const alias of fieldAliases) {
      const aliasNorm = normalizeHeader(alias);
      const fuzzyScore = jaroWinklerSimilarity(normalized.fixed, aliasNorm.fixed);
      maxFuzzyScore = Math.max(maxFuzzyScore, fuzzyScore);
    }
    
    if (maxFuzzyScore > 0.6) {
      confidence += weights.fuzzyMatch * maxFuzzyScore;
      hints.fuzzyScore = maxFuzzyScore;
      reasons.push(`Fuzzy-Matching: ${Math.round(maxFuzzyScore * 100)}%`);
    }

    // 4. Content hints from sample data
    if (sampleRows && sampleRows[i]) {
      const columnSamples = sampleRows.map(row => row[i]).filter(Boolean);
      const contentSuggestions = suggestFieldsFromContent(columnSamples);
      
      const fieldSuggestion = contentSuggestions.find(s => s.field === field);
      if (fieldSuggestion && fieldSuggestion.confidence > 0.5) {
        confidence += weights.contentHint * fieldSuggestion.confidence;
        hints.contentHints = [fieldSuggestion.reason];
        reasons.push(`Inhalts-Analyse: ${fieldSuggestion.reason}`);
      }
    }

    // 5. Position hints (common field order)
    const positionHints: Record<InternalField, number[]> = {
      firstName: [0, 1],
      lastName: [1, 2],
      email: [2, 3, 4],
      phone: [3, 4, 5],
      address: [4, 5, 6],
      zip: [5, 6, 7],
      city: [6, 7, 8],
      amsId: [0],
      status: [8, 9, 10],
      priority: [9, 10, 11]
    } as any;
    
    const expectedPositions = positionHints[field] || [];
    if (expectedPositions.includes(i)) {
      confidence += weights.positionHint;
      reasons.push(`Erwartete Spaltenposition: ${i + 1}`);
    }

    // Update best score
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestHints = hints;
    }
  }

  // Normalize confidence to 0-1 range
  const normalizedConfidence = Math.min(1.0, bestConfidence);

  return {
    field,
    confidence: normalizedConfidence,
    reasons,
    hints: bestHints
  };
}

/**
 * Finds best mappings for all fields avoiding conflicts
 */
export function findBestMappings(
  fields: InternalField[],
  columnHeaders: string[],
  sampleRows?: string[][],
  weights?: ScoringWeights
): Record<string, ColumnGuess> {
  const mappings: Record<string, ColumnGuess> = {};
  const usedFields = new Set<InternalField>();

  // Sort fields by priority (required fields first)
  const requiredFields: InternalField[] = ['firstName', 'lastName', 'amsId'];
  const sortedFields = [
    ...fields.filter(f => requiredFields.includes(f)),
    ...fields.filter(f => !requiredFields.includes(f))
  ];

  for (const field of sortedFields) {
    if (usedFields.has(field)) continue;

    let bestMapping: { columnIndex: number; guess: ColumnGuess } | null = null;

    for (let i = 0; i < columnHeaders.length; i++) {
      const header = columnHeaders[i];
      if (!header || mappings[i.toString()]) continue; // Skip if already mapped

      const guess = guessColumn(field, [header], sampleRows ? [sampleRows.map(row => row[i])] : undefined, weights);
      
      if (!bestMapping || guess.confidence > bestMapping.guess.confidence) {
        bestMapping = { columnIndex: i, guess };
      }
    }

    // Only assign if confidence is above threshold
    if (bestMapping && bestMapping.guess.confidence > 0.3) {
      mappings[bestMapping.columnIndex.toString()] = bestMapping.guess;
      usedFields.add(field);
    }
  }

  return mappings;
}

/**
 * Validates mapping quality and identifies issues
 */
export function validateMappingQuality(
  mappings: Record<string, ColumnGuess>,
  requiredFields: InternalField[] = ['firstName', 'lastName']
): {
  score: number;
  coverage: number;
  requiredCoverage: number;
  averageConfidence: number;
  issues: Array<{
    type: 'missing_required' | 'low_confidence' | 'duplicate_mapping';
    field?: InternalField;
    column?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
} {
  const issues: any[] = [];
  const mappedFields = new Set(Object.values(mappings).map(m => m.field));
  
  // Check for missing required fields
  for (const requiredField of requiredFields) {
    if (!mappedFields.has(requiredField)) {
      issues.push({
        type: 'missing_required',
        field: requiredField,
        message: `Pflichtfeld "${requiredField}" ist nicht zugeordnet`,
        severity: 'error'
      });
    }
  }

  // Check for low confidence mappings
  for (const [column, mapping] of Object.entries(mappings)) {
    if (mapping.confidence < 0.5) {
      issues.push({
        type: 'low_confidence',
        field: mapping.field,
        column,
        message: `Niedrige Zuordnungsqualität (${Math.round(mapping.confidence * 100)}%)`,
        severity: 'warning'
      });
    }
  }

  // Check for duplicate field mappings
  const fieldCounts = new Map<InternalField, number>();
  for (const mapping of Object.values(mappings)) {
    fieldCounts.set(mapping.field, (fieldCounts.get(mapping.field) || 0) + 1);
  }
  
  for (const [field, count] of fieldCounts) {
    if (count > 1) {
      issues.push({
        type: 'duplicate_mapping',
        field,
        message: `Feld "${field}" ist ${count} Spalten zugeordnet`,
        severity: 'error'
      });
    }
  }

  // Calculate metrics
  const totalColumns = Object.keys(mappings).length;
  const totalFields = new Set(Object.values(mappings).map(m => m.field)).size;
  const coverage = totalColumns > 0 ? totalFields / totalColumns : 0;
  const requiredCoverage = requiredFields.length > 0 ? 
    requiredFields.filter(f => mappedFields.has(f)).length / requiredFields.length : 1;
  
  const confidences = Object.values(mappings).map(m => m.confidence);
  const averageConfidence = confidences.length > 0 ? 
    confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;

  // Calculate overall score
  const errorPenalty = issues.filter(i => i.severity === 'error').length * 0.3;
  const warningPenalty = issues.filter(i => i.severity === 'warning').length * 0.1;
  const score = Math.max(0, (coverage * 0.4 + requiredCoverage * 0.4 + averageConfidence * 0.2) - errorPenalty - warningPenalty);

  return {
    score,
    coverage,
    requiredCoverage,
    averageConfidence,
    issues
  };
}