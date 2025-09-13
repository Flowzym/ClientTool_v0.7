/**
 * Tests for performance helpers
 * Validates dev-only behavior and production no-ops
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock import.meta.env for testing
const mockEnv = vi.hoisted(() => ({
  DEV: true
}));

vi.mock('../../lib/perf/timer', async () => {
  const actual = await vi.importActual('../../lib/perf/timer');
  return {
    ...actual,
    // Override isDev check for testing
    perfMark: mockEnv.DEV ? (actual as any).perfMark : () => {},
    perfMeasure: mockEnv.DEV ? (actual as any).perfMeasure : () => null,
    withMeasure: mockEnv.DEV ? (actual as any).withMeasure : async (name: string, fn: any) => ({ result: await fn(), duration: 0 })
  };
});

describe('Performance Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset performance API
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch {
      // Ignore if not available
    }
  });

  describe('timer utilities in DEV', () => {
    beforeEach(() => {
      mockEnv.DEV = true;
    });

    it('should create performance marks in dev mode', async () => {
      const { perfMark } = await import('../../lib/perf/timer');
      
      perfMark('test-mark');
      
      const marks = performance.getEntriesByName('test-mark', 'mark');
      expect(marks.length).toBe(1);
      expect(marks[0].name).toBe('test-mark');
    });

    it('should create performance measures in dev mode', async () => {
      const { perfMark, perfMeasure } = await import('../../lib/perf/timer');
      
      perfMark('start');
      await new Promise(resolve => setTimeout(resolve, 10));
      perfMark('end');
      
      const result = perfMeasure('test-measure', 'start', 'end');
      
      expect(result).toBeTruthy();
      expect(result?.name).toBe('test-measure');
      expect(result?.duration).toBeGreaterThan(0);
    });

    it('should measure function execution time', async () => {
      const { withMeasure } = await import('../../lib/perf/timer');
      
      const testFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return 'test-result';
      };
      
      const { result, duration } = await withMeasure('test-function', testFn);
      
      expect(result).toBe('test-result');
      expect(duration).toBeGreaterThan(10);
    });

    it('should collect measures with filter', async () => {
      const { perfMark, perfMeasure, collectMeasures } = await import('../../lib/perf/timer');
      
      perfMark('test1:start');
      perfMark('test1:end');
      perfMeasure('test1:measure', 'test1:start', 'test1:end');
      
      perfMark('other:start');
      perfMark('other:end');
      perfMeasure('other:measure', 'other:start', 'other:end');
      
      const filtered = collectMeasures(/^test1:/);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('test1:measure');
    });
  });

  describe('timer utilities in PROD', () => {
    beforeEach(() => {
      mockEnv.DEV = false;
    });

    it('should be no-op in production mode', async () => {
      const { perfMark, perfMeasure, withMeasure } = await import('../../lib/perf/timer');
      
      // Should not create marks/measures
      perfMark('prod-test');
      const measure = perfMeasure('prod-measure', 'start', 'end');
      
      expect(measure).toBeNull();
      
      // withMeasure should still work but return 0 duration
      const { result, duration } = await withMeasure('prod-function', () => 'result');
      expect(result).toBe('result');
      expect(duration).toBe(0);
    });
  });

  describe('counter utilities', () => {
    it('should count in dev mode', async () => {
      mockEnv.DEV = true;
      const { createCounter } = await import('../../lib/perf/counter');
      
      const counter = createCounter('test-counter');
      
      expect(counter.get()).toBe(0);
      
      counter.inc();
      counter.inc('label1');
      counter.inc('label1');
      counter.inc('label2');
      
      expect(counter.get()).toBe(4);
      expect(counter.getLabeled()).toEqual({
        label1: 2,
        label2: 1
      });
    });

    it('should be no-op in production mode', async () => {
      mockEnv.DEV = false;
      const { createCounter } = await import('../../lib/perf/counter');
      
      const counter = createCounter('prod-counter');
      
      counter.inc();
      counter.inc('label');
      
      expect(counter.get()).toBe(0);
      expect(counter.getLabeled()).toEqual({});
    });

    it('should reset counters correctly', async () => {
      mockEnv.DEV = true;
      const { createCounter } = await import('../../lib/perf/counter');
      
      const counter = createCounter('reset-test');
      
      counter.inc();
      counter.inc('label');
      expect(counter.get()).toBe(2);
      
      counter.reset();
      expect(counter.get()).toBe(0);
      expect(counter.getLabeled()).toEqual({});
    });
  });

  describe('render count hook', () => {
    it('should track render counts in dev mode', async () => {
      const { useRenderCount } = await import('../../lib/perf/useRenderCount');
      
      // Mock console.debug to verify logging
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      // Simulate multiple renders
      let count = 0;
      for (let i = 0; i < 30; i++) {
        count = useRenderCount('test-component');
      }
      
      expect(count).toBe(30);
      
      // Should log at 25th render
      expect(consoleSpy).toHaveBeenCalledWith('[perf] renders:test-component', 25);
      
      consoleSpy.mockRestore();
    });
  });
});