/**
 * DEV-Key Management für dev-enc Modus
 * Automatische Generierung und localStorage-Persistierung
 */

import { base64urlEncode, base64urlDecode } from '../data/envelope';

export function isValidDevKey(b64: string): boolean {
  try {
    if (!b64 || typeof b64 !== 'string') return false;
    const decoded = base64urlDecode(b64);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

export function getOrCreateDevMasterKeyB64(): string {
  // 1. Prüfe ENV-Variable
  const envKey = import.meta.env.VITE_DEV_MASTER_KEY;
  if (envKey && isValidDevKey(envKey)) {
    return envKey;
  }
  
  // 2. Prüfe localStorage
  const storageKey = localStorage.getItem('dev_master_key_b64');
  if (storageKey && isValidDevKey(storageKey)) {
    return storageKey;
  }
  
  // 3. Generiere neuen Key (nur in Development)
  if (import.meta.env.MODE !== 'development') {
    throw new Error(
      'DEV-Key fehlt und automatische Generierung nur in Development erlaubt. ' +
      'Setzen Sie VITE_DEV_MASTER_KEY in .env.development'
    );
  }
  
  // 32 Random Bytes generieren
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  const keyB64 = base64urlEncode(keyBytes);
  
  // In localStorage speichern
  localStorage.setItem('dev_master_key_b64', keyB64);
  
  console.warn(
    '[DEV-ENC] Generated new dev master key and saved to localStorage. ' +
    'Previous dev-enc data may become unreadable. ' +
    'Consider clearing IndexedDB if needed.'
  );
  
  return keyB64;
}

export function generateNewDevKey(): string {
  if (import.meta.env.MODE !== 'development') {
    throw new Error('DEV-Key-Generierung nur in Development erlaubt');
  }
  
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  const keyB64 = base64urlEncode(keyBytes);
  
  localStorage.setItem('dev_master_key_b64', keyB64);
  
  return keyB64;
}

export function getDevKeySource(): 'env' | 'localStorage' | 'none' {
  const envKey = import.meta.env.VITE_DEV_MASTER_KEY;
  if (envKey && isValidDevKey(envKey)) {
    return 'env';
  }
  
  const storageKey = localStorage.getItem('dev_master_key_b64');
  if (storageKey && isValidDevKey(storageKey)) {
    return 'localStorage';
  }
  
  return 'none';
}