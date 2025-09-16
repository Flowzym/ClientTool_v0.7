/**
 * Erzeugt aus Validierungsfehlern eine CSV (als string).
 * rows: Array von { index: number; row: Record<string, any>; errors: string[] }
 */
export function buildErrorCSV(rows: Array<{index: number; row: any; errors: string[]}>): string {
  const headers = ['Zeile', 'Fehler', 'Rohdaten'];
  const escape = (val: any) => {
    const s = (val ?? '').toString();
    if (s.includes(';') || s.includes('\n') || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(';')];
  for (const r of rows) {
    const err = r.errors.join(' | ');
    const raw = JSON.stringify(r.row);
    lines.push([r.index + 1, err, raw].map(escape).join(';'));
  }
  return lines.join('\n');
}
