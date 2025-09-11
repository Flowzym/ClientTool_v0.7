/**
 * Codec-Schicht für einheitliche Verschlüsselung
 * Envelope v1 mit Meta-Daten außen, verschiedene Modi
 */

import { cryptoManager } from './crypto';
import { getEncryptionMode } from '../utils/env';
import { getOrCreateDevMasterKeyB64 } from '../utils/devKey';

// Einheitliches Envelope v1
export interface EnvelopeV1Base {
  id?: string;
  amsId?: string;
  rowKey?: string;
  envelopeVersion: 'v1';
  mode: 'plain' | 'enc';
  createdAt: number;
  updatedAt: number;
}

export interface PlainEnvelope extends EnvelopeV1Base {
  mode: 'plain';
  data: any;
}

export interface EncryptedEnvelope extends EnvelopeV1Base {
  mode: 'enc';
  nonce: string;
  ciphertext: string;
}

export type Envelope = PlainEnvelope | EncryptedEnvelope;

export interface Codec {
  mode(): 'plain' | 'enc';
  encode(plain: unknown, meta?: Partial<EnvelopeV1Base>): Promise<Envelope>;
  decode(envelope: Envelope): Promise<any>;
}

// Plain-Codec (keine Verschlüsselung)
class PlainCodec implements Codec {
  mode(): 'plain' {
    return 'plain';
  }

  async encode(plain: unknown, meta: Partial<EnvelopeV1Base> = {}): Promise<PlainEnvelope> {
    const now = Date.now();
    return {
      envelopeVersion: 'v1',
      mode: 'plain',
      createdAt: now,
      updatedAt: now,
      ...meta,
      data: plain
    };
  }

  async decode(envelope: Envelope): Promise<any> {
    if (envelope.mode !== 'plain') {
      throw new Error('PlainCodec kann nur plain-Envelopes dekodieren');
    }
    return (envelope as PlainEnvelope).data;
  }
}

// AES-GCM-Codec (Verschlüsselung)
class AesGcmCodec implements Codec {
  constructor() {
    // Für dev-enc: DEV-Key aus ENV setzen
    if (getEncryptionMode() === 'dev-enc') {
      try {
        const devKey = getOrCreateDevMasterKeyB64();
        this.ensureDevKey(devKey);
      } catch (error) {
        throw new Error(
          `❌ DEV-ENC Key-Setup fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n` +
          'Prüfen Sie VITE_DEV_MASTER_KEY in .env.development oder lassen Sie einen lokalen DEV-Key generieren.'
        );
      }
    }
  }

  private async ensureDevKey(devKeyB64: string): Promise<void> {
    if (cryptoManager.hasKey()) return;
    
    try {
      const keyBytes = new Uint8Array([...atob(devKeyB64)].map(c => c.charCodeAt(0)));
      if (keyBytes.length !== 32) {
        throw new Error('DEV-Key muss genau 32 Bytes (Base64) haben');
      }
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      
      cryptoManager.setActiveKey(cryptoKey);
      console.log('🔐 DEV-Key erfolgreich geladen');
    } catch (error) {
      throw new Error(
        `DEV-Key ungültig (muss 32 Bytes Base64 sein): ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n` +
        'Entweder VITE_DEV_MASTER_KEY in .env.development korrigieren oder lokalen DEV-Key neu generieren (Sicherheit → DEV-Key).'
      );
    }
  }

  mode(): 'enc' {
    return 'enc';
  }

  async encode(plain: unknown, meta: Partial<EnvelopeV1Base> = {}): Promise<EncryptedEnvelope> {
    await cryptoManager.getActiveKey(); // Sicherstellen, dass Key verfügbar ist
    const encrypted = await cryptoManager.encrypt(JSON.stringify(plain));
    const now = Date.now();
    
    return {
      envelopeVersion: 'v1',
      mode: 'enc',
      createdAt: now,
      updatedAt: now,
      ...meta,
      nonce: btoa(String.fromCharCode(...encrypted.nonce)),
      ciphertext: btoa(String.fromCharCode(...encrypted.ciphertext))
    };
  }

  async decode(envelope: Envelope): Promise<any> {
    if (envelope.mode !== 'enc') {
      throw new Error('AesGcmCodec kann nur enc-Envelopes dekodieren');
    }
    
    const encEnvelope = envelope as EncryptedEnvelope;
    const nonce = new Uint8Array([...atob(encEnvelope.nonce)].map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array([...atob(encEnvelope.ciphertext)].map(c => c.charCodeAt(0)));
    
    const decrypted = await cryptoManager.decrypt({ nonce, ciphertext });
    return JSON.parse(decrypted);
  }
}

// Codec-Factory
export function codecFactory(mode?: EncryptionMode): Codec {
  const encMode = mode || getEncryptionMode();
  
  switch (encMode) {
    case 'plain':
      return new PlainCodec();
      
    case 'dev-enc':
      return new AesGcmCodec();
      
    case 'prod-enc':
      return new AesGcmCodec();
      
    default:
      throw new Error(`Unbekannter Encryption-Mode: ${encMode}`);
  }
}

// Globaler Codec (Singleton)
let globalCodec: Codec | null = null;

export function getCodec(): Codec {
  if (!globalCodec) {
    globalCodec = codecFactory();
  }
  return globalCodec;
}

export function resetCodec(): void {
  globalCodec = null;
}