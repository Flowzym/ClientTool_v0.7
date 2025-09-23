import { db } from '../../../data/db';
import { mutationService } from '../../../services/MutationService';
import type { Patch } from '../../../types/patch';

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
/** Wendet Patches über zentralen MutationService an */
export async function bulkApply<T>(patches: Patch<T>[]): Promise<void> {
  await mutationService.applyPatches(patches);
}

export async function updateById<T>(id: string, changes: Partial<T>): Promise<void> {
  await mutationService.applyPatch({ id, changes });
}

export async function queueUndo(forward: Patch<any>[]): Promise<void> {
  const inverse = await computeInverse(forward);
  _undo.push({ forward, inverse });
  _redo.length = 0;
}

/** Undo/Redo über zentralen MutationService */
export async function undoLast(): Promise<boolean> {
  const result = await mutationService.performUndo();
  return result.success;
}

export async function redoLast(): Promise<boolean> {
  const result = await mutationService.performRedo();
  return result.success;
}

export function getUndoRedoStatus() {
  return mutationService.getStackStatus();
}