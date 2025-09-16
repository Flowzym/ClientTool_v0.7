/**
 * Core types for Importer V2
 * Enhanced import pipeline with intelligent mapping and validation
 */

// TODO: Define enhanced import types
// - ImportSource (file, url, clipboard)
// - ImportFormat (excel, csv, pdf, json, xml)
// - ImportStrategy (append, sync, merge, replace)
// - MappingTemplate (reusable column mappings)
// - ValidationRule (custom field validation)
// - NormalizationRule (data transformation)

export interface ImportSourceV2 {
  id: string;
  type: 'file' | 'url' | 'clipboard' | 'api';
  format: 'excel' | 'csv' | 'pdf' | 'json' | 'xml' | 'html';
  metadata: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    encoding?: string;
    lastModified?: string;
  };
}

export interface ImportStrategyV2 {
  mode: 'append' | 'sync' | 'merge' | 'replace';
  options: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    archiveRemoved?: boolean;
    respectProtectedFields?: boolean;
    onlyEmptyFields?: boolean;
  };
}

export interface MappingTemplateV2 {
  id: string;
  name: string;
  sourcePattern: string; // regex or glob pattern for auto-detection
  columnMappings: Record<string, string>;
  normalizationRules: NormalizationRuleV2[];
  validationRules: ValidationRuleV2[];
  createdAt: string;
  updatedAt: string;
}

export interface NormalizationRuleV2 {
  field: string;
  type: 'date' | 'phone' | 'email' | 'name' | 'address' | 'enum' | 'custom';
  options: Record<string, any>;
}

export interface ValidationRuleV2 {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  options: Record<string, any>;
  message: string;
}

export interface ImportResultV2 {
  success: boolean;
  sourceId: string;
  strategy: ImportStrategyV2;
  stats: {
    processed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  issues: ImportIssueV2[];
  duration: number;
}

export interface ImportIssueV2 {
  type: 'error' | 'warning' | 'info';
  row: number;
  column?: string;
  field?: string;
  message: string;
  suggestion?: string;
}