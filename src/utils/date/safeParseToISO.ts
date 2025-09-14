/**
 * Unified date parsing utility - Single source of truth
 * Handles various date formats safely without throwing
 */

export type ISODateString = string;

/**
 * Safe date parsing that never throws
 * Returns ISO string or undefined for invalid/empty input
 * 
 * Supported formats:
 * - ISO: 2024-01-15, 2024-01-15T10:30:00Z
 * - German: 15.01.2024, 15/01/2024
 * - US: 01/15/2024 (when day > 12)
 * - Single digits: 1.9.2024, 1/9/2024
 */
export function safeParseToISO(input: unknown): ISODateString | undefined {
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

  // ISO format (YYYY-MM-DD or full ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  // German format: dd.mm.yyyy or dd/mm/yyyy
  const germanMatch = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  // US format: mm/dd/yyyy (only when day > 12 to avoid ambiguity)
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, first, second, year] = usMatch;
    const firstNum = Number(first);
    const secondNum = Number(second);
    
    // If second number > 12, assume first is month, second is day (US format)
    if (secondNum > 12) {
      const d = new Date(Number(year), firstNum - 1, secondNum);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    
    // Otherwise assume German format (day.month.year)
    const d = new Date(Number(year), secondNum - 1, firstNum);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  // Fallback: try native Date parsing
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? undefined : fallback.toISOString();
}

/**
 * Strict date parsing that throws on invalid input
 * Use only when you need to handle errors explicitly
 */
export function parseToISO(input: unknown): ISODateString {
  const result = safeParseToISO(input);
  if (result === undefined) {
    throw new Error(`Invalid date input: ${input}`);
  }
  return result;
}

/**
 * Current timestamp as ISO string
 */
export function nowISO(): ISODateString {
  return new Date().toISOString();
}

/**
 * Today as YYYY-MM-DD
 */
export function todayISO(): ISODateString {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to DD.MM.YYYY format
 */
export function formatDDMMYYYY(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return undefined;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}