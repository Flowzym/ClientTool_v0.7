import { db } from '../../../data/db';
import type { Patch } from './PatchBuilder';

export async function bulkApply<T>(patches: Patch<T>[]): Promise<void> {
  for (const p of patches) {
    try {
      await db.clients.update(p.id as any, p.changes as any);
    } catch {
      // Fallback
      const existing = await db.clients.get(p.id as any);
      await db.clients.put({ ...(existing as any), ...(p.changes as any), id: p.id } as any);
    }
  }
}

export async function updateById<T>(id: string, changes: Partial<T>): Promise<void> {
  await bulkApply([{ id, changes } as Patch<T>]);
}

// Simple undo/redo stacks (optional usage)
const _undo: Patch<any>[][] = [];
const _redo: Patch<any>[][] = [];

export function queueUndo(patches: Patch<any>[]): void {
  _undo.push(patches);
  // clear redo on new action
  _redo.length = 0;
}

export function queueRedo(patches: Patch<any>[]): void {
  _redo.push(patches);
}

export function popUndo(): Patch<any>[] | undefined {
  return _undo.pop();
}
export function popRedo(): Patch<any>[] | undefined {
  return _redo.pop();
}
