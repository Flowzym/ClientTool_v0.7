/**
 * Envelope v1 Format für einheitliche Verschlüsselung
 * Unterstützt plain, dev-enc und prod-enc Modi
 */

export interface EnvelopeV1 {
  v: 1;                                // Version
  mode: 'plain' | 'dev-enc' | 'prod-enc';
  alg: 'AES-256-GCM';
  kdf?: { 
    name: 'argon2id'; 
    t: number; 
    m: number; 
    p: number; 
    salt: string;  // Base64url
  };                                   // nur prod-enc
  iv?: string;                         // 12 Byte Base64url
  ct?: string;                         // Ciphertext inkl. GCM-Tag Base64url
  aad?: string;                        // optional
  ts: number;                          // Unix ms
  meta?: { 
    schema?: string; 
    table?: string; 
    id?: string; 
  };                                   // optional
  plain?: string;                      // NUR in mode='plain': Base64url der Klarbytes
}

// Base64url utilities (RFC 4648 Section 5)
export function base64urlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function base64urlDecode(str: string): Uint8Array {
  // Padding hinzufügen falls nötig
  const padded = str + '==='.slice((str.length + 3) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Envelope-Validierung
export function validateEnvelope(env: any): env is EnvelopeV1 {
  if (!env || typeof env !== 'object') return false;
  if (env.v !== 1) return false;
  if (!['plain', 'dev-enc', 'prod-enc'].includes(env.mode)) return false;
  if (env.alg !== 'AES-256-GCM') return false;
  if (typeof env.ts !== 'number') return false;
  
  // Mode-spezifische Validierung
  if (env.mode === 'plain') {
    return typeof env.plain === 'string';
  } else {
    return typeof env.iv === 'string' && typeof env.ct === 'string';
  }
}

// Fehler-Typen
export class EnvelopeError extends Error {
  constructor(
    message: string,
    public code: 'MALFORMED_ENVELOPE' | 'DECRYPT_AUTH_FAILED' | 'MISSING_DEV_KEY' | 'MISSING_KDF' | 'INVALID_MODE'
  ) {
    super(message);
    this.name = 'EnvelopeError';
  }
}