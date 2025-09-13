// src/utils/date.ts
// Compatibility shim that provides `nowISO`, a strict `parseToISO`, and re-exports a safe parser.
import { safeParseToISO as _safeParseToISO } from "./dateSafe";

export type ISODateString = string;

/** Returns current timestamp as ISO string. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Returns today's date in YYYY-MM-DD (local time). */
export function todayISO(): ISODateString {
  const d = new Date();
  // format as YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Legacy strict parser kept for compatibility.
 * Tries to parse and returns YYYY-MM-DD; throws if input cannot be parsed.
 */
export function parseToISO(input: unknown): ISODateString {
  if (!input || typeof input !== 'string' || !input.trim()) {
    throw new Error('parseToISO: empty');
  }
  const v = _safeParseToISO(input);
  if (!v) throw new Error('parseToISO: invalid');
  return v;
}

// Preferred non-throwing API
export const safeParseToISO = _safeParseToISO;
