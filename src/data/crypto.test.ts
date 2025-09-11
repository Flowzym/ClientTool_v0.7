/**
 * Tests für Crypto-Module
 * Deterministische KDF mit festem Salt, AES-GCM Roundtrip, Fehlpfade
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { cryptoManager, type EncryptedData } from './crypto';
import { deriveKeyWithFixedSalt } from './crypto.testutils';

describe('Crypto Module', () => {
  const testPassphrase = 'test-passphrase-123';
  const fixedSalt = new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
  ]);

  beforeEach(() => {
    cryptoManager.clearKey();
  });

  describe('Key Derivation', () => {
    it('should derive deterministic key with fixed salt', async () => {
      const key1 = await deriveKeyWithFixedSalt(testPassphrase, fixedSalt);
      const key2 = await deriveKeyWithFixedSalt(testPassphrase, fixedSalt);
      
      expect(key1).toEqual(key2);
      expect(key1).toHaveLength(32); // 256-bit key
    });

    it('should derive different keys for different passphrases', async () => {
      const key1 = await deriveKeyWithFixedSalt('passphrase1', fixedSalt);
      const key2 = await deriveKeyWithFixedSalt('passphrase2', fixedSalt);
      
      expect(key1).not.toEqual(key2);
    });

    it('should derive different keys for different salts', async () => {
      const salt2 = new Uint8Array([
        16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
      ]);
      
      const key1 = await deriveKeyWithFixedSalt(testPassphrase, fixedSalt);
      const key2 = await deriveKeyWithFixedSalt(testPassphrase, salt2);
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('AES-GCM Encryption/Decryption', () => {
    beforeEach(async () => {
      // Mock salt loading für Tests
      (cryptoManager as any).loadSaltFromStorage = async () => fixedSalt;
      (cryptoManager as any).saveSaltToStorage = async () => {};
      
      await cryptoManager.deriveKey(testPassphrase);
    });

    it('should encrypt and decrypt data successfully', async () => {
      const plaintext = 'Hello, World! This is a test message.';
      
      const encrypted = await cryptoManager.encrypt(plaintext);
      const decrypted = await cryptoManager.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'Same message';
      
      const encrypted1 = await cryptoManager.encrypt(plaintext);
      const encrypted2 = await cryptoManager.encrypt(plaintext);
      
      // Nonces should be different
      expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
      // Ciphertext should be different due to different nonces
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      
      // But both should decrypt to same plaintext
      const decrypted1 = await cryptoManager.decrypt(encrypted1);
      const decrypted2 = await cryptoManager.decrypt(encrypted2);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should handle empty string', async () => {
      const plaintext = '';
      
      const encrypted = await cryptoManager.encrypt(plaintext);
      const decrypted = await cryptoManager.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Hällö Wörld! 🔐 Tëst with ümlauts and émojis 🚀';
      
      const encrypted = await cryptoManager.encrypt(plaintext);
      const decrypted = await cryptoManager.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', async () => {
      const plaintext = 'A'.repeat(10000); // 10KB string
      
      const encrypted = await cryptoManager.encrypt(plaintext);
      const decrypted = await cryptoManager.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when encrypting without key', async () => {
      cryptoManager.clearKey();
      
      await expect(cryptoManager.encrypt('test')).rejects.toThrow(
        'No crypto key available'
      );
    });

    it('should throw error when decrypting without key', async () => {
      cryptoManager.clearKey();
      
      const fakeEncrypted: EncryptedData = {
        nonce: new Uint8Array(12),
        ciphertext: new Uint8Array(16)
      };
      
      await expect(cryptoManager.decrypt(fakeEncrypted)).rejects.toThrow(
        'No crypto key available'
      );
    });

    it('should throw error when decrypting with wrong key', async () => {
      // Mock salt loading
      (cryptoManager as any).loadSaltFromStorage = async () => fixedSalt;
      (cryptoManager as any).saveSaltToStorage = async () => {};
      
      // Encrypt with first key
      await cryptoManager.deriveKey('correct-passphrase');
      const encrypted = await cryptoManager.encrypt('secret data');
      
      // Try to decrypt with different key
      await cryptoManager.deriveKey('wrong-passphrase');
      
      await expect(cryptoManager.decrypt(encrypted)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should throw error when decrypting corrupted data', async () => {
      (cryptoManager as any).loadSaltFromStorage = async () => fixedSalt;
      (cryptoManager as any).saveSaltToStorage = async () => {};
      
      await cryptoManager.deriveKey(testPassphrase);
      
      const corruptedData: EncryptedData = {
        nonce: new Uint8Array(12), // Valid nonce length
        ciphertext: new Uint8Array([1, 2, 3, 4, 5]) // Invalid ciphertext
      };
      
      await expect(cryptoManager.decrypt(corruptedData)).rejects.toThrow(
        'Decryption failed'
      );
    });
  });

  describe('Key Management', () => {
    it('should report key availability correctly', async () => {
      expect(cryptoManager.hasKey()).toBe(false);
      
      (cryptoManager as any).loadSaltFromStorage = async () => fixedSalt;
      (cryptoManager as any).saveSaltToStorage = async () => {};
      
      await cryptoManager.deriveKey(testPassphrase);
      expect(cryptoManager.hasKey()).toBe(true);
      
      cryptoManager.clearKey();
      expect(cryptoManager.hasKey()).toBe(false);
    });
  });
});