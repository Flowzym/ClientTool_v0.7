import { useEffect, useMemo, useRef, useState } from 'react';

type Patch<T> = { id: string | number; changes: Partial<T> };

type Detail = { patches: Patch<any>[] };

function keyOf(v: any): string {
  return String(v);
}

/**
 * Optimistic-Overlay mit
 * 1) ID-Normalisierung (String-Keys) und
 * 2) automatischer Reconciliation: Overlay-Einträge werden entfernt,
 *    sobald die Basisdaten die gleichen Werte tragen.
 */
export function useOptimisticOverlay<T extends { id: string | number }>(base: T[]) {
  const [version, setVersion] = useState(0);
  const overlayRef = useRef<Map<string, any>>(new Map());

  // Events: apply merges, commit wird als "hint" ignoriert (Cleanup übernimmt Reconciliation), clear leert alles.
  useEffect(() => {
    const onApply = (e: Event) => {
      const evt = e as CustomEvent<Detail>;
      for (const p of evt.detail.patches) {
        const k = keyOf(p.id);
        const prev = overlayRef.current.get(k) ?? {};
        overlayRef.current.set(k, { ...prev, ...p.changes });
      }
      setVersion(v => v + 1);
    };
    const onCommit = (_e: Event) => {
      // kein sofortiges Löschen mehr; Cleanup passiert unterhalb via Reconciliation
      setVersion(v => v + 1);
    };
    const onClear = () => {
      overlayRef.current.clear();
      setVersion(v => v + 1);
    };

    window.addEventListener('board:optimistic-apply', onApply as EventListener);
    window.addEventListener('board:optimistic-commit', onCommit as EventListener);
    window.addEventListener('board:optimistic-clear', onClear as EventListener);
    return () => {
      window.removeEventListener('board:optimistic-apply', onApply as EventListener);
      window.removeEventListener('board:optimistic-commit', onCommit as EventListener);
      window.removeEventListener('board:optimistic-clear', onClear as EventListener);
    };
  }, []);

  // Reconciliation: wenn Base dieselben Werte hat, Overlay-Eintrag löschen
  useEffect(() => {
    if (overlayRef.current.size === 0) return;
    let changed = false;
    for (const [k, patch] of Array.from(overlayRef.current.entries())) {
      const row = base.find(r => keyOf((r as any).id) === k);
      if (!row) continue;
      const allEqual = Object.keys(patch).every((f) => (row as any)[f] === (patch as any)[f]);
      if (allEqual) {
        overlayRef.current.delete(k);
        changed = true;
      }
    }
    if (changed) setVersion(v => v + 1);
  }, [base]);

  const merged = useMemo(() => {
    if (overlayRef.current.size === 0) return base;
    return base.map((row) => {
      const k = keyOf((row as any).id);
      const o = overlayRef.current.get(k);
      return o ? ({ ...row, ...o }) : row;
    });
  }, [base, version]);

  return merged;
}
