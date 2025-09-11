/**
 * Verschlüsselung mit WebCrypto API
 * Argon2id für Key-Derivation, AES-GCM für Daten-Verschlüsselung
 */

import { argon2id } from '@noble/hashes/argon2';

// Argon2id Parameter
const ARGON2_CONFIG = {
  timeCost: 3,        // Iterationen
  memoryCost: 64 * 1024, // 64MB in KB
  parallelism: 1,     // Threads
  hashLength: 32,     // 256-bit Key
  saltLength: 16      // 128-bit Salt
} as const;

// AES-GCM Parameter
const AES_CONFIG = {
  algorithm: 'AES-GCM' as const,
  keyLength: 256,
  nonceLength: 12     // 96-bit Nonce
} as const;

export interface EncryptedData {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export interface CryptoError extends Error {
  code: 'INVALID_PASSPHRASE' | 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'KEY_DERIVATION_FAILED';
}

// Base64 utilities (ohne externe Abhängigkeiten)
const b64enc = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
const b64dec = (s: string) => new Uint8Array([...atob(s)].map(c => c.charCodeAt(0)));

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
   * Key aus Passphrase ableiten mit Argon2id
   */
  public async deriveKey(passphrase: string): Promise<CryptoKey> {
    try {
      const salt = await this.getOrCreateSalt();
      const passphraseBytes = new TextEncoder().encode(passphrase);

      console.log('🔐 Crypto: Deriving key with Argon2id...');
      
      // Argon2id Hash
      const hash = argon2id(passphraseBytes, salt, {
        t: ARGON2_CONFIG.timeCost,
        m: ARGON2_CONFIG.memoryCost,
        p: ARGON2_CONFIG.parallelism,
        dkLen: ARGON2_CONFIG.hashLength
      });

      // CryptoKey für AES-GCM importieren
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        hash,
        { name: AES_CONFIG.algorithm },
        false, // nicht exportierbar
        ['encrypt', 'decrypt']
      );

      this.cryptoKey = cryptoKey;
      console.log('✅ Crypto: Key derived successfully');
      return cryptoKey;

    } catch (error) {
      console.error('❌ Crypto: Key derivation failed:', error);
      const cryptoError = new Error('Key derivation failed') as CryptoError;
      cryptoError.code = 'KEY_DERIVATION_FAILED';
      throw cryptoError;
    }
  }

  /**
   * Dev-Fallback: garantiert einen Key auch ohne Login
   */
  private async ensureDevKey(): Promise<CryptoKey> {
    const SLOT = '__DEV_KEY_BYTES__';
    let rawB64 = sessionStorage.getItem(SLOT) || (window as any)[SLOT];
    if (!rawB64) {
      const raw = new Uint8Array(32);
      crypto.getRandomValues(raw);
      rawB64 = b64enc(raw);
      sessionStorage.setItem(SLOT, rawB64);
      (window as any)[SLOT] = rawB64;
    }
    const raw = b64dec(rawB64);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt','decrypt']);
  }

  /**
   * Liefert immer einen verwendbaren Key (Passphrase oder Dev)
   */
  public async getActiveKey(): Promise<CryptoKey> {
    if (this.cryptoKey) return this.cryptoKey;
    
    // Dev-Key-Fallback für Entwicklung
    this.cryptoKey = await this.ensureDevKey();
    if (import.meta.env.DEV) {
      console.log('🔧 Crypto: Dev key active (prototype mode)');
    }
    return this.cryptoKey;
  }

  /**
   * Key explizit setzen (z.B. nach Passphrase-Login)
   */
  public setActiveKey(key: CryptoKey): void {
    this.cryptoKey = key;
  }

  /**
   * Daten verschlüsseln mit AES-GCM
   */
  public async encrypt(data: string): Promise<EncryptedData> {
    try {
      const key = await this.getActiveKey(); // Holt sich automatisch einen Key
      const plaintext = new TextEncoder().encode(data);
      const nonce = crypto.getRandomValues(new Uint8Array(AES_CONFIG.nonceLength));

      const ciphertext = await crypto.subtle.encrypt(
        {
          name: AES_CONFIG.algorithm,
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
      const cryptoError = new Error('Encryption failed') as CryptoError;
      cryptoError.code = 'ENCRYPTION_FAILED';
      throw cryptoError;
    }
  }

  /**
   * Daten entschlüsseln mit AES-GCM
   */
  public async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      const key = await this.getActiveKey(); // Holt sich automatisch einen Key
      
      const plaintext = await crypto.subtle.decrypt(
        {
          name: AES_CONFIG.algorithm,
          iv: encryptedData.nonce
        },
        key,
        encryptedData.ciphertext
      );

      return new TextDecoder().decode(plaintext);

    } catch (error) {
      console.error('❌ Crypto: Decryption failed:', error);
      const cryptoError = new Error('Decryption failed - invalid passphrase or corrupted data') as CryptoError;
      cryptoError.code = 'DECRYPTION_FAILED';
      throw cryptoError;
    }
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
    console.log('🧹 Crypto: Key cleared from memory');
  }

  // Storage-Interface (wird von db.ts implementiert)
  private async loadSaltFromStorage(): Promise<Uint8Array | null> {
    // Wird in db.ts über KV-Store implementiert
    return null;
  }

  private async saveSaltToStorage(salt: Uint8Array): Promise<void> {
    // Wird in db.ts über KV-Store implementiert
    console.log('💾 Crypto: Salt should be saved to storage');
  }
}

// Singleton-Instanz
export const cryptoManager = new CryptoManager();