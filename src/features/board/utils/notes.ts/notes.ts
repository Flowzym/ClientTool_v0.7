// Unified notes counting across multiple sources
export type Note = { id?: string; text?: string; createdAt?: string };
export type ContactEntry = { kind?: string; type?: string; text?: string };

export type ClientLike = {
  notes?: Note[];
  contactLog?: ContactEntry[];
  note?: string | null;
};

export function countNotes(c: ClientLike): number {
  if (Array.isArray(c.notes) && c.notes.length) return c.notes.length;
  const log = Array.isArray(c.contactLog) ? c.contactLog : [];
  const fromLog = log.filter(e => e && (e.kind === "note" || e.type === "note")).length;
  if (fromLog) return fromLog;
  if (typeof c.note === "string" && c.note.trim()) return 1;
  return 0;
}

export const hasNotes = (c: ClientLike): boolean => countNotes(c) > 0;
