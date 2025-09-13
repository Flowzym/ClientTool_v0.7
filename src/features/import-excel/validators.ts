import { safeParseToISO } from '../../utils/dateSafe';
import type { ImportRawRow, ImportMappedRow } from './types';

export type AnyRow = Record<string, unknown>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Normalize a single import row.
 * - Parses followUp to ISO if possible; leaves original if not.
 * - Never throws on empty/invalid dates.
 */
export function normalizeRow(row: ImportRawRow): ImportMappedRow {
  const followUp = row?.followUp as unknown;
  const followUpISO = safeParseToISO(followUp);
  return {
    ...row,
    followUp: followUpISO ?? (typeof followUp === 'string' ? followUp : '')
  } as ImportMappedRow;
}

export function validateRow(row: ImportMappedRow): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!row.firstName && !row.lastName && !row.name) {
    errors.push('Name erforderlich');
  }
  
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

// Re-export dedupeImport
export { dedupeImport } from './dedupe';