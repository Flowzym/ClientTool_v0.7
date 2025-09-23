/**
 * Codec-Schicht für einheitliche Verschlüsselung
 * Envelope v1 mit Meta-Daten außen, verschiedene Modi
 */

import { cryptoManager } from './crypto';
import type { EnvelopeV1 } from './envelope';

export type Envelope = EnvelopeV1;

export interface Codec {
  encode(plain: unknown, meta?: EnvelopeV1['meta']): Promise<Envelope>;
  decode(envelope: Envelope): Promise<any>;
}

// Einheitlicher Codec für alle Modi
class UnifiedCodec implements Codec {
  async encode(plain: unknown, meta?: EnvelopeV1['meta']): Promise<Envelope> {
    const bytes = new TextEncoder().encode(JSON.stringify(plain));
    return await cryptoManager.encryptEnvelope(bytes, undefined, meta);
  }

  async decode(envelope: Envelope): Promise<any> {
    const bytes = await cryptoManager.decryptEnvelope(envelope as EnvelopeV1);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  }
}

// Codec-Factory (vereinfacht)
export function codecFactory(): Codec {
  return new UnifiedCodec();
}

// Globaler Codec
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