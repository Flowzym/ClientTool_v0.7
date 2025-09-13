/**
 * Import de-duplication utilities.
 * - dedupeImport: returns deduped rows + list of duplicates by a computed key
 */

type Row = Record<string, unknown>;

type Duplicate = {
  key: string;
  rows: Row[];
};

export function makeKey(row: Row): string {
  const name = String(row.name ?? '').trim().toLowerCase();
  const email = String((row as any).email ?? '').trim().toLowerCase();
  const phone = String((row as any).phone ?? '').replace(/\D/g, '');
  return [name, email, phone].filter(Boolean).join('|');
}

export function dedupeImport<T extends Row>(rows: T[]): { dedupedRows: T[]; duplicates: Duplicate[] } {
  const seen = new Map<string, T[]>();

  for (const row of rows) {
    const key = makeKey(row);
    const bucket = seen.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      seen.set(key, [row]);
    }
  }

  const dedupedRows: T[] = [];
  const duplicates: Duplicate[] = [];

  for (const [key, bucket] of seen) {
    if (bucket.length === 1) {
      dedupedRows.push(bucket[0]);
    } else {
      dedupedRows.push(bucket[0]);
      duplicates.push({ key, rows: bucket.slice(1) });
    }
  }

  return { dedupedRows, duplicates };
}
