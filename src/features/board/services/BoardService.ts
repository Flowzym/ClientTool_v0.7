import { db } from '../../../data/db';
import type { Patch } from './PatchBuilder';

/**
 * Intern verwalten wir Undo/Redo als Paare von Patches:
 *  - forward: was zuletzt angewendet wurde
 *  - inverse: wie man den Zustand zurücksetzt
 * Das UI muss nur {id, changes} kennen – Originalwerte werden hier ermittelt.
 */
type StackEntry = { forward: Patch<any>[]; inverse: Patch<any>[] };

const _undo: StackEntry[] = [];
const _redo: StackEntry[] = [];

function pick<T extends object>(obj: T | undefined, keys: string[]): Partial<T> {
  const out: any = {};
  if (!obj) return out;
  for (const k of keys) out[k] = (obj as any)[k];
  return out;
}

async function computeInverse(forward: Patch<any>[]): Promise<Patch<any>[]> {
  const inverses: Patch<any>[] = [];
  for (const p of forward) {
    const before = await db.clients.get(p.id as any);
    const keys = Object.keys(p.changes || {});
    const prevValues = pick(before as any, keys);
    inverses.push({ id: p.id, changes: prevValues });
  }
  return inverses;
}

export async function bulkApply<T>(patches: Patch<T>[]): Promise<void> {
  for (const p of patches) {
    try {
      await db.clients.update(p.id as any, p.changes as any);
    } catch {
      const existing = await db.clients.get(p.id as any);
      await db.clients.put({ ...(existing as any), ...(p.changes as any), id: p.id } as any);
    }
  }
}

export async function updateById<T>(id: string, changes: Partial<T>): Promise<void> {
  await bulkApply([{ id, changes } as Patch<T>]);
}

/** Vor Anwendung der Patches aufrufen: erzeugt inverse Patches & pusht aufs Undo-Stack. */
export async function queueUndo(forward: Patch<any>[]): Promise<void> {
  const inverse = await computeInverse(forward);
  _undo.push({ forward, inverse });
  _redo.length = 0; // Redo-Stack leeren bei neuer Aktion
}

export async function undoLast(): Promise<boolean> {
  const entry = _undo.pop();
  if (!entry) return false;
  // inverse anwenden
  await bulkApply(entry.inverse);
  // Redo vorbereiten (umgekehrte Richtung)
  _redo.push({ forward: entry.inverse, inverse: entry.forward });
  return true;
}

export async function redoLast(): Promise<boolean> {
  const entry = _redo.pop();
  if (!entry) return false;
  await bulkApply(entry.inverse); // inverse hier = eigentliche Vorwärts-Änderung
  _undo.push({ forward: entry.inverse, inverse: entry.forward });
  return true;
}
