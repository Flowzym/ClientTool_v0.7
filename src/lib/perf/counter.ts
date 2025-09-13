/**
 * Performance counters (Dev-only)
 * Lightweight counting for render tracking
 */

const isDev = import.meta.env.DEV;

interface Counter {
  inc(label?: string): void;
  get(): number;
  getLabeled(): Record<string, number>;
  reset(): void;
}

class DevCounter implements Counter {
  private count = 0;
  private labeled = new Map<string, number>();

  inc(label?: string): void {
    this.count++;
    if (label) {
      this.labeled.set(label, (this.labeled.get(label) || 0) + 1);
    }
  }

  get(): number {
    return this.count;
  }

  getLabeled(): Record<string, number> {
    return Object.fromEntries(this.labeled);
  }

  reset(): void {
    this.count = 0;
    this.labeled.clear();
  }
}

class NoOpCounter implements Counter {
  inc(): void {}
  get(): number { return 0; }
  getLabeled(): Record<string, number> { return {}; }
  reset(): void {}
}

export function createCounter(name: string): Counter {
  if (!isDev) return new NoOpCounter();
  
  const counter = new DevCounter();
  
  // Store globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).__perfCounters = (window as any).__perfCounters || {};
    (window as any).__perfCounters[name] = counter;
  }
  
  return counter;
}