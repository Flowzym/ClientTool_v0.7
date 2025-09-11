import { useCallback } from "react";
import { bulkApply, updateById, queueUndo } from "../services/BoardService";
import type { Patch } from "../services/PatchBuilder";
import { build } from "../services/PatchBuilder";
import { isValidISO } from "../utils/date";

// Infer a minimal Client shape
type Client = {
  id: string;
  status?: string;
  followUp?: string | null;
  isPinned?: boolean;
  angebot?: "BAM" | "LL/B+" | "BwB" | "NB";
  priority?: number;
  archivedAt?: string | null;
  amsAdvisor?: string | null;
};

export function useBoardActions() {
  const update = useCallback(async (id: string, changes: Partial<Client>) => {
    const patch = build<Client>(id, changes);
    // optimistic enqueue for undo
    queueUndo([patch]);
    await updateById<Client>(id, changes);
  }, []);

  const bulkUpdate = useCallback(async (ids: string[], changes: Partial<Client>) => {
    const patches: Patch<Client>[] = ids.map(id => build<Client>(id, changes));
    queueUndo(patches);
    await bulkApply<Client>(patches);
  }, []);

  const togglePin = useCallback(async (ids: string[] | string) => {
    const list = Array.isArray(ids) ? ids : [ids];
    const patches = list.map(id => build<Client>(id, { isPinned: true }));
    queueUndo(patches);
    await bulkApply(patches);
  }, []);

  const cyclePriority = useCallback(async (id: string) => {
    // placeholder; caller should compute next priority value
    // update(id, { priority: nextPriority });
    void id;
  }, []);

  const setOffer = useCallback(async (id: string, offer?: Client["angebot"]) => {
    await update(id, { angebot: offer });
  }, [update]);

  const setFollowup = useCallback(async (id: string, iso?: string | null) => {
    const valid = iso && isValidISO(iso) ? iso : null;
    const changes: Partial<Client> = {
      followUp: valid,
      status: valid ? "terminVereinbart" : "inBearbeitung",
    };
    await update(id, changes);
  }, [update]);

  const archive = useCallback(async (id: string) => {
    const when = new Date().toISOString();
    await update(id, { archivedAt: when });
  }, [update]);

  const undo = useCallback(async () => {
    // integrated later with Board-level stacks
  }, []);

  const redo = useCallback(async () => {
    // integrated later with Board-level stacks
  }, []);

  const applyOptimistic = useCallback(async (_ids: string[], _changes: Partial<Client>) => {
    // Optional overlay integration point
  }, []);

  return { update, bulkUpdate, togglePin, cyclePriority, setOffer, setFollowup, archive, undo, redo, applyOptimistic };
}
