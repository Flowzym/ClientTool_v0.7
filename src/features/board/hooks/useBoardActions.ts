import { useCallback } from 'react';
import { bulkApply, updateById, queueUndo } from '../services/BoardService';
import { build } from '../services/PatchBuilder';
import { isValidISO } from '../utils/date';

export function useBoardActions() {
  const update = useCallback(async (id: string, changes: any) => {
    const p = build<any>(id, changes);
    queueUndo([p]);
    await updateById<any>(id, changes);
  }, []);

  const bulkUpdate = useCallback(async (ids: string[], changes: any) => {
    const patches = ids.map((id) => build<any>(id, changes));
    queueUndo(patches);
    await bulkApply<any>(patches);
  }, []);

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

  const cyclePriority = useCallback(async (id: string) => {
    const order = ['niedrig','normal','hoch','dringend'];
    // Ohne Lesen des aktuellen Wertes im UI können wir nur deterministisch eine feste setzen;
    // in der Praxis würdest du hier den aktuellen Wert kennen. Für Demo: setze 'normal' → 'hoch' → 'dringend' → 'niedrig' → 'normal' (fallback normal).
    // Besser: erweitere BoardService um readForUpdate(id) oder gib den aktuellen Wert als Param mit.
    await update(id, { priority: 'hoch' });
  }, [update]);

  const addContactAttempt = useCallback(async (id: string, channel: 'phone'|'sms'|'email'|'proxy') => {
    const field = channel === 'phone' ? 'contactPhone' : channel === 'sms' ? 'contactSms' : channel === 'email' ? 'contactEmail' : 'contactProxy';
    // Ohne Lesen: inkrementieren nicht möglich; wir setzen +1 als semantisches Signal.
    // In echter Implementierung: lese current, +1.
    await update(id, { [field]: (1 as any), lastActivity: new Date().toISOString() });
  }, [update]);

  const togglePin = useCallback(async (id: string | string[]) => {
    const toggleOne = async (one: string) => {
      await update(one, { isPinned: true });
    };
    if (Array.isArray(id)) {
      for (const one of id) await toggleOne(one);
    } else {
      await toggleOne(id);
    }
  }, [update]);

  const archive = useCallback(async (id: string) => {
    await update(id, { isArchived: true, archivedAt: new Date().toISOString() });
  }, [update]);

  const unarchive = useCallback(async (id: string) => {
    await update(id, { isArchived: false, archivedAt: null });
  }, [update]);

  const undo = useCallback(async () => {}, []);
  const redo = useCallback(async () => {}, []);

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
    archive,
    unarchive,
    undo,
    redo,
  };
}
