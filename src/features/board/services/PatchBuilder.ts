import type { Patch } from '../../../types/patch';

export function build<T>(id: string, delta: Partial<T>): Patch<T> {
  return { id, changes: delta };
}

export function merge<T>(...patches: Patch<T>[]): Patch<T> {
  if (patches.length === 0) throw new Error('merge requires at least one patch');
  const id = patches[0].id;
  const merged: Partial<T> = {};
  for (const p of patches) {
    if (p.id !== id) throw new Error('merge requires patches with same id');
    Object.assign(merged, p.changes);
  }
  return { id, changes: merged };
}
