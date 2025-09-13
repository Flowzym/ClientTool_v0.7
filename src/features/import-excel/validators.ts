// src/features/import-excel/validators.ts
import { safeParseToISO } from "../../utils/dateSafe";

export type AnyRow = Record<string, unknown>;

/**
 * Normalize a single import row.
 * - Parses followUp to ISO if possible; leaves original if not.
 * - Never throws on empty/invalid dates.
 */
export function normalizeRow(row: AnyRow): AnyRow {
  const followUp = row?.followUp as unknown;
  const followUpISO = safeParseToISO(followUp);
  return {
    ...row,
    followUp: followUpISO ?? (typeof followUp === "string" ? followUp : "")
  };
}
