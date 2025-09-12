import { useEffect, useMemo, useRef, useState } from 'react';

type Patch<T> = { id: string; changes: Partial<T> };

type Detail = { patches: Patch<any>[] };

export function useOptimisticOverlay<T extends { id: string }>(base: T[]) {
  const [version, setVersion] = useState(0);
  const overlayRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const onApply = (e: Event) => {
      const evt = e as CustomEvent<Detail>;
      for (const p of evt.detail.patches) {
        const prev = overlayRef.current.get(p.id) ?? {};
        overlayRef.current.set(p.id, { ...prev, ...p.changes });
      }
      setVersion(v => v + 1);
    };
    const onCommit = (e: Event) => {
      const evt = e as CustomEvent<Detail>;
      for (const p of evt.detail.patches) {
        overlayRef.current.delete(p.id);
      }
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

  const merged = useMemo(() => {
    if (overlayRef.current.size === 0) return base;
    return base.map((row) => {
      const o = overlayRef.current.get(row.id);
      return o ? ({ ...row, ...o }) : row;
    });
  }, [base, version]);

  return merged;
}
