/**
 * Date helpers.
 * - parseToISO: strict -> returns ISO string or throws
 * - safeParseToISO: permissive (delegates to dateSafe)
 * - nowISO: current timestamp as ISO string
 */
import { safeParseToISO as _safeParseToISO } from './dateSafe';

export type ISODateString = string;

/** Pad to two digits */
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Strict parse. Returns ISO string or throws if the value cannot be parsed.
 */
export function parseToISO(input: unknown): ISODateString {
  if (input instanceof Date) {
    return input.toISOString();
  }

  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('parseToISO: empty');
  }

  const s = input.trim();

  // Try native Date parse first
  const d = new Date(s);
  if (!isNaN(d.valueOf())) {
    return d.toISOString();
  }

  // Try D.M.YYYY or D/M/YYYY
  const m1 = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m1) {
    const [, d2, m2, y2] = m1;
    const y = Number(y2);
    const mm = Number(m2);
    const dd = Number(d2);
    const dt = new Date(y, mm - 1, dd);
    if (!isNaN(dt.valueOf())) {
      return dt.toISOString();
    }
  }

  throw new Error('parseToISO: unparseable');
}

/** Current timestamp as ISO string */
export function nowISO(): ISODateString {
  return new Date().toISOString();
}

/** Today as YYYY-MM-DD */
export function todayISO(): ISODateString {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

// permissive variant exposed from dateSafe
export const safeParseToISO = _safeParseToISO;
