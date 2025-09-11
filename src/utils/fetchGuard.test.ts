import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('NetworkGuard', () => {
  let mod: any;

  beforeEach(async () => {
    vi.resetModules();
    // Stub original fetch before guard installs
    (globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    mod = await import('./fetchGuard'); // auto-installs
  });

  afterEach(() => {
    if (mod && mod.networkGuard) {
      mod.networkGuard.uninstall();
      mod.networkGuard.clearLog();
    }
    vi.resetModules();
  });

  it('allows same-origin fetch', async () => {
    await expect(fetch('/api/ping')).resolves.toEqual({ ok: true, status: 200 });
    await expect(fetch((globalThis as any).location?.origin + '/api/ping')).resolves.toEqual({ ok: true, status: 200 });
  });

  it('allows blob: and data: URLs', async () => {
    await expect(fetch('blob://something')).resolves.toEqual({ ok: true, status: 200 });
    await expect(fetch('data:text/plain;base64,SGVsbG8=')).resolves.toEqual({ ok: true, status: 200 });
  });

  it('blocks external http(s) origins via fetch', async () => {
    await expect(fetch('https://example.com/api')).rejects.toThrow(/External request blocked/);
  });

  it('blocks external http(s) origins via XHR', async () => {
    const xhr = new XMLHttpRequest();
    expect(() => xhr.open('GET', 'https://example.com/api')).toThrow(/External request blocked/);
  });
});
