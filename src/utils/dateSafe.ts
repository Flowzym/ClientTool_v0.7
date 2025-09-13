// src/utils/dateSafe.ts
// Non-throwing, permissive date parser. Returns ISO string or undefined.
export function safeParseToISO(input: unknown): string | undefined {
  if (input == null) return undefined;

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? undefined : input.toISOString();
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  if (typeof input !== 'string') return undefined;

  const s = input.trim();
  if (!s) return undefined;

  // dd.mm.yyyy
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  // dd/mm/yyyy
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  // Fallback: Date versteht ISO/US
  const dflt = new Date(s);
  return isNaN(dflt.getTime()) ? undefined : dflt.toISOString();
}