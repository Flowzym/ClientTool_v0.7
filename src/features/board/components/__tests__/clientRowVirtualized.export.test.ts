import { describe, it, expect } from 'vitest';

describe('ClientRowVirtualized module shape', () => {
  it('exposes a component via default or named export', async () => {
    const mod = await import('../ClientRow');
    const candidate = (mod as any).default ?? (mod as any).ClientRow;
    expect(typeof candidate).toBe('function');
    expect(candidate.name).toMatch(/ClientRow/i);
  });

  it('should have stable export shape for lazy loading', async () => {
    const mod = await import('../ClientRow');
    
    // Should have default export (required for React.lazy)
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
    
    // Default should be the ClientRow component
    expect(mod.default.name).toMatch(/ClientRow/i);
  });

  it('should be compatible with React.lazy mapping', async () => {
    // Test the exact mapping used in VirtualizedBoardList
    const lazyMapping = await import('../ClientRow').then((m) => ({
      default: m.default ?? m.ClientRow,
    }));
    
    expect(lazyMapping.default).toBeDefined();
    expect(typeof lazyMapping.default).toBe('function');
  });
});