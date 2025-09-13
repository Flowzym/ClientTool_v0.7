/**
 * App-weite Datums-Utilities
 * Wird von ImportExcel, ImportPdf und Sync genutzt.
 */

export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Akzeptiert u.a.:
 *  - "dd.mm.yyyy"
 *  - "yyyy-mm-dd" (mit/ohne Zeitteil)
 *  - ISO-Strings
 *  - frei parsebare Datumstexte
 * Liefert ein ISO-String (UTC).
 */
export function parseToISO(input: string): string {
  if (!input) throw new Error('parseToISO: empty');
  const s = String(input).trim();

  // dd.mm.yyyy
  let m = /^\s*(\d{2})\.(\d{2})\.(\d{4})\s*$/.exec(s);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isFinite(d.getTime())) throw new Error('parseToISO: invalid dd.mm.yyyy');
    return d.toISOString();
  }

  // dd/mm/yyyy
  m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isFinite(d.getTime())) throw new Error('parseToISO: invalid dd/mm/yyyy');
    return d.toISOString();
  }

  // yyyy-mm-dd (mit optionalem Zeitteil)
  m = /^\s*(\d{4})-(\d{2})-(\d{2})(?:\s|T|$)/.exec(s);
  if (m) {
    const [, yyyy, mm, dd] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isFinite(d.getTime())) throw new Error('parseToISO: invalid yyyy-mm-dd');
    return d.toISOString();
  }

  const t = Date.parse(s);
  if (Number.isFinite(t)) return new Date(t).toISOString();

  throw new Error('parseToISO: unsupported format');
}

/**
 * Sichere Variante von parseToISO - wirft keine Exceptions
 * Gibt undefined zurück bei unbekannten/ungültigen Formaten
 */
export function safeParseToISO(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  
  try {
    return parseToISO(String(value));
  } catch {
    return undefined;
  }
}

export function isValidISO(v?: string | null): boolean {
  if (!v) return false;
  const t = Date.parse(v as string);
  return Number.isFinite(t);
}

export function formatDDMMYYYY(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return undefined;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function toEpoch(v: string): number {
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}
