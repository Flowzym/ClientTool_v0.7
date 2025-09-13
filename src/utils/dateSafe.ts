// src/utils/dateSafe.ts
export type ISODateString = `${number}-${number}-${number}`;

/**
 * Parse a variety of human formats into ISO (YYYY-MM-DD).
 * - Accepts: ISO, dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy, yyyy/mm/dd, yyyy.mm.dd,
 *   and compact 8-digit strings (yyyymmdd or ddmmyyyy).
 * - Returns undefined for empty/invalid inputs (never throws).
 */
export function safeParseToISO(input: unknown): ISODateString | undefined {
  if (input == null) return undefined;

  // Date instance -> ISO
  if (input instanceof Date && !isNaN(input.getTime())) {
    return toIsoYmd(input) as ISODateString;
  }

  // Numbers: treat as epoch ms if plausible (>= 10^10) otherwise ignore
  if (typeof input === "number") {
    if (!isFinite(input)) return undefined;
    // assume milliseconds if in a realistic range (>= 2001-09-09)
    if (Math.abs(input) >= 1e10) {
      const d = new Date(input);
      return isValidDate(d) ? (toIsoYmd(d) as ISODateString) : undefined;
    }
    return undefined;
  }

  // Strings
  if (typeof input !== "string") return undefined;
  const raw = input.trim();
  if (!raw) return undefined;

  // Already ISO YYYY-MM-DD
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(raw)) {
    const [y, m, d] = raw.split("-").map((n) => parseInt(n, 10));
    return isValidYmd(y, m, d) ? (raw as ISODateString) : undefined;
  }

  // Split by common separators
  const parts = raw.split(/[\.\/-_\s]+/).filter(Boolean);
  if (parts.length === 3) {
    // yyyy-mm-dd or dd-mm-yyyy
    const a = parts[0], b = parts[1], c = parts[2];
    const A = parseInt(a, 10), B = parseInt(b, 10), C = parseInt(c, 10);
    if ([A, B, C].some((n) => Number.isNaN(n))) return undefined;

    let y: number, m: number, d: number;
    if (a.length === 4) {
      // yyyy-mm-dd
      y = A; m = B; d = C;
    } else if (c.length === 4) {
      // dd-mm-yyyy
      d = A; m = B; y = C;
    } else {
      // ambiguous -> bail
      return undefined;
    }
    if (!isValidYmd(y, m, d)) return undefined;
    return asIso(y, m, d);
  }

  // Compact 8 digits
  const compact = /^\d{8}$/;
  if (compact.test(raw)) {
    const digits = raw;
    const maybeYear = parseInt(digits.slice(0, 4), 10);
    const maybeDayFirst = parseInt(digits.slice(0, 2), 10);
    // try yyyymmdd first if first 4 digits look like a year
    if (maybeYear >= 1900 && maybeYear <= 2100) {
      const y = maybeYear;
      const m = parseInt(digits.slice(4, 6), 10);
      const d = parseInt(digits.slice(6, 8), 10);
      if (isValidYmd(y, m, d)) return asIso(y, m, d);
    }
    // else try ddmmyyyy
    const d = maybeDayFirst;
    const m = parseInt(digits.slice(2, 4), 10);
    const y = parseInt(digits.slice(4, 8), 10);
    if (isValidYmd(y, m, d)) return asIso(y, m, d);
    return undefined;
  }

  // As last resort, let Date try (but reject if timezones shift date)
  const tryDate = new Date(raw);
  if (isValidDate(tryDate)) {
    return toIsoYmd(tryDate) as ISODateString;
  }

  return undefined;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function asIso(y: number, m: number, d: number): ISODateString {
  return `${y}-${pad2(m)}-${pad2(d)}` as ISODateString;
}

function toIsoYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}
