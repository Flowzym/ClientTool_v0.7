import { useEffect, useMemo, useRef, useState } from 'react';
import type { Patch } from '../../../types/patch';
import { createCounter } from '../../../lib/perf/counter';

type Detail = { patches: Patch<any>[] };

function keyOf(v: any): string {
  return String(v);
}

// Dev-only performance counter
const overlayCounter = createCounter('optimisticOverlay');

// Overlay entry with TTL
interface OverlayEntry {
  data: any;
  createdAt: number;
  lastAccessedAt: number;
}

// Configuration
const OVERLAY_CONFIG = {
  TTL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_ENTRIES: 500,
  CLEANUP_INTERVAL_MS: 60 * 1000 // 1 minute
};

/**
 * Optimistic-Overlay mit
 * 1) ID-Normalisierung (String-Keys) und
 * 2) automatischer Reconciliation: Overlay-Einträge werden entfernt,
 *    sobald die Basisdaten die gleichen Werte tragen.
 * 3) TTL und Kapazitätsbegrenzung für Memory-Management
 */
export function useOptimisticOverlay<T extends { id: string | number }>(base: T[]) {
  const [version, setVersion] = useState(0);
  const overlayRef = useRef<Map<string, OverlayEntry>>(new Map());
  const cleanupTimerRef = useRef<number | null>(null);

  // Cleanup expired entries
  const cleanupExpired = () => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of overlayRef.current.entries()) {
      if (now - entry.lastAccessedAt > OVERLAY_CONFIG.TTL_MS) {
        overlayRef.current.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0 && import.meta.env.DEV) {
      console.debug(`[optimistic] cleaned ${cleaned} expired entries`);
      overlayCounter.inc(`cleaned:${cleaned}`);
    }
  };

  // Enforce capacity limit
  const enforceCapacity = () => {
    if (overlayRef.current.size <= OVERLAY_CONFIG.MAX_ENTRIES) return;
    
    // Remove oldest entries by lastAccessedAt
    const entries = Array.from(overlayRef.current.entries())
      .sort(([,a], [,b]) => a.lastAccessedAt - b.lastAccessedAt);
    
    const toRemove = entries.slice(0, overlayRef.current.size - OVERLAY_CONFIG.MAX_ENTRIES);
    toRemove.forEach(([key]) => overlayRef.current.delete(key));
    
    if (import.meta.env.DEV) {
      console.debug(`[optimistic] enforced capacity: removed ${toRemove.length} oldest entries`);
      overlayCounter.inc(`capacity:${toRemove.length}`);
    }
  };

  // Setup cleanup timer
  useEffect(() => {
    cleanupTimerRef.current = window.setInterval(cleanupExpired, OVERLAY_CONFIG.CLEANUP_INTERVAL_MS);
    
    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, []);

  // Events: apply merges, commit wird als "hint" ignoriert (Cleanup übernimmt Reconciliation), clear leert alles.
  useEffect(() => {
    const onApply = (e: Event) => {
      const evt = e as CustomEvent<Detail>;
      const now = Date.now();
      
      for (const p of evt.detail.patches) {
        const k = keyOf(p.id);
        const prevEntry = overlayRef.current.get(k);
        const prevData = prevEntry?.data ?? {};
        
        overlayRef.current.set(k, {
          data: { ...prevData, ...p.changes },
          createdAt: prevEntry?.createdAt ?? now,
          lastAccessedAt: now
        });
        
        overlayCounter.inc('apply');
      }
      
      // Enforce capacity after applying patches
      enforceCapacity();
      setVersion(v => v + 1);
    };
    
    const onCommit = (_e: Event) => {
      // kein sofortiges Löschen mehr; Cleanup passiert unterhalb via Reconciliation
      setVersion(v => v + 1);

      // Force Reconciliation Check nach kurzer Verzögerung
      // (gibt liveQuery Zeit die neuen DB-Daten zu holen)
      setTimeout(() => {
        setVersion(v => v + 1);
      }, 150);
    };
    
    const onClear = () => {
      overlayRef.current.clear();
      overlayCounter.inc('clear');
      setVersion(v => v + 1);
    };

    const onRollback = (e: Event) => {
      const evt = e as CustomEvent<Detail>;
      // Remove only the specified patches from overlay
      for (const p of evt.detail.patches) {
        const k = keyOf(p.id);
        overlayRef.current.delete(k);
        overlayCounter.inc('rollback');
      }
      setVersion(v => v + 1);
    };

    // Listener für mutation:committed Event aus MutationService
    const onMutationCommitted = () => {
      // Force Reconciliation nach DB-Mutation
      setVersion(v => v + 1);
    };

    window.addEventListener('board:optimistic-apply', onApply as EventListener);
    window.addEventListener('board:optimistic-commit', onCommit as EventListener);
    window.addEventListener('board:optimistic-clear', onClear as EventListener);
    window.addEventListener('board:optimistic-rollback', onRollback as EventListener);
    window.addEventListener('mutation:committed', onMutationCommitted);
    return () => {
      window.removeEventListener('board:optimistic-apply', onApply as EventListener);
      window.removeEventListener('board:optimistic-commit', onCommit as EventListener);
      window.removeEventListener('board:optimistic-clear', onClear as EventListener);
      window.removeEventListener('board:optimistic-rollback', onRollback as EventListener);
      window.removeEventListener('mutation:committed', onMutationCommitted);
    };
  }, []);

  // Reconciliation: wenn Base dieselben Werte hat, Overlay-Eintrag löschen
  useEffect(() => {
    if (overlayRef.current.size === 0) return;
    let changed = false;
    const now = Date.now();
    
    for (const [k, patch] of Array.from(overlayRef.current.entries())) {
      const row = base.find(r => keyOf((r as any).id) === k);
      if (!row) continue;
      
      // Update access time
      patch.lastAccessedAt = now;
      
      const allEqual = Object.keys(patch.data).every((f) => (row as any)[f] === (patch.data as any)[f]);
      if (allEqual) {
        overlayRef.current.delete(k);
        changed = true;
        overlayCounter.inc('reconciled');
      }
    }
    if (changed) setVersion(v => v + 1);
  }, [base]);

  const merged = useMemo(() => {
    if (overlayRef.current.size === 0) return base;
    
    return base.map((row) => {
      const k = keyOf((row as any).id);
      const entry = overlayRef.current.get(k);
      
      if (!entry) return row;
      
      // Update access time on read
      entry.lastAccessedAt = Date.now();
      
      return { ...row, ...entry.data };
    });
  }, [base, version]);

  // Dev-only: expose overlay stats
  if (import.meta.env.DEV) {
    (window as any).__optimisticOverlayStats = {
      size: overlayRef.current.size,
      maxSize: OVERLAY_CONFIG.MAX_ENTRIES,
      ttlMs: OVERLAY_CONFIG.TTL_MS,
      counter: overlayCounter.getLabeled(),
      entries: Array.from(overlayRef.current.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.createdAt,
        lastAccess: Date.now() - entry.lastAccessedAt,
        fields: Object.keys(entry.data)
      }))
    };
  }

  return merged;
}
