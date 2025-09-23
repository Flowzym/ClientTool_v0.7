import { mutationService } from '../../../services/MutationService';
import type { Patch } from '../../../types/patch';

/** Wendet Patches über zentralen MutationService an */
export async function bulkApply<T>(patches: Patch<T>[]): Promise<void> {
  await mutationService.applyPatches(patches);
}

export async function updateById<T>(id: any, changes: Partial<T>): Promise<void> {
  await mutationService.applyPatch({ id, changes });
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

export function canUndo(): boolean {
  return mutationService.canUndo();
}

export function canRedo(): boolean {
  return mutationService.canRedo();
}