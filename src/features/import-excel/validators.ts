import { safeParseToISO } from '../../utils/dateSafe';

export type ImportIssueLevel = 'warn' | 'error';
export interface ImportIssue {
  field: string;
  message: string;
  level: ImportIssueLevel;
  rowIndex?: number;
}

export interface ImportMappedRow {
  name?: string;
  phone?: string;
  email?: string;
  followUp?: string;
  status?: string;
  // allow additional mapped fields without using `any`
  [key: string]: unknown;
}

/**
 * Normalize a raw row and ensure date fields are safe.
 * Never throws on invalid dates.
 */
export function normalizeRow(row: Record<string, unknown>): ImportMappedRow {
  const followUpISO = safeParseToISO(row.followUp);
  return {
    ...row,
    followUp: followUpISO ?? (typeof row.followUp === 'string' ? row.followUp : undefined),
  } as ImportMappedRow;
}

/**
 * Validate a normalized row and return issues (does not throw).
 * This mirrors the previous validateRow logic but guards date parsing.
 */
export function validateRow(row: ImportMappedRow): ImportIssue[] {
  const issues: ImportIssue[] = [];

  if (!row.name || String(row.name).trim().length < 2) {
    issues.push({ field: 'name', message: 'Name fehlt oder zu kurz', level: 'error' });
  }

  if (row.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(row.email))) {
    issues.push({ field: 'email', message: 'E-Mail-Format ungültig', level: 'warn' });
  }

  if (row.phone) {
    const numeric = String(row.phone).replace(/\D/g, '');
    if (numeric.length > 0 && numeric.length < 4) {
      issues.push({ field: 'phone', message: 'Telefon-Nummer unvollständig', level: 'warn' });
    }
  }

  if (row.followUp) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(row.followUp))) {
      // looks like ISO -> ok
    } else {
      const fixed = safeParseToISO(row.followUp);
      if (fixed) {
        row.followUp = fixed;
      } else {
        issues.push({ field: 'followUp', message: 'Datum nicht lesbar', level: 'warn' });
      }
    }
  }

  return issues;
}
