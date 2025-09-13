import { cryptoManager } from '../../data/crypto';
import { EnvelopeError } from '../../data/envelope';
import { getEncryptionMode } from '../../utils/env';
import { db } from '../../data/db';
import { seedTestData } from '../../data/seed';

// Development-Helper für Passphrase-Bypass
const BYPASS_KEY = 'klient-tool-bypass-auth';
const isDev = import.meta.env.DEV;

export function isAuthBypassEnabled(): boolean {
  if (!isDev) return false;
  return localStorage.getItem(BYPASS_KEY) === 'true';
}

export function setAuthBypass(enabled: boolean): void {
  if (!isDev) { try { localStorage.removeItem(BYPASS_KEY); } catch {} return; }
  if (enabled) { localStorage.setItem(BYPASS_KEY, 'true'); } else { localStorage.removeItem(BYPASS_KEY); }
}

// Auth Context
export interface AuthContextType {
  isAuthenticated: boolean;
  login: (passphrase: string) => Promise<boolean>;
  logout: () => void;
  bypassEnabled: boolean;
  setBypass: (enabled: boolean) => void;
}

export function createInitialAuthState(): boolean {
  try { 
    const cached = sessionStorage.getItem('auth:session'); 
    if (cached === '1') return true; 
  } catch {}
  return getEncryptionMode() !== 'prod-enc';
}

export async function performLogin(passphrase: string): Promise<boolean> {
  if (getEncryptionMode() !== 'prod-enc') { 
    return true; 
  }
  try {
    console.log('🔐 Auth: Attempting login (kv-probe)...');
    // Key ableiten
    await cryptoManager.deriveKey(passphrase);

    // Robuste Validierung: Roundtrip in KV-Store (entschlüsselt gespeichert)
    try {
      const probeKey = 'auth:probe';
      await db.setKV(probeKey, new TextEncoder().encode('ok'));
      const res = await db.getKV(probeKey);
      await db.deleteKV(probeKey).catch(() => { /* no-op */ });
      if (!res) throw new Error('KV-Probe fehlgeschlagen');
    } catch (e) {
      // Falsche Passphrase: AES-Entschlüsselung/Codec schlägt fehl
      cryptoManager.clearKey();
      console.warn('❌ Auth: Invalid passphrase - kv probe failed', e);
      return false;
    }

    console.log('✅ Auth: Login successful');
    return true;
  } catch (error) {
    console.error('❌ Auth: Login failed:', error);
    if (error instanceof EnvelopeError && error.code === 'DECRYPT_AUTH_FAILED') {
      return false; // Invalid passphrase
    }
    throw error;
  }
}

export function performLogout(): void {
  cryptoManager.clearKey();
  console.log('👋 Auth: Logged out');
}

export async function handleDevSeed(): Promise<void> {
  if (!cryptoManager.hasKey()) {
    throw new Error('Bitte zuerst anmelden');
  }

  try {
    await seedTestData('replace');
    console.log('✅ Test data seeded');
  } catch (error) {
    console.error('Seed failed:', error);
    throw new Error('Test-Daten konnten nicht erstellt werden');
  }
}

export function persistAuthSession(isAuthenticated: boolean): void {
  try { 
    sessionStorage.setItem('auth:session', isAuthenticated ? '1' : '0'); 
  } catch { 
    /* no-op */ 
  }
}