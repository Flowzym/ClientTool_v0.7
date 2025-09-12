import { db } from '../../../data/db';
import type { Patch } from './PatchBuilder';

/**
 * Robust BoardService:
 * - updateById/bulkApply machen ein **Upsert** mit Fallback-Lookup,
 *   falls der Primärschlüssel nicht trifft (z.B. String vs. number).
 * - Undo/Redo-Stacks bleiben wie zuvor.
 */

type StackEntry = { forward: Patch<any>[]; inverse: Patch<any>[] };
const _undo: StackEntry[] = [];
const _redo: StackEntry[] = [];

// ---- helpers ----
function pick<T extends object>(obj: T | undefined, keys: string[]): Partial<T> {
  const out: any = {};
  if (!obj) return out;
  for (const k of keys) out[k] = (obj as any)[k];
  return out;
}

async function getByAnyId(table: any, id: any): Promise<any | undefined> {
  // 1) direkter PK
  try {
    const direct = await table.get(id);
    if (direct) return direct;
  } catch {}

  // 2) Fallback-Suche auf gängige Felder
  const all = await table.toArray();
  const wanted = String(id);
  const found = all.find((r: any) =>
    String(r?.id) === wanted ||
    String(r?.clientId) === wanted ||
    String(r?.uuid) === wanted ||
    String(r?.amsId) === wanted
  );
  return found;
}

async function applyOne<T>(p: Patch<T>): Promise<void> {
  const table = (db as any).clients;
  if (!table) throw new Error('BoardService: db.clients missing');

  // try Dexie update first
  try {
    const updated = await table.update(p.id as any, p.changes as any);
    if (updated && updated > 0) return;
  } catch {}

  // Fallback: read-merge-put (upsert) mit tolerantem Lookup
  const before = await getByAnyId(table, p.id as any);
  const merged = { ...(before ?? { id: p.id }), ...(p.changes as any) };
  await table.put(merged as any);
}

async function computeInverse(forward: Patch<any>[]): Promise<Patch<any>[]> {
  const table = (db as any).clients;
  const inverses: Patch<any>[] = [];
  for (const p of forward) {
    const before = await getByAnyId(table, p.id as any);
    const keys = Object.keys(p.changes || {});
    const prevValues = pick(before as any, keys);
    inverses.push({ id: (before?.id ?? p.id) as any, changes: prevValues });
  }
  return inverses;
}

// ---- public API ----
export async function bulkApply<T>(patches: Patch<T>[]): Promise<void> {
  for (const p of patches) {
    await applyOne(p);
  }
}

export async function updateById<T>(id: string, changes: Partial<T>): Promise<void> {
  await applyOne({ id, changes } as Patch<T>);
}

export async function queueUndo(forward: Patch<any>[]): Promise<void> {
  const inverse = await computeInverse(forward);
  _undo.push({ forward, inverse });
  _redo.length = 0;
}

export async function undoLast(): Promise<boolean> {
  const entry = _undo.pop();
  if (!entry) return false;
  await bulkApply(entry.inverse);
  _redo.push({ forward: entry.inverse, inverse: entry.forward });
  return true;
}

export async function redoLast(): Promise<boolean> {
  const entry = _redo.pop();
  if (!entry) return false;
  await bulkApply(entry.inverse);
  _undo.push({ forward: entry.inverse, inverse: entry.forward });
  return true;
}
