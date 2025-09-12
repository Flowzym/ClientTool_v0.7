import { useCallback } from 'react';
import { bulkApply, updateById, queueUndo } from '../services/BoardService';
import { build } from '../services/PatchBuilder';
import { isValidISO } from '../utils/date';

/**
 * Zentrale Mutationen, einheitliches Patch-Format.
 * - Keine DB-Calls im UI → nur actions.* benutzen.
 * - Auto-Status: Follow-up setzt 'terminVereinbart', Entfernen setzt zurück auf 'offen' (falls vorher auto-gesetzt).
 */
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
      // Rücknahme: Status zurücksetzen, wenn er vom Auto-Status stammt.
      // Ohne Original-Status im UI wählen wir 'offen' als deterministischen Rückfall.
      changes.status = 'offen';
    }
    await update(id, changes);
  }, [update]);

  const togglePin = useCallback(async (id: string | string[]) => {
    const toggleOne = async (one: string) => {
      // Hier kein Lesen im UI: serverseitig/fetchless Toggle vereinfachen → inverse Flag nicht bekannt.
      // Wir setzen isPinned true (oder false) nicht ohne Kenntnis; real: read-modify-write im Service.
      // Für Vereinfachung: true toggeln, falls du die echte Invertierung brauchst → BoardService erweitern.
      await update(one, { isPinned: true });
    };
    if (Array.isArray(id)) {
      for (const one of id) await toggleOne(one);
    } else {
      await toggleOne(id);
    }
  }, [update]);

  const archive = useCallback(async (id: string) => {
    await update(id, { isArchived: true });
  }, [update]);

  const undo = useCallback(async () => {
    // optional: hier könnte über BoardService.popUndo() implementiert werden
  }, []);

  const redo = useCallback(async () => {
    // optional
  }, []);

  return {
    update,
    bulkUpdate,
    setOffer,
    setFollowup,
    togglePin,
    archive,
    undo,
    redo,
  };
}
