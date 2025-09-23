import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef, ColumnKey } from '../columns/types';

const STORAGE_KEY = (scopeId: string) => `board:columns:v1:${scopeId}`;

export function useColumnVisibility(allCols: ColumnDef[], scopeId: string) {
  const defaults = useMemo(
    () => new Set(allCols.filter(c => c.visibleDefault).map(c => c.key)),
    [allCols]
  );

  const [visible, setVisibleState] = useState<Set<ColumnKey>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(scopeId));
      if (!raw) return new Set(defaults);
      const arr = JSON.parse(raw) as string[];
      const validKeys = arr.filter(k => allCols.some(c => c.key === k));
      return new Set(validKeys as ColumnKey[]);
    } catch {
      return new Set(defaults);
    }
  });

  const save = useCallback((set: Set<ColumnKey>) => {
    try {
      localStorage.setItem(STORAGE_KEY(scopeId), JSON.stringify([...set]));
    } catch {
      // Ignore storage errors (private mode, quota exceeded)
    }
  }, [scopeId]);

  const setVisible = useCallback((next: Set<ColumnKey>) => {
    // Safety: mindestens eine Kernspalte sichtbar lassen
    const coreColumns = allCols.filter(c => c.category === 'core').map(c => c.key);
    const hasCore = coreColumns.some(key => next.has(key));
    
    if (!hasCore && coreColumns.length > 0) {
      // Füge 'name' als Fallback hinzu
      next.add('name' as ColumnKey);
    }
    
    setVisibleState(next);
    save(next);
  }, [allCols, save]);

  const toggle = useCallback((key: ColumnKey) => {
    const next = new Set(visible);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setVisible(next);
  }, [visible, setVisible]);

  const reset = useCallback(() => {
    const defaultSet = new Set(defaults);
    setVisible(defaultSet);
  }, [defaults, setVisible]);

  const isVisible = useCallback((key: ColumnKey) => {
    return visible.has(key);
  }, [visible]);

  const getVisibleColumns = useCallback(() => {
    return allCols.filter(col => visible.has(col.key));
  }, [allCols, visible]);

  return { 
    visible, 
    setVisible, 
    toggle, 
    reset, 
    defaults, 
    isVisible, 
    getVisibleColumns 
  };
}