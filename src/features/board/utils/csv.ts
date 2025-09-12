function isLikelyISODate(v: any): boolean {
  if (typeof v !== 'string') return false;
  // rough: 2023-01-31 or 2023-01-31T..
  return /^\d{4}-\d{2}-\d{2}(?:[T\s]|$)/.test(v);
}

function formatDDMMYYYYFromISO(v: string): string {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function escapeCsv(v: any): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(';') || s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// EU CSV: Semikolon als Trenner, automatische Formatierung
export function toCsv(rows: any[], fields: string[]): string {
  const sep = ';';
  const header = fields.join(sep);
  const lines = rows.map(r => {
    const vals = fields.map(f => {
      const v = (r as any)[f];
      let out: any = v;
      if (Array.isArray(v)) out = v.join(', ');
      else if (typeof v === 'boolean') out = v ? 'Ja' : 'Nein';
      else if (isLikelyISODate(v)) out = formatDDMMYYYYFromISO(v);
      return escapeCsv(out);
    });
    return vals.join(sep);
  });
  return [header, ...lines].join('\n');
}
