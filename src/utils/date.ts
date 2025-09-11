/**
 * Datum-Utilities für Import
 */
export const nowISO = () => new Date().toISOString();

/**
 * Wandelt verschiedenste Eingaben in ISO (YYYY-MM-DD) um.
 * Unterstützt:
 *  - "dd.mm.yyyy" / "dd.mm.yy"
 *  - "dd/mm/yyyy"
 *  - ISO "yyyy-mm-dd" (durchgereicht)
 *  - Excel-Seriennummern (als number oder string)
 */
export function parseToISO(input?: string | number | null): string | undefined {
  if (input === null || input === undefined) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;

  // ISO passt? -> zurück
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // dd.mm.yyyy oder dd.mm.yy
  let m = raw.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (m) {
    const dd = m[1], mm = m[2];
    let yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // dd/mm/yyyy
  m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dd = m[1], mm = m[2], yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // Excel-Seriennummer?
  if (/^\d{1,5}$/.test(raw)) {
    const n = Number(raw);
    const iso = excelSerialToISO(n);
    if (iso) return iso;
  }

  // Fallback: versuche Date.parse (wenn Datum mit Zeit kommt)
  const dt = new Date(raw);
  if (!isNaN(dt.getTime())) {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return undefined;
}

/**
 * Excel-Seriennummer (Basis 1899-12-30) -> ISO (YYYY-MM-DD)
 * Behandelt grob die 1900-Leap-Year-Anomalie, was für Praxisdaten ausreichend ist.
 */
export function excelSerialToISO(serial: number): string | undefined {
  if (!isFinite(serial)) return undefined;
  const utcDays = Math.floor(serial - 25569);
  const ms = utcDays * 86400 * 1000;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return undefined;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}


export function formatDDMMYYYY(d: Date | string | number | null | undefined): string {
  if (!d) return '';
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = String(dt.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}
