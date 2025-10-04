/**
 * Performance timing utilities (Dev-only)
 * Uses Web Performance API for precise measurements
 */

const isDev = import.meta.env.DEV;

export function perfMark(name: string): void {
  if (!isDev) return;
  try {
    performance.mark(name);
  } catch (error) {
    console.warn('perfMark failed:', error);
  }
}

export function perfMeasure(name: string, start: string, end: string): { name: string; duration: number } | null {
  if (!isDev) return null;

  try {
    const startMarks = performance.getEntriesByName(start, 'mark');
    const endMarks = performance.getEntriesByName(end, 'mark');

    if (startMarks.length === 0 || endMarks.length === 0) {
      return { name, duration: 0 };
    }

    performance.measure(name, start, end);
    const measure = performance.getEntriesByName(name, 'measure')[0];
    return {
      name,
      duration: measure?.duration || 0
    };
  } catch (error) {
    return { name, duration: 0 };
  }
}

export async function withMeasure<T>(name: string, fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
  if (!isDev) {
    const result = await fn();
    return { result, duration: 0 };
  }

  const startMark = `${name}:start`;
  const endMark = `${name}:end`;
  
  perfMark(startMark);
  const result = await fn();
  perfMark(endMark);
  
  const measurement = perfMeasure(name, startMark, endMark);
  
  return {
    result,
    duration: measurement?.duration || 0
  };
}

export function collectMeasures(filter?: RegExp): PerformanceEntry[] {
  if (!isDev) return [];
  
  try {
    const measures = performance.getEntriesByType('measure');
    return filter ? measures.filter(m => filter.test(m.name)) : measures;
  } catch (error) {
    console.warn('collectMeasures failed:', error);
    return [];
  }
}

export function clearPerf(): void {
  if (!isDev) return;
  
  try {
    performance.clearMarks();
    performance.clearMeasures();
  } catch (error) {
    console.warn('clearPerf failed:', error);
  }
}