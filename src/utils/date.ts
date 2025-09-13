/**
 * Date helpers.
 * - parseToISO: strict -> returns YYYY-MM-DD or throws
 * - safeParseToISO: permissive (delegates to dateSafe)
 * - nowISO: today's date as YYYY-MM-DD
 */
import { safeParseToISO as _safeParseToISO } from './dateSafe';

export type ISODateString = string;

/** Pad to two digits */
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Strict parse. Accepts: Date, ISO-like strings, locale dates.
 * Returns YYYY-MM-DD or throws if the value cannot be parsed.
 */
export function parseToISO(input: unknown): ISODateString {
  if (input instanceof Date) {
    const y = input.getFullYear();
    const m = pad2(input.getMonth() + 1);
    const d = pad2(input.getDate());
    return `${y}-${m}-${d}`;
  }

  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('parseToISO: empty');
  }

  const s = input.trim();

  // Try native Date parse first
  const d = new Date(s);
  if (!isNaN(d.valueOf())) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${y}-${m}-${dd}`;
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
      return `${y}-${pad2(mm)}-${pad2(dd)}`;
    }
  }

  throw new Error('parseToISO: unparseable');
}

/** Today as YYYY-MM-DD */
export function nowISO(): ISODateString {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

// permissive variant exposed from dateSafe
export const safeParseToISO = _safeParseToISO;
