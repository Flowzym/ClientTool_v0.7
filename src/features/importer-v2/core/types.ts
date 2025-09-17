/**
 * Core types for Importer V2
 * Enhanced import pipeline with intelligent mapping and validation
 */

// Internal field keys (canonical domain fields)
export type InternalField = 
  | 'amsId'
  | 'firstName'
  | 'lastName'
  | 'title'
  | 'gender'
  | 'birthDate'
  | 'svNumber'
  | 'phone'
  | 'email'
  | 'address'
  | 'zip'
  | 'city'
  | 'countryCode'
  | 'areaCode'
  | 'phoneNumber'
  | 'amsBookingDate'
  | 'entryDate'
  | 'exitDate'
  | 'amsAgentLastName'
  | 'amsAgentFirstName'
  | 'amsAdvisor'
  | 'note'
  | 'internalCode'
  | 'status'
  | 'priority'
  | 'result'
  | 'angebot'
  | 'followUp'
  | 'lastActivity'
  | 'assignedTo';

export interface ColumnGuess {
  field: InternalField;
  confidence: number; // 0-1
  reasons: string[];
  hints: {
    exactAlias?: boolean;
    tokenOverlap?: number;
    fuzzyScore?: number;
    contentHints?: string[];
  };
}

export interface MappingResult {
  column: string;
  originalHeader: string;
  normalizedHeader: string;
  guesses: ColumnGuess[];
  bestGuess?: ColumnGuess;
  userOverride?: InternalField;
}

export interface MappingTemplateV2 {
  id: string;
  name: string;
  description?: string;
  sourcePattern: string; // regex or glob for auto-detection
  columnMappings: Record<string, InternalField>;
  normalizationRules: NormalizationRule[];
  validationRules: ValidationRule[];
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
}

export interface NormalizationRule {
  id: string;
  type: 'mojibake_repair' | 'whitespace_cleanup' | 'diacritic_removal' | 'token_split';
  field?: InternalField;
  parameters: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface ValidationRule {
  id: string;
  type: 'required' | 'format' | 'range' | 'cross_field';
  field: InternalField;
  parameters: Record<string, any>;
  severity: 'error' | 'warning';
  enabled: boolean;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  row: number;
  column?: string;
  field?: InternalField;
  message: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface ContentHint {
  type: 'date' | 'email' | 'phone' | 'zip' | 'svNumber' | 'amsId' | 'name' | 'address';
  confidence: number;
  samples: string[];
  pattern?: string;
}

export interface ContentAnalysis {
  hints: ContentHint[];
  patterns: {
    datePattern?: RegExp;
    emailPattern?: RegExp;
    phonePattern?: RegExp;
    zipPattern?: RegExp;
    svPattern?: RegExp;
    amsIdPattern?: RegExp;
  };
}

export interface NormalizationResult {
  fixed: string;
  tokens: string[];
  original: string;
  repairs: string[];
}

export interface ScoringWeights {
  exactAlias: number;
  tokenOverlap: number;
  fuzzyMatch: number;
  contentHint: number;
  positionHint: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  exactAlias: 1.0,
  tokenOverlap: 0.7,
  fuzzyMatch: 0.4,
  contentHint: 0.6,
  positionHint: 0.2
};