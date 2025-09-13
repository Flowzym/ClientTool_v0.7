/**
 * Roundtrip-Tests für verschiedene Encryption-Modi
 * Testet vollständigen Datenfluss: Domain → Envelope → Storage → Envelope → Domain
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { codecFactory, resetCodec } from '../../src/data/codec';
import { base64urlEncode } from '../../src/data/envelope';
import type { Client } from '../../src/domain/models';

// Mock env für verschiedene Modi
const mockEnv = vi.hoisted(() => ({
  getEncryptionMode: vi.fn()
}));

vi.mock('../../src/utils/env', () => mockEnv);

describe('Codec Roundtrip Tests', () => {
  const testClient: Partial<Client> = {
    id: 'test-client-1',
    amsId: 'A12345',
    firstName: 'Max',
    lastName: 'Mustermann',
    status: 'offen',
    priority: 'normal',
    contactCount: 0,
    contactLog: [],
    isArchived: false
  };

  beforeEach(() => {
    resetCodec();
    vi.clearAllMocks();
  });

  describe('Plain mode roundtrip', () => {
    beforeEach(() => {
      mockEnv.getEncryptionMode.mockReturnValue('plain');
    });

    it('should maintain data integrity in plain mode', async () => {
      const codec = codecFactory();
      
      const envelope = await codec.encode(testClient);
      expect(envelope.mode).toBe('plain');
      expect(envelope.v).toBe(1);
      expect(envelope.plain).toBeDefined();
      
      const decoded = await codec.decode(envelope);
      expect(decoded).toEqual(testClient);
    });

    it('should handle complex objects', async () => {
      const complexData = {
        ...testClient,
        contactLog: [
          { date: '2024-01-15', channel: 'telefon', note: 'Erstkontakt' },
          { date: '2024-01-20', channel: 'email' }
        ],
        metadata: {
          nested: { deep: { value: 'test' } },
          array: [1, 2, 3],
          unicode: 'Hällö Wörld! 🚀'
        }
      };

      const codec = codecFactory();
      const envelope = await codec.encode(complexData);
      const decoded = await codec.decode(envelope);
      
      expect(decoded).toEqual(complexData);
    });
  });

  describe('Dev-enc mode roundtrip', () => {
    beforeEach(() => {
      mockEnv.getEncryptionMode.mockReturnValue('dev-enc');
      // Mock dev key
      sessionStorage.setItem('__DEV_KEY_BYTES__', base64urlEncode(new Uint8Array(32).fill(42)));
    });

    it('should maintain data integrity in dev-enc mode', async () => {
      const codec = codecFactory();
      
      const envelope = await codec.encode(testClient);
      expect(envelope.mode).toBe('dev-enc');
      expect(envelope.v).toBe(1);
      expect(envelope.iv).toBeDefined();
      expect(envelope.ct).toBeDefined();
      expect(envelope.plain).toBeUndefined();
      expect(envelope.kdf).toBeUndefined(); // No KDF in dev-enc
      
      const decoded = await codec.decode(envelope);
      expect(decoded).toEqual(testClient);
    });

    it('should produce different ciphertext for same data', async () => {
      const codec = codecFactory();
      
      const envelope1 = await codec.encode(testClient);
      const envelope2 = await codec.encode(testClient);
      
      // Different IVs should produce different ciphertext
      expect(envelope1.iv).not.toEqual(envelope2.iv);
      expect(envelope1.ct).not.toEqual(envelope2.ct);
      
      // But both should decrypt to same data
      const decoded1 = await codec.decode(envelope1);
      const decoded2 = await codec.decode(envelope2);
      
      expect(decoded1).toEqual(testClient);
      expect(decoded2).toEqual(testClient);
    });
  });

  describe('Prod-enc mode roundtrip', () => {
    const TEST_SALT = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    
    beforeEach(() => {
      mockEnv.getEncryptionMode.mockReturnValue('prod-enc');
      // Mock salt storage
      (cryptoManager as any).loadSaltFromStorage = vi.fn().mockResolvedValue(TEST_SALT);
      (cryptoManager as any).saveSaltToStorage = vi.fn().mockResolvedValue(undefined);
    });

    it('should maintain data integrity in prod-enc mode', async () => {
      const codec = codecFactory();
      
      // Derive key first
      await (cryptoManager as any).deriveKey('test-passphrase');
      
      const envelope = await codec.encode(testClient);
      expect(envelope.mode).toBe('prod-enc');
      expect(envelope.v).toBe(1);
      expect(envelope.iv).toBeDefined();
      expect(envelope.ct).toBeDefined();
      expect(envelope.kdf).toBeDefined();
      expect(envelope.kdf?.name).toBe('argon2id');
      expect(envelope.plain).toBeUndefined();
      
      // Clear key to test passphrase callback
      (cryptoManager as any).clearKey();
      
      const decoded = await codec.decode(envelope);
      expect(decoded).toEqual(testClient);
    });

    it('should include correct KDF parameters', async () => {
      const codec = codecFactory();
      
      await (cryptoManager as any).deriveKey('test-passphrase');
      const envelope = await codec.encode(testClient);
      
      expect(envelope.kdf).toEqual({
        name: 'argon2id',
        t: 3,
        m: 65536,
        p: 1,
        salt: base64urlEncode(TEST_SALT)
      });
    });
  });

  describe('Cross-mode compatibility', () => {
    it('should not decrypt envelope with wrong mode', async () => {
      // Create plain envelope
      mockEnv.getEncryptionMode.mockReturnValue('plain');
      const codec = codecFactory();
      const envelope = await codec.encode(testClient);
      
      // Try to decrypt as dev-enc
      const devEnvelope = { ...envelope, mode: 'dev-enc' as const };
      
      await expect(codec.decode(devEnvelope)).rejects.toThrow(EnvelopeError);
    });
  });

  describe('Metadata handling', () => {
    beforeEach(() => {
      mockEnv.getEncryptionMode.mockReturnValue('plain');
    });

    it('should preserve metadata in envelope', async () => {
      const codec = codecFactory();
      const meta = {
        schema: 'client-v2',
        table: 'clients',
        id: 'test-123'
      };
      
      const envelope = await codec.encode(testClient, meta);
      expect(envelope.meta).toEqual(meta);
      
      const decoded = await codec.decode(envelope);
      expect(decoded).toEqual(testClient);
    });
  });
});