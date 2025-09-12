/**
 * Notes-Helfer (für NameCell-Badge)
 * Pfad: src/features/board/utils/notes.ts
 */
type NoteLike = { kind?: string; type?: string; text?: string } | string | null | undefined;

function isNoteEntry(e: any): boolean {
  if (!e) return false;
  if (typeof e === 'string') return e.trim().length > 0;
  const k = (e.kind || e.type || '').toString().toLowerCase();
  if (k === 'note' || k === 'notiz') return true;
  if (typeof e.text === 'string' && e.text.trim().length > 0) return true;
  return false;
}

/** Zählt Notizen gemäß Vorgabe:
 * 1) Wenn client.notes ein Array ist → dessen Länge
 * 2) Fallback: contactLog-Elemente mit kind/type === 'note' oder text vorhanden
 * 3) Fallback: wenn ein einzelnes note-Feld als Text existiert → 1
 */
export function countNotes(client: any): number {
  if (!client) return 0;

  const notes = (client as any).notes;
  if (Array.isArray(notes)) return notes.length;

  const log = (client as any).contactLog;
  if (Array.isArray(log)) {
    const n = log.filter(isNoteEntry).length;
    if (n > 0) return n;
  }

  const single = (client as any).note;
  if (typeof single === 'string' && single.trim().length > 0) return 1;

  return 0;
}

export function hasNotes(client: any): boolean {
  return countNotes(client) > 0;
}
