/**
 * Template system types
 * Defines structure for saving and loading mapping configurations
 */

export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  fieldCount: number;
  customFieldCount: number;
  tags?: string[];
  isDefault?: boolean;
}

export interface TemplateOptions {
  dateFormat: 'auto' | 'dd.mm.yyyy' | 'yyyy-mm-dd';
  phoneHandling: 'split' | 'combined';
  genderMapping: Record<string, 'M' | 'F'>;
  encoding?: 'utf-8' | 'latin-1' | 'auto';
  delimiter?: ',' | ';' | 'auto';
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;
}

export interface TemplateUsage {
  templateId: string;
  usedAt: string;
  fileName: string;
  recordCount: number;
  successRate: number;
}

export interface TemplateStats {
  totalUses: number;
  lastUsed?: string;
  averageSuccessRate: number;
  commonFiles: string[];
}