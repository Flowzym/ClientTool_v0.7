import { safeParseToISO } from '../../utils/date/safeParseToISO';

export type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] };

/**
 * Minimal validation used by ImportExcel.tsx
 * - Ensures required "name" is present
 * - Tries to parse an optional "followUp" date permissively
 */
export function validateRow(row: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // required: name
  const name = String(row.name ?? '').trim();
  if (!name) errors.push('Missing required field: name');

  // followUp (optional) — permissive parse
  const rawFollowUp = (row as any).followUp;
  if (rawFollowUp != null && String(rawFollowUp).trim()) {
    try {
      const iso = safeParseToISO(String(rawFollowUp));
      if (iso) {
        (row as any).followUp = iso;
      } else {
        warnings.push('Could not parse follow-up date');
      }
    } catch {
      warnings.push('Could not parse follow-up date');
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export { dedupeImport } from './dedupe';
