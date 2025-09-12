/**
 * Verschlüsselung mit WebCrypto API
 * Argon2id für Key-Derivation, AES-GCM für Daten-Verschlüsselung
 */

import { argon2id } from '@noble/hashes/argon2';
import { EnvelopeV1, EnvelopeError, base64urlEncode, base64urlDecode, validateEnvelope } from './envelope';
import { getEncryptionMode } from '../utils/env';
import { getOrCreateDevMasterKeyB64 } from '../utils/devKey';

// Argon2id Parameter
const ARGON2_CONFIG = {
  timeCost: 3,        // Iterationen
  memoryCost: 64 * 1024, // 64MB in KB
  parallelism: 1,     // Threads
  hashLength: 32,     // 256-bit Key
  saltLength: 16      // 128-bit Salt
} as const;

// AES-GCM Parameter  
const IV_LENGTH = 12; // 96-bit IV für AES-GCM

class CryptoManager {
  private cryptoKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;

  /**
   * Generiere oder lade persistenten Salt
   */
  private async getOrCreateSalt(): Promise<Uint8Array> {
    if (this.salt) return this.salt;

    // Salt aus IndexedDB laden (wird in db.ts implementiert)
    const storedSalt = await this.loadSaltFromStorage();
    if (storedSalt) {
      this.salt = storedSalt;
      return this.salt;
    }

    // Neuen Salt generieren
    this.salt = crypto.getRandomValues(new Uint8Array(ARGON2_CONFIG.saltLength));
    await this.saveSaltToStorage(this.salt);
    return this.salt;
  }

  /**
   * Envelope v1 verschlüsseln
   */
  public async encryptEnvelope(
    bytes: Uint8Array, 
    mode?: 'plain' | 'dev-enc' | 'prod-enc',
    meta?: EnvelopeV1['meta']
  ): Promise<EnvelopeV1> {
    const encMode = mode || getEncryptionMode();
    const envelope: EnvelopeV1 = {
      v: 1,
      mode: encMode,
      alg: 'AES-256-GCM',
      ts: Date.now(),
      meta
    };

    if (encMode === 'plain') {
      envelope.plain = base64urlEncode(bytes);
      return envelope;
    }

    // Verschlüsselung für dev-enc und prod-enc
    const key = await this.getActiveKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      bytes
    );

    envelope.iv = base64urlEncode(iv);
    envelope.ct = base64urlEncode(new Uint8Array(ciphertext));

    // KDF-Info nur bei prod-enc
    if (encMode === 'prod-enc' && this.salt) {
      envelope.kdf = {
        name: 'argon2id',
        t: ARGON2_CONFIG.timeCost,
        m: ARGON2_CONFIG.memoryCost,
        p: ARGON2_CONFIG.parallelism,
        salt: base64urlEncode(this.salt)
      };
    }

