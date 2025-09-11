import { build, type Patch } from "./PatchBuilder";
// NOTE: import path may need adjustment depending on repo
import { db } from "../../../data/db";

// Minimal central write-path
export async function bulkApply<T>(patches: Patch<T>[]): Promise<void> {
  if (!patches?.length) return;
  // Expect db.bulkPatch to exist; fall back to individual updates if not
  const anyDb: any = db as any;
  if (typeof anyDb.bulkPatch === "function") {
    await anyDb.bulkPatch(patches);
    return;
  }
  const table = anyDb?.clients ?? anyDb?.table?.("clients");
  if (!table) throw new Error("BoardService: clients table not found");
  for (const p of patches) {
    await table.update(p.id, p.changes);
  }
}

export async function updateById<T>(id: string, changes: Partial<T>): Promise<void> {
  await bulkApply([build<T>(id, changes)]);
}

// Simple in-memory stacks (can be replaced with Zustand/store later)
const undoStack: Patch<any>[][] = [];
const redoStack: Patch<any>[][] = [];

export function queueUndo(patches: Patch<any>[]): void {
  if (!patches?.length) return;
  undoStack.push(patches);
  // clear redo on new action
  redoStack.length = 0;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("board:undo:push"));
}

export function queueRedo(patches: Patch<any>[]): void {
  if (!patches?.length) return;
  redoStack.push(patches);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("board:redo:push"));
}

export function popUndo(): Patch<any>[] | undefined {
  return undoStack.pop();
}
export function popRedo(): Patch<any>[] | undefined {
  return redoStack.pop();
}
