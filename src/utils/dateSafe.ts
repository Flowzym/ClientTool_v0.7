// src/utils/dateSafe.ts
// Non-throwing, permissive date parser. Returns YYYY-MM-DD or undefined.
export type ISODateString = string;

const pad2 = (n: number) => String(n).padStart(2, "0");

const fromYMD = (y: number, m: number, d: number): ISODateString | undefined => {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  if (y < 1000 || m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Validate round-trip (reject impossible dates like 31 Feb)
  if (dt.getUTCFullYear() !== y || (dt.getUTCMonth() + 1) !== m || dt.getUTCDate() !== d) return undefined;
  return `${y}-${pad2(m)}-${pad2(d)}`;
};

export function safeParseToISO(input: unknown): ISODateString | undefined {
  if (input == null) return undefined;

  // If Date instance
  if (input instanceof Date && !isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = input.getMonth() + 1;
    const d = input.getDate();
    return fromYMD(y, m, d);
  }

  // If number: maybe epoch ms or yyyymmdd
  if (typeof input === "number" && Number.isFinite(input)) {
    // Treat as epoch ms if it's a large timestamp (>= 10^10 implies seconds, 10^12 implies ms)
    if (Math.abs(input) > 10 ** 10) {
      const d = new Date(input > 10 ** 12 ? input : input * 1000);
      if (!isNaN(d.getTime())) {
        return fromYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
    }
    // Or compact YYYYMMDD
    const s = String(input);
    if (s.length === 8) {
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(4, 6));
      const d = Number(s.slice(6, 8));
      return fromYMD(y, m, d);
    }
    return undefined;
  }

  // Strings with several common formats
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return undefined;

    // ISO-ish YYYY-MM-DD (allow single digits in M/D)
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) return fromYMD(Number(m[1]), Number(m[2]), Number(m[3]));

    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (m) return fromYMD(Number(m[3]), Number(m[2]), Number(m[1]));

    // Compact DDMMYYYY
    m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (m) return fromYMD(Number(m[3]), Number(m[2]), Number(m[1]));

    // As a last resort: Date.parse (may be timezone-dependent); normalize to Y-M-D
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return fromYMD(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
    }
    return undefined;
  }

  return undefined;
}