    return envelope;
  }

  /**
   * Envelope v1 entschlüsseln
   */
  public async decryptEnvelope(
    envelope: EnvelopeV1,
    getPassphrase?: () => Promise<string>
  ): Promise<Uint8Array> {
    if (!validateEnvelope(envelope)) {
      throw new EnvelopeError('Invalid envelope format', 'MALFORMED_ENVELOPE');
    }

    if (envelope.mode === 'plain') {
      if (!envelope.plain) {
        throw new EnvelopeError('Missing plain data in plain envelope', 'MALFORMED_ENVELOPE');
      }
      return base64urlDecode(envelope.plain);
    }

    // Verschlüsselte Modi
    if (!envelope.iv || !envelope.ct) {
      throw new EnvelopeError('Missing iv or ct in encrypted envelope', 'MALFORMED_ENVELOPE');
    }

    const iv = base64urlDecode(envelope.iv);
    const ciphertext = base64urlDecode(envelope.ct);

    let key: CryptoKey;

    if (envelope.mode === 'dev-enc') {
      key = await this.getDevKey();
    } else if (envelope.mode === 'prod-enc') {
      if (!envelope.kdf) {
        throw new EnvelopeError('Missing KDF info in prod-enc envelope', 'MISSING_KDF');
      }
      if (!getPassphrase) {
        throw new EnvelopeError('Passphrase callback required for prod-enc', 'MISSING_KDF');
      }
      
      const passphrase = await getPassphrase();
      const salt = base64urlDecode(envelope.kdf.salt);
      key = await this.deriveKeyFromPassphrase(passphrase, salt, envelope.kdf.t, envelope.kdf.m, envelope.kdf.p);
    } else {
      throw new EnvelopeError(`Unsupported mode: ${envelope.mode}`, 'INVALID_MODE');
    }

    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      
      return new Uint8Array(plaintext);
    } catch (error) {
      console.error('❌ Crypto: Decryption failed:', error);
      throw new EnvelopeError('Decryption failed - invalid passphrase or corrupted data', 'DECRYPT_AUTH_FAILED');
    }
  }

  /**
   * Key aus Passphrase ableiten mit Argon2id
   */
  public async deriveKeyFromPassphrase(
    passphrase: string, 
    salt: Uint8Array,
    timeCost: number = ARGON2_CONFIG.timeCost,
    memoryCost: number = ARGON2_CONFIG.memoryCost,
    parallelism: number = ARGON2_CONFIG.parallelism
  ): Promise<CryptoKey> {
    try {
      const passphraseBytes = new TextEncoder().encode(passphrase);
      
      // Argon2id Hash
      const hash = argon2id(passphraseBytes, salt, {
        t: timeCost,
        m: memoryCost,
        p: parallelism,
        dkLen: ARGON2_CONFIG.hashLength
      });

      // CryptoKey importieren
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );

      return cryptoKey;
    } catch (error) {
      console.error('❌ Crypto: Key derivation failed:', error);
      throw new EnvelopeError('Key derivation failed', 'DECRYPT_AUTH_FAILED');
    }
  }

  /**
   * Dev-Key laden
   */
  private async getDevKey(): Promise<CryptoKey> {
    try {
      const devKeyB64 = getOrCreateDevMasterKeyB64();
      const keyBytes = base64urlDecode(devKeyB64);
      
      if (keyBytes.length !== 32) {
        throw new EnvelopeError('DEV-Key must be exactly 32 bytes', 'MISSING_DEV_KEY');
      }
      
      return await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new EnvelopeError('DEV-Key not available or invalid', 'MISSING_DEV_KEY');
    }
  }

  /**
   * Key für aktuellen Modus laden
   */
  public async getActiveKey(): Promise<CryptoKey> {
    const mode = getEncryptionMode();
    
    if (mode === 'dev-enc') {
      return await this.getDevKey();
    } else if (mode === 'prod-enc') {
      if (this.cryptoKey) return this.cryptoKey;
      throw new EnvelopeError('No passphrase-derived key available for prod-enc', 'MISSING_KDF');
    } else {
      throw new EnvelopeError('getActiveKey not supported in plain mode', 'INVALID_MODE');
    }
  }

  /**
   * Key explizit setzen (nach Passphrase-Ableitung)
   */
  public setActiveKey(key: CryptoKey): void {
    this.cryptoKey = key;
  }

  /**
   * Salt für prod-enc verwalten
   */
  public async getOrCreateSalt(): Promise<Uint8Array> {
    if (this.salt) return this.salt;

    // Salt aus Storage laden
    const storedSalt = await this.loadSaltFromStorage();
    if (storedSalt) {
      this.salt = storedSalt;
      return this.salt;
    }

    // Neuen Salt generieren
    this.salt = crypto.getRandomValues(new Uint8Array(ARGON2_CONFIG.saltLength));
    await this.saveSaltToStorage(this.salt);
    return this.salt;
  }

  /**
   * Legacy-Methoden für Kompatibilität
   */
  public async deriveKey(passphrase: string): Promise<CryptoKey> {
    const salt = await this.getOrCreateSalt();
    const key = await this.deriveKeyFromPassphrase(passphrase, salt);
    this.cryptoKey = key;
    console.log('✅ Crypto: Key derived successfully');
    return key;
  }

  public async encrypt(data: string): Promise<{ nonce: Uint8Array; ciphertext: Uint8Array }> {
    try {
      const key = await this.getActiveKey();
      const plaintext = new TextEncoder().encode(data);
      const nonce = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce
        },
        key,
        plaintext
      );

      return {
        nonce,
        ciphertext: new Uint8Array(ciphertext)
      };

    } catch (error) {
      console.error('❌ Crypto: Encryption failed:', error);
      throw new EnvelopeError('Encryption failed', 'DECRYPT_AUTH_FAILED');
    }
  }

  public async decrypt(encryptedData: { nonce: Uint8Array; ciphertext: Uint8Array }): Promise<string> {
    try {
      const key = await this.getActiveKey();
      
      const plaintext = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: encryptedData.nonce
        },
        key,
        encryptedData.ciphertext
      );

      return new TextDecoder().decode(plaintext);

    } catch (error) {
      console.error('❌ Crypto: Decryption failed:', error);
      throw new EnvelopeError('Decryption failed', 'DECRYPT_AUTH_FAILED');
    }
  }

  /**
   * Dev-Fallback für getActiveKey
   */
  private async ensureDevKey(): Promise<CryptoKey> {
    const SLOT = '__DEV_KEY_BYTES__';
    let rawB64 = sessionStorage.getItem(SLOT) || (window as any)[SLOT];
    if (!rawB64) {
      const raw = new Uint8Array(32);
      crypto.getRandomValues(raw);
      rawB64 = base64urlEncode(raw);
      sessionStorage.setItem(SLOT, rawB64);
      (window as any)[SLOT] = rawB64;
    }
    const raw = base64urlDecode(rawB64);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt']);
  }

  /**
   * Prüfe ob Key verfügbar ist
   */
  public hasKey(): boolean {
    return this.cryptoKey !== null;
  }

  /**
   * Key aus Memory löschen
   */
  public clearKey(): void {
    this.cryptoKey = null;
    this.salt = null;
    console.log('🧹 Crypto: Key cleared from memory');
  }

  // Storage-Interface (implementiert von db.ts)
  private async loadSaltFromStorage(): Promise<Uint8Array | null> {
    return null;
  }

  private async saveSaltToStorage(salt: Uint8Array): Promise<void> {
    console.log('💾 Crypto: Salt should be saved to storage');
  }
}

// Singleton-Instanz
export const cryptoManager = new CryptoManager();