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
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
