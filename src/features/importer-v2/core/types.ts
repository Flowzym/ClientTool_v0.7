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

export interface TemplateV2 {
  id: string;
  name: string;
  description?: string;
  sourcePattern: string; // regex or glob for auto-detection
  mappings: Record<string, InternalField>;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
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
  type: 'date' | 'email' | 'phone' | 'zip' | 'svNumber' | 'amsId';
  confidence: number;
  samples: string[];
}