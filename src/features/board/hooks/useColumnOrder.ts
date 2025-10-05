import { useCallback, useMemo, useState } from 'react';
import type { ColumnKey } from '../columns/types';

const STORAGE_KEY = (scopeId: string) => `board:columnOrder:v1:${scopeId}`;

export function useColumnOrder(allColumnKeys: ColumnKey[], scopeId: string) {
  const [order, setOrderState] = useState<ColumnKey[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(scopeId));
      if (!raw) return allColumnKeys;

      const saved = JSON.parse(raw) as string[];
      const validKeys = new Set(allColumnKeys);
      const ordered = saved.filter(k => validKeys.has(k as ColumnKey)) as ColumnKey[];

      const missing = allColumnKeys.filter(k => !ordered.includes(k));
      return [...ordered, ...missing];
    } catch {
      return allColumnKeys;
    }
  });

  const save = useCallback((newOrder: ColumnKey[]) => {
    try {
      localStorage.setItem(STORAGE_KEY(scopeId), JSON.stringify(newOrder));
    } catch {
      // Ignore storage errors
    }
  }, [scopeId]);

  const setOrder = useCallback((newOrder: ColumnKey[]) => {
    setOrderState(newOrder);
    save(newOrder);
  }, [save]);

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...order];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setOrder(newOrder);
  }, [order, setOrder]);

  const moveUp = useCallback((key: ColumnKey) => {
    const index = order.indexOf(key);
    if (index > 0) {
      moveColumn(index, index - 1);
    }
  }, [order, moveColumn]);

  const moveDown = useCallback((key: ColumnKey) => {
    const index = order.indexOf(key);
    if (index < order.length - 1) {
      moveColumn(index, index + 1);
    }
  }, [order, moveColumn]);

  const reset = useCallback(() => {
    setOrder(allColumnKeys);
  }, [allColumnKeys, setOrder]);

  const reorderColumns = useCallback(<T extends { key: ColumnKey }>(columns: T[]): T[] => {
    const orderMap = new Map(order.map((key, idx) => [key, idx]));
    return [...columns].sort((a, b) => {
      const aIndex = orderMap.get(a.key) ?? 999;
      const bIndex = orderMap.get(b.key) ?? 999;
      return aIndex - bIndex;
    });
  }, [order]);

  return {
    order,
    setOrder,
    moveColumn,
    moveUp,
    moveDown,
    reset,
    reorderColumns
  };
}
