/**
 * Hook to track component render counts (Dev-only)
 */

import { useRef } from 'react';

export function useRenderCount(label: string): number {
  const ref = useRef(0);
  ref.current++;
  
  if (import.meta.env.DEV && ref.current % 25 === 0) {
    console.debug(`[perf] renders:${label}`, ref.current);
  }
  
  return ref.current;
}