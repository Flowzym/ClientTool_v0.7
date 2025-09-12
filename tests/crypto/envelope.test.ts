/**
 * Tests für Envelope v1 mit fixen Test-Vektoren
 * Deterministische Crypto-Tests ohne Flakiness
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cryptoManager } from '../../src/data/crypto';
import { EnvelopeV1, base64urlEncode, base64urlDecode, validateEnvelope, EnvelopeError } from '../../src/data/envelope';

describe('Envelope v1', () => {
  // Fixe Test-Vektoren
  const TEST_PASSPHRASE = 'Correct Horse Battery Staple';
  const TEST_SALT = base64urlDecode('AAECAwQFBgcICQoLDA0ODw'); // 16 bytes: 0x00..0x0F
  const TEST_IV = base64urlDecode('AgMEBQYHCAkKCwwN'); // 12 bytes: 0x02..0x0D
  const TEST_PLAINTEXT = 'Hallo ClientTool';
  const TEST_DEV_KEY = base64urlEncode(new Uint8Array(32).fill(42)); // 32 bytes of 0x2A

  beforeEach(() => {
    cryptoManager.clearKey();
    vi.clearAllMocks();
  });

  describe('Base64url utilities', () => {
    it('should encode and decode correctly', () => {
      const original = new Uint8Array([0, 1, 2, 255, 254, 253]);
      const encoded = base64urlEncode(original);
      const decoded = base64urlDecode(encoded);
      
      expect(decoded).toEqual(original);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should handle empty arrays', () => {
      const empty = new Uint8Array(0);
      const encoded = base64urlEncode(empty);
      const decoded = base64urlDecode(encoded);
      
      expect(decoded).toEqual(empty);
    });
  });

  describe('Envelope validation', () => {
    it('should validate correct plain envelope', () => {
      const envelope: EnvelopeV1 = {
        v: 1,
        mode: 'plain',
        alg: 'AES-256-GCM',
        ts: Date.now(),
        plain: base64urlEncode(new TextEncoder().encode(TEST_PLAINTEXT))
      };

      expect(validateEnvelope(envelope)).toBe(true);
    });

    it('should validate correct encrypted envelope', () => {
      const envelope: EnvelopeV1 = {
        v: 1,
        mode: 'dev-enc',
        alg: 'AES-256-GCM',
        ts: Date.now(),
        iv: base64urlEncode(TEST_IV),
        ct: base64urlEncode(new Uint8Array(16)) // Mock ciphertext
      };

      expect(validateEnvelope(envelope)).toBe(true);
    });

    it('should reject invalid envelopes', () => {
      expect(validateEnvelope(null)).toBe(false);
      expect(validateEnvelope({})).toBe(false);
      expect(validateEnvelope({ v: 2 })).toBe(false);
      expect(validateEnvelope({ v: 1, mode: 'invalid' })).toBe(false);
      expect(validateEnvelope({ v: 1, mode: 'plain' })).toBe(false); // missing plain
    });
  });

  describe('Plain mode', () => {
    it('should create and decrypt plain envelope', async () => {
      const bytes = new TextEncoder().encode(TEST_PLAINTEXT);
      
      const envelope = await cryptoManager.encryptEnvelope(bytes, 'plain');
      expect(envelope.mode).toBe('plain');
      expect(envelope.v).toBe(1);
      expect(envelope.plain).toBeDefined();
      expect(envelope.iv).toBeUndefined();
      expect(envelope.ct).toBeUndefined();

      const decrypted = await cryptoManager.decryptEnvelope(envelope);
      const text = new TextDecoder().decode(decrypted);
      expect(text).toBe(TEST_PLAINTEXT);
    });
  });

  describe('Dev-enc mode', () => {
    beforeEach(() => {
      // Mock dev key in sessionStorage
      sessionStorage.setItem('__DEV_KEY_BYTES__', TEST_DEV_KEY);
    });

    it('should create and decrypt dev-enc envelope', async () => {
      const bytes = new TextEncoder().encode(TEST_PLAINTEXT);
      
      const envelope = await cryptoManager.encryptEnvelope(bytes, 'dev-enc');
      expect(envelope.mode).toBe('dev-enc');
      expect(envelope.v).toBe(1);
      expect(envelope.iv).toBeDefined();
      expect(envelope.ct).toBeDefined();
      expect(envelope.plain).toBeUndefined();
      expect(envelope.kdf).toBeUndefined(); // No KDF in dev-enc

      const decrypted = await cryptoManager.decryptEnvelope(envelope);
      const text = new TextDecoder().decode(decrypted);
      expect(text).toBe(TEST_PLAINTEXT);
    });

    it('should fail without dev key', async () => {
      sessionStorage.removeItem('__DEV_KEY_BYTES__');
      const bytes = new TextEncoder().encode(TEST_PLAINTEXT);
      
      await expect(cryptoManager.encryptEnvelope(bytes, 'dev-enc')).rejects.toThrow(EnvelopeError);
    });
  });

  describe('Prod-enc mode', () => {
    beforeEach(() => {
      // Mock salt loading
      (cryptoManager as any).loadSaltFromStorage = vi.fn().mockResolvedValue(TEST_SALT);
      (cryptoManager as any).saveSaltToStorage = vi.fn().mockResolvedValue(undefined);
    });

    it('should create and decrypt prod-enc envelope with correct passphrase', async () => {
      const bytes = new TextEncoder().encode(TEST_PLAINTEXT);
      
      // Derive key first
      await cryptoManager.deriveKey(TEST_PASSPHRASE);
      
      const envelope = await cryptoManager.encryptEnvelope(bytes, 'prod-enc');
      expect(envelope.mode).toBe('prod-enc');
      expect(envelope.v).toBe(1);
      expect(envelope.iv).toBeDefined();
      expect(envelope.ct).toBeDefined();
      expect(envelope.kdf).toBeDefined();
      expect(envelope.kdf?.name).toBe('argon2id');
      expect(envelope.plain).toBeUndefined();

      // Clear key to test passphrase callback
      cryptoManager.clearKey();
      
      const decrypted = await cryptoManager.decryptEnvelope(envelope, async () => TEST_PASSPHRASE);
      const text = new TextDecoder().decode(decrypted);
      expect(text).toBe(TEST_PLAINTEXT);
    });

    it('should fail with wrong passphrase', async () => {
      const bytes = new TextEncoder().encode(TEST_PLAINTEXT);
      
      // Encrypt with correct passphrase
      await cryptoManager.deriveKey(TEST_PASSPHRASE);
      const envelope = await cryptoManager.encryptEnvelope(bytes, 'prod-enc');
      
      // Try to decrypt with wrong passphrase
      cryptoManager.clearKey();
      
      await expect(
        cryptoManager.decryptEnvelope(envelope, async () => 'Wrong Passphrase')
      ).rejects.toThrow(EnvelopeError);
    });

    it('should fail without passphrase callback', async () => {
      const envelope: EnvelopeV1 = {
        v: 1,
        mode: 'prod-enc',
        alg: 'AES-256-GCM',
        ts: Date.now(),
        iv: base64urlEncode(TEST_IV),
        ct: base64urlEncode(new Uint8Array(16)),
        kdf: {
          name: 'argon2id',
          t: 3,
          m: 65536,
          p: 1,
          salt: base64urlEncode(TEST_SALT)
        }
      };

      await expect(
        cryptoManager.decryptEnvelope(envelope) // No passphrase callback
      ).rejects.toThrow(EnvelopeError);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed envelopes', async () => {
      const malformed = { v: 1, mode: 'plain' } as EnvelopeV1; // Missing required fields
      
      await expect(
        cryptoManager.decryptEnvelope(malformed)
      ).rejects.toThrow(EnvelopeError);
    });

    it('should handle mode mismatch', async () => {
      const mismatch: EnvelopeV1 = {
        v: 1,
        mode: 'plain',
        alg: 'AES-256-GCM',
        ts: Date.now(),
        iv: base64urlEncode(TEST_IV), // Should not have iv in plain mode
        ct: base64urlEncode(new Uint8Array(16))
      };

      await expect(
        cryptoManager.decryptEnvelope(mismatch)
      ).rejects.toThrow(EnvelopeError);
    });

    it('should handle corrupted ciphertext', async () => {
      sessionStorage.setItem('__DEV_KEY_BYTES__', TEST_DEV_KEY);
      
      const corrupted: EnvelopeV1 = {
        v: 1,
        mode: 'dev-enc',
        alg: 'AES-256-GCM',
        ts: Date.now(),
        iv: base64urlEncode(TEST_IV),
        ct: base64urlEncode(new Uint8Array([1, 2, 3, 4, 5])) // Invalid ciphertext
      };

      await expect(
        cryptoManager.decryptEnvelope(corrupted)
      ).rejects.toThrow(EnvelopeError);
    });
  });

  describe('Roundtrip tests', () => {
    it('should maintain data integrity in plain roundtrip', async () => {
      const testData = { name: 'Max Mustermann', status: 'offen', priority: 'hoch' };
      const bytes = new TextEncoder().encode(JSON.stringify(testData));
      
      const envelope = await cryptoManager.encryptEnvelope(bytes, 'plain');
      const decrypted = await cryptoManager.decryptEnvelope(envelope);
      const result = JSON.parse(new TextDecoder().decode(decrypted));
      
      expect(result).toEqual(testData);
    });

    it('should maintain data integrity in dev-enc roundtrip', async () => {
      sessionStorage.setItem('__DEV_KEY_BYTES__', TEST_DEV_KEY);
      
      const testData = { name: 'Anna Schmidt', status: 'inBearbeitung', contactCount: 3 };
      const bytes = new TextEncoder().encode(JSON.stringify(testData));
      
      const envelope = await cryptoManager.encryptEnvelope(bytes, 'dev-enc');
      const decrypted = await cryptoManager.decryptEnvelope(envelope);
      const result = JSON.parse(new TextDecoder().decode(decrypted));
      
      expect(result).toEqual(testData);
    });

    it('should maintain data integrity in prod-enc roundtrip', async () => {
      (cryptoManager as any).loadSaltFromStorage = vi.fn().mockResolvedValue(TEST_SALT);
      (cryptoManager as any).saveSaltToStorage = vi.fn().mockResolvedValue(undefined);
      
      const testData = { name: 'Thomas Weber', encrypted: true, timestamp: Date.now() };
      const bytes = new TextEncoder().encode(JSON.stringify(testData));
      
      // Derive key
      await cryptoManager.deriveKey(TEST_PASSPHRASE);
      
      const envelope = await cryptoManager.encryptEnvelope(bytes, 'prod-enc');
      
      // Clear key to test passphrase callback
      cryptoManager.clearKey();
      
      const decrypted = await cryptoManager.decryptEnvelope(envelope, async () => TEST_PASSPHRASE);
      const result = JSON.parse(new TextDecoder().decode(decrypted));
      
      expect(result).toEqual(testData);
    });
  });
});