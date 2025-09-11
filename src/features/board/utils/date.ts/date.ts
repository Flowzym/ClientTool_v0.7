// Lightweight date helpers for Board
export function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

export function formatDDMMYYYY(dateLike?: string | number | Date | null): string {
  if (!dateLike) return "";
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function toEpoch(dateLike?: string | number | Date | null): number | null {
  if (!dateLike) return null;
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

export function isValidISO(iso?: string | null): boolean {
  if (!iso) return false;
  // Accept both date and datetime ISO variants
  const dt = new Date(iso);
  return !isNaN(dt.getTime());
}
