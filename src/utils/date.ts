export type ISODateString = `${number}-${number}-${number}`;

/**
 * Parses many date formats to YYYY-MM-DD. Never throws.
 * Returns undefined if input is empty or invalid.
 */
export function safeParseToISO(input: unknown): ISODateString | undefined {
  if (input == null) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;

  // already ISO-like (YYYY-MM-DD...)
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const dt = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (!Number.isNaN(dt.valueOf())) return `${y}-${m}-${d}` as ISODateString;
  }

  // dd.mm.yyyy / dd-mm-yyyy / dd/mm/yyyy
  const eu = raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (eu) {
    let [, d, m, y] = eu;
    if (d.length === 1) d = `0${d}`;
    if (m.length === 1) m = `0${m}`;
    const dt = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (!Number.isNaN(dt.valueOf())) return `${y}-${m}-${d}` as ISODateString;
  }

  // 8-digit compact: yyyymmdd or ddmmyyyy
  const compact = raw.match(/^(\d{8})$/);
  if (compact) {
    const s = compact[1];
    const isoMaybe = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    const dt1 = new Date(`${isoMaybe}T00:00:00Z`);
    if (!Number.isNaN(dt1.valueOf())) return isoMaybe as ISODateString;

    const euMaybe = `${s.slice(4,8)}-${s.slice(2,4)}-${s.slice(0,2)}`;
    const dt2 = new Date(`${euMaybe}T00:00:00Z`);
    if (!Number.isNaN(dt2.valueOf())) return euMaybe as ISODateString;
  }

  // Fallback (e.g., US format)
  const dt = new Date(raw);
  if (!Number.isNaN(dt.valueOf())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}` as ISODateString;
  }

  return undefined;
}
