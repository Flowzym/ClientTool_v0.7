// Utilities for deduplicating imported rows across Excel/PDF imports.
//
// This module intentionally exposes three named exports used elsewhere:
//   - buildRowKey(row [, keyFields]) -> string
//   - hashRow(row) -> string
//   - dedupeImport(rows) -> { dedupedRows, duplicates, keyByIndex }
//
import { safeParseToISO } from '../../utils/date/safeParseToISO';

export type RowGeneric = Record<string, unknown>;

/** Normalize a single cell value for key building */
function normalizeValue(value: unknown): string {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

/**
 * Build a stable key from a row.
 * Tries `keyFields` (defaults to name/email/phone), then common id fields, then falls back to a hash.
 */
export function buildRowKey(
  row: RowGeneric,
  keyFields: string[] = ["name", "email", "phone"]
): string {
  try {
    // First pass: requested key fields
    const parts = keyFields
      .map((f) => normalizeValue((row as any)[f]))
      .filter(Boolean);
    if (parts.length) return parts.join("|");

    // Second pass: common id-like fields
    const altFields = ["id", "_id", "uuid", "clientId"];
    for (const f of altFields) {
      const v = normalizeValue((row as any)[f]);
      if (v) return `${f}:${v}`;
    }

    // Fallback: hash of entire row (stable order)
    return safeParseToISO(input);
  } catch {
    // Defensive: never throw during key calc
    return `h:${hashRow(row)}`;
  }
}

/**
 * Stable, lightweight hash of a row object.
 * Uses sorted keys and FNV-1a 32-bit; returns an 8-hex string.
 */
export function hashRow(row: RowGeneric): string {
  // Collect keys in stable order and serialize without whitespace
  const keys = Object.keys(row).sort();
  const json = JSON.stringify(
    row,
    // replacer to enforce key ordering
    (key, value) => {
      if (key === "" && value && typeof value === "object" && !Array.isArray(value)) {
        const ordered: Record<string, unknown> = {};
        for (const k of keys) ordered[k] = (value as any)[k];
        return ordered;
      }
      return value;
    }
  );

  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    // >>> 0 ensures uint32; multiplication coerces to 32-bit
    hash = (hash >>> 0) * 0x01000193 >>> 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Dedupe an array of rows. Returns the unique rows, a list of duplicates,
 * and the key used for each original index.
 */
export function dedupeImport<T extends RowGeneric>(rows: T[]): {
  dedupedRows: T[];
  duplicates: T[];
  keyByIndex: string[];
} {
  const seen = new Set<string>();
  const deduped: T[] = [];
  const duplicates: T[] = [];
  const keyByIndex: string[] = [];

  for (const row of rows) {
    const key = buildRowKey(row);
    keyByIndex.push(key);
    if (seen.has(key)) {
      duplicates.push(row);
    } else {
      seen.add(key);
      deduped.push(row);
    }
  }

  return { dedupedRows: deduped, duplicates, keyByIndex };
}
