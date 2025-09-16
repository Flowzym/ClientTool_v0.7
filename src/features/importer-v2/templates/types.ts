/**
 * Template-specific types for Importer V2
 * Types for mapping templates, rules, and template management
 */

// TODO: Define template-specific types
// - Template metadata and versioning
// - Rule definitions and parameters
// - Template sharing and permissions
// - Template validation and migration
// - Usage analytics and optimization

export interface TemplateMetadataV2 {
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
}

export interface TemplateRuleV2 {
  id: string;
  type: 'normalization' | 'validation' | 'transformation';
  field: string;
  parameters: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface TemplateVersionV2 {
  version: string;
  changes: string[];
  createdAt: string;
  author?: string;
  breaking: boolean;
}

export interface TemplateUsageV2 {
  templateId: string;
  fileName: string;
  timestamp: string;
  success: boolean;
  stats: {
    rowsProcessed: number;
    errorsFound: number;
    warningsFound: number;
  };
  userFeedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    comments?: string;
  };
}

export interface TemplateShareV2 {
  templateId: string;
  sharedBy: string;
  sharedWith: string[];
  permissions: ('read' | 'write' | 'delete')[];
  sharedAt: string;
  expiresAt?: string;
}