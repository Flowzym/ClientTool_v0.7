import { useCallback } from 'react';
import { bulkApply, updateById, queueUndo, undoLast, redoLast } from '../services/BoardService';
import { build } from '../services/PatchBuilder';
import { isValidISO } from '../utils/date';

function emit(name: string, detail: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function useBoardActions() {
  const applyOptimistic = useCallback((ids: string[], changes: any) => {
    const patches = ids.map((id) => build<any>(id, changes));
    emit('board:optimistic-apply', { patches });
    return patches;
  }, []);

  const commitOptimistic = useCallback((patches: any[]) => {
    emit('board:optimistic-commit', { patches });
  }, []);

  const update = useCallback(async (id: string, changes: any) => {
    const patches = applyOptimistic([id], changes);
    await queueUndo(patches);
    try {
      await updateById<any>(id, changes);
      commitOptimistic(patches);
    } catch (e) {
      emit('board:optimistic-clear', {});
      throw e;
    }
  }, [applyOptimistic, commitOptimistic]);

  const bulkUpdate = useCallback(async (ids: string[], changes: any) => {
    const patches = applyOptimistic(ids, changes);
    await queueUndo(patches);
    try {
      await bulkApply<any>(patches);
      commitOptimistic(patches);
    } catch (e) {
      emit('board:optimistic-clear', {});
      throw e;
    }
  }, [applyOptimistic, commitOptimistic]);

  const setOffer = useCallback(async (id: string, offer?: string) => {
    await update(id, { angebot: offer });
  }, [update]);

  const setFollowup = useCallback(async (id: string, date?: string) => {
    const changes: any = { followUp: date ?? null };
    if (date && isValidISO(date)) {
      changes.status = 'terminVereinbart';
    } else {
      changes.status = 'offen';
    }
    await update(id, changes);
  }, [update]);

  const setAssignedTo = useCallback(async (id: string, userId?: string) => {
    await update(id, { assignedTo: userId ?? null });
  }, [update]);

  const setStatus = useCallback(async (id: string, status?: string) => {
    await update(id, { status: status ?? null });
  }, [update]);

  const setResult = useCallback(async (id: string, result?: string) => {
    await update(id, { result: result ?? null });
  }, [update]);

  /** Priority cycle: null -> 'niedrig' -> 'mittel' -> 'hoch' -> null */
  const cyclePriority = useCallback(async (id: string, current?: string | null) => {
    const order = [null, 'niedrig', 'mittel', 'hoch'] as const;
    const idx = order.indexOf((current ?? null) as any);
    const next = order[(idx + 1) % order.length];
    await update(id, { priority: next });
  }, [update]);

  /**
   * Kontaktversuch inkrementieren.
   * Wenn currentCounts übergeben wird, wird (current+1) geschrieben und ist Undo-fähig.
   */
  const addContactAttempt = useCallback(async (
    id: string,
    channel: 'phone'|'sms'|'email'|'proxy',
    currentCounts?: { phone?: number; sms?: number; email?: number; proxy?: number }
  ) => {
    const field = channel === 'phone' ? 'contactPhone'
               : channel === 'sms' ? 'contactSms'
               : channel === 'email' ? 'contactEmail'
               : 'contactProxy';
    const prev = (currentCounts && (currentCounts as any)[channel]) ?? 0;
    const next = prev + 1;
    await update(id, { [field]: next, lastActivity: new Date().toISOString() });
  }, [update]);

  const togglePin = useCallback(async (id: string | string[]) => {
    const setTrue = async (one: string) => { await update(one, { isPinned: true }); };
    if (Array.isArray(id)) { for (const one of id) await setTrue(one); }
    else { await setTrue(id); }
  }, [update]);

  const bulkPin = useCallback(async (ids: string[]) => {
    await bulkUpdate(ids, { isPinned: true });
  }, [bulkUpdate]);

  const bulkUnpin = useCallback(async (ids: string[]) => {
    await bulkUpdate(ids, { isPinned: false });
  }, [bulkUpdate]);

  const archive = useCallback(async (id: string) => {
    await update(id, { isArchived: true, archivedAt: new Date().toISOString() });
  }, [update]);

  const unarchive = useCallback(async (id: string) => {
    await update(id, { isArchived: false, archivedAt: null });
  }, [update]);

  const undo = useCallback(async () => {
    await undoLast();
    emit('board:optimistic-clear', {});
  }, []);

  const redo = useCallback(async () => {
    await redoLast();
    emit('board:optimistic-clear', {});
  }, []);

  return {
    update,
    bulkUpdate,
    setOffer,
    setFollowup,
    setAssignedTo,
    setStatus,
    setResult,
    cyclePriority,
    addContactAttempt,
    togglePin,
    bulkPin,
    bulkUnpin,
    archive,
    unarchive,
    undo,
    redo,
  };
}
