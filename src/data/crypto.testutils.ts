/**
 * Test-Utilities für Crypto-Module
 * Nur für Tests/Experimente – NICHT im Produktiv-Build verwenden.
 */

import { argon2id } from '@noble/hashes/argon2';

// Argon2id Parameter (gleich wie in crypto.ts)
const ARGON2_CONFIG = {
  timeCost: 3,
  memoryCost: 64 * 1024,
  parallelism: 1,
  hashLength: 32
} as const;

/**
 * Test-Helper für deterministische KDF mit festem Salt
 * Nur für Unit-Tests verwenden!
 */
export async function deriveKeyWithFixedSalt(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  const passphraseBytes = new TextEncoder().encode(passphrase);
  
  return argon2id(passphraseBytes, salt, {
    t: ARGON2_CONFIG.timeCost,
    m: ARGON2_CONFIG.memoryCost,
    p: ARGON2_CONFIG.parallelism,
    dkLen: ARGON2_CONFIG.hashLength
  });
}