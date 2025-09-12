/**
 * Board-spezifische Datums-Utils (für Cells)
 * Pfad: src/features/board/utils/date.ts
 */
export function isValidISO(v?: string | null): boolean {
  if (!v) return false;
  const t = Date.parse(v as string);
  return Number.isFinite(t);
}

export function toEpoch(v: string): number {
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

export function formatDDMMYYYY(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return undefined;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  /**
 * App-weite Datums-Utils (von Import/Sync verwendet)
 */
export function nowISO(): string {
  return new Date().toISOString();
}

export function parseToISO(input: string): string {
  if (!input) throw new Error('parseToISO: empty');
  const s = String(input).trim();

  // dd.mm.yyyy
  let m = /^\s*(\d{2})\.(\d{2})\.(\d{4})\s*$/.exec(s);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isFinite(d.getTime())) throw new Error('parseToISO: invalid dd.mm.yyyy');
    return d.toISOString();
  }

  // yyyy-mm-dd
  m = /^\s*(\d{4})-(\d{2})-(\d{2})(?:\s|T|$)/.exec(s);
  if (m) {
    const [_, yyyy, mm, dd] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isFinite(d.getTime())) throw new Error('parseToISO: invalid yyyy-mm-dd');
    return d.toISOString();
  }

  const t = Date.parse(s);
  if (Number.isFinite(t)) return new Date(t).toISOString();

  throw new Error('parseToISO: unsupported format');
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
const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
