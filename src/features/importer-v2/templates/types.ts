/**
 * Template-specific types for Importer V2
 * Types for mapping templates, rules, and template management
 */

import type { InternalField, ValidationRule, NormalizationRule } from '../core/types';

export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount?: number;
  tags?: string[];
  category?: 'system' | 'user' | 'shared';
}

export interface ImportTemplate {
  metadata: TemplateMetadata;
  
  // Detection patterns for auto-matching
  detection: {
    fileNamePatterns?: string[]; // Glob patterns for filename matching
    headerPatterns?: string[];   // Required headers for detection
    contentHints?: string[];     // Content patterns that suggest this template
    confidence?: number;         // Minimum confidence for auto-detection
  };
  
  // Column mappings
  columnMappings: Record<string, InternalField>;
  
  // Custom fields defined in this template
  customFields?: Array<{
    id: string;
    name: string;
    label: string;
    dataType: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
    required: boolean;
    defaultValue?: any;
    validationRules: ValidationRule[];
  }>;
  
  // Normalization rules
  normalizationRules?: NormalizationRule[];
  
  // Validation rules
  validationRules?: ValidationRule[];
  
  // Transform options
  transformOptions?: {
    dateFormat?: 'auto' | 'dd.mm.yyyy' | 'yyyy-mm-dd';
    phoneFormat?: 'split' | 'combined';
    genderMapping?: Record<string, 'M' | 'F' | 'D'>;
    addressFormat?: 'combined' | 'split';
  };
}

export interface TemplateMatchResult {
  template: ImportTemplate;
  confidence: number;
  reasons: string[];
  matchedPatterns: {
    fileName?: boolean;
    headers?: string[];
    content?: string[];
  };
}

export interface TemplateSearchQuery {
  fileName?: string;
  headers?: string[];
  sampleData?: string[][];
  category?: 'system' | 'user' | 'shared';
  tags?: string[];
}

export interface TemplateUsage {
  templateId: string;
  fileName: string;
  timestamp: string;
  success: boolean;
  stats: {
    rowsProcessed: number;
    errorsFound: number;
    warningsFound: number;
    mappingQuality: number;
  };
  userFeedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    comments?: string;
    suggestedImprovements?: string[];
  };
}

export interface TemplateExport {
  version: string;
  exportedAt: string;
  templates: ImportTemplate[];
  metadata: {
    exportedBy?: string;
    description?: string;
    compatibility: string[];
  };
}

export interface TemplateImport {
  templates: ImportTemplate[];
  conflicts?: Array<{
    templateId: string;
    existingName: string;
    importedName: string;
    resolution: 'skip' | 'overwrite' | 'rename';
  }>;
}