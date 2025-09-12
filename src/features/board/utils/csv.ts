export function escapeCsv(v: any): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(';') || s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Simple CSV (semicolon separated to match many EU locales)
export function toCsv(rows: any[], fields: string[]): string {
  const sep = ';';
  const header = fields.join(sep);
  const lines = rows.map(r => fields.map(f => escapeCsv((r as any)[f])).join(sep));
  return [header, ...lines].join('\n');
}
