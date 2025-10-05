/**
 * Dexie-basierte IndexedDB mit Verschlüsselung
 * Stores: clients, users, importSessions, kv
 * Meta-Daten (id, amsId, rowKey) bleiben unverschlüsselt für Indizes
 */

import Dexie, { type Table } from 'dexie';
import type { Client, User, ImportSession } from '../domain/models';
import { codecFactory } from './codec';
import type { EnvelopeV1} from './envelope';
import { validateEnvelope } from './envelope';
import { getDbName } from '../utils/env';

// Globaler Codec für diese DB-Instanz
const codec = codecFactory();

function isEnvelope(v: any): v is EnvelopeV1 {
  return validateEnvelope(v);
}

/** Envelope dekodieren und Meta-Daten mergen */
async function decodeEnvelope<T = any>(stored: any): Promise<T> {
  if (!isEnvelope(stored)) return stored as T;

  try {
    const plain = await codec.decode(stored);

    // Meta-Daten vom Envelope übernehmen (Plain hat Vorrang, dann Envelope)
    const decoded = {
      ...(plain as any),
      id: stored.id ?? (plain as any)?.id,
      amsId: stored.amsId ?? (plain as any)?.amsId,
      rowKey: stored.rowKey ?? (plain as any)?.rowKey,
    } as T;

    // Development-Logging: Prüfe auf fehlende kritische Felder
    if (import.meta.env.DEV && (decoded as any).id) {
      const plainKeys = Object.keys(plain || {}).length;
      const decodedKeys = Object.keys(decoded).length;
      if (plainKeys > decodedKeys + 3) {
        console.warn('⚠️ Envelope decode: Possible field loss', {
          id: (decoded as any).id,
          plainKeys,
          decodedKeys
        });
      }
    }

    return decoded;

  } catch (error) {
    console.error('❌ Envelope decode failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      envelopeId: stored.id,
      envelopeVersion: stored.envelopeVersion
    });

    // Fallback: Return meta-only object to prevent total failure
    // This allows the app to continue functioning with partial data
    return {
      id: stored.id,
      amsId: stored.amsId,
      rowKey: stored.rowKey,
      _decodeError: true,
      _errorMessage: error instanceof Error ? error.message : 'Decode failed'
    } as T;
  }
}

/** Normalisierung mit robusten Defaults - WICHTIG: Nur fehlende Werte setzen */
function normalizeClientStored(c: any) {
  if (!c || typeof c !== 'object') return c;

  // Basis-Objekt mit allen Original-Werten
  const normalized = { ...c };

  // Nur kritische Felder mit Defaults füllen, wenn sie fehlen oder ungültig sind
  if (typeof normalized.contactCount !== 'number') {
    normalized.contactCount = 0;
  }
  if (!Array.isArray(normalized.contactLog)) {
    normalized.contactLog = [];
  }
  if (!normalized.priority) {
    normalized.priority = 'normal';
  }
  if (!normalized.status) {
    normalized.status = 'offen';
  }
  if (typeof normalized.isArchived !== 'boolean') {
    normalized.isArchived = false;
  }
  // Pflicht-Felder für Anzeige - nur wenn komplett fehlend
  if (normalized.firstName === undefined) {
    normalized.firstName = '';
  }
  if (normalized.lastName === undefined) {
    normalized.lastName = '';
  }
  // ID-Fallback: falls id fehlt, aber amsId da ist
  if (typeof normalized.id === 'undefined' && normalized.amsId) {
    normalized.id = normalized.amsId;
  }

  // Telefonnummer-Normalisierung: phone aus Einzelteilen kombinieren falls nicht vorhanden
  if (import.meta.env.DEV && Math.random() < 0.02) {
    console.log('📞 DB normalizeClientStored:', {
      id: normalized.id,
      phone: normalized.phone,
      countryCode: normalized.countryCode,
      areaCode: normalized.areaCode,
      phoneNumber: normalized.phoneNumber
    });
  }

  if (!normalized.phone && (normalized.countryCode || normalized.areaCode || normalized.phoneNumber)) {
    const parts: string[] = [];
    if (normalized.countryCode) {
      const cc = String(normalized.countryCode).trim();
      parts.push(cc.startsWith('+') ? cc : `+${cc}`);
    }
    if (normalized.areaCode) parts.push(String(normalized.areaCode).trim());
    if (normalized.phoneNumber) parts.push(String(normalized.phoneNumber).trim());
    if (parts.length > 0) {
      normalized.phone = parts.join(' ');
      if (import.meta.env.DEV) {
        console.log('📞 DB: Combined phone from parts:', normalized.phone, 'for', normalized.id);
      }
    }
  }

  return normalized;
}

function normalizeUserStored(u: any) {
  if (!u || typeof u !== 'object') return u;
  return {
    ...u,
    role: u.role ?? 'user',
    active: u.active ?? true,
  };
}
// Datenbank-Tabellen
interface KeyValueStore {
  key: string;
  value: any; // Kann sealed oder plain sein
}

class ClientWorkDB extends Dexie {
  clients!: Table<any>; // Envelope: Meta außen + sealed payload
  users!: Table<any>;   // Sealed User-Objekte
  importSessions!: Table<any>; // Sealed ImportSession-Objekte
  kv!: Table<KeyValueStore>;

  constructor() {
    super(getDbName());

    this.version(1).stores({
      clients: 'id, amsId, assignedTo, status, priority, isArchived, sourceId, rowKey, followUp, lastActivity',
      users: 'id, name, role, active',
      importSessions: 'id, sourceId, createdAt',
      kv: 'key'
    });
    // Version 2: garantiere Demo-User (admin/user) als minimale Plain-Records in DEV-DBs
    this.version(2).stores({
      clients: 'id, amsId, assignedTo, status, priority, isArchived, sourceId, rowKey, followUp, lastActivity',
      users: 'id, name, role, active',
      importSessions: 'id, sourceId, createdAt',
      kv: 'key'
    }).upgrade(async (tx) => {
      try {
        const users = tx.table('users');
        const existingIds = new Set<string>(await users.toCollection().primaryKeys() as string[]);
        const mk = (id: string, name: string, role: string) => ({ id, name, role, active: true, createdAt: Date.now(), updatedAt: Date.now() });

        if (!existingIds.has('admin@local')) {
          await users.put(mk('admin@local', 'Admin (Demo)', 'admin'));
        }
        if (!existingIds.has('user@local')) {
          await users.put(mk('user@local', 'User (Demo)', 'user'));
        }
      } catch (e) {
        console.warn('Dexie v2 upgrade: ensure demo users failed', e);
      }
    });

    // Clients Hooks - Meta außen, Payload verschlüsselt
    this.clients.hook('reading', (val) => decodeEnvelope<Client>(val).then(normalizeClientStored));
    
    this.clients.hook('creating', function (_pk, obj) {
      return (async () => {
        const envelope = await codec.encode(obj, {
          id: obj.id,               // kann undefined sein (auto-increment kümmert sich)
          amsId: obj.amsId,
          rowKey: (obj as any).rowKey
        });
        
        this.value = envelope;
      })();
    });
    
    this.clients.hook('updating', function (mods, _pk, oldVal) {
      return (async () => {
        // obj is the third parameter - the complete new object passed to put()
        const obj = arguments[2]; // Access third parameter correctly
        const plainOld = await decodeEnvelope<Client>(oldVal);
        const nextPlain = obj; // Use the complete new object, not oldVal + mods
        
        const envelope = await codec.encode(nextPlain, {
          id: nextPlain.id,
          amsId: nextPlain.amsId,
          rowKey: nextPlain.rowKey,
          createdAt: oldVal.createdAt, // Behalte ursprüngliches Erstellungsdatum
          updatedAt: Date.now()
        });
        
        // Set this.value to replace the entire record
        this.value = envelope;
        
        if (import.meta.env.DEV) {
          console.debug('[dexie:update] clients', { id: nextPlain.id });
        }
      })();
    });

    // Users Hooks - Meta außen, Payload verschlüsselt (wie Clients)
    this.users.hook('reading', (val) => decodeEnvelope<User>(val).then(normalizeUserStored));
    
    this.users.hook('creating', function (_pk, obj) {
      return (async () => {
        const envelope = await codec.encode(obj, {
          id: obj.id,
          name: obj.name,
          role: obj.role,
          active: obj.active,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        this.value = envelope;
      })();
    });
    
    this.users.hook('updating', function (mods, _pk, oldVal) {
      return (async () => {
        // obj is the third parameter - the complete new object passed to put()
        const obj = arguments[2]; // Access third parameter correctly
        const plainOld = await decodeEnvelope<User>(oldVal);
        const nextPlain = obj; // Use the complete new object, not oldVal + mods
        
        const envelope = await codec.encode(nextPlain, {
          id: nextPlain.id,
          name: nextPlain.name,
          role: nextPlain.role,
          active: nextPlain.active,
          createdAt: oldVal.createdAt, // Behalte ursprüngliches Erstellungsdatum
          updatedAt: Date.now()
        });
        
        // Set this.value to replace the entire record
        this.value = envelope;
        
        if (import.meta.env.DEV) {
          console.debug('[dexie:update] users', { id: nextPlain.id });
        }
      })();
    });

    // ImportSessions Hooks
    this.importSessions.hook('reading', (val) => decodeEnvelope<ImportSession>(val));
    this.importSessions.hook('creating', function (_pk, obj) {
      return (async () => {
        const envelope = await codec.encode(obj);
        
        // Set this.value to replace the entire record
        this.value = envelope;
        
        if (import.meta.env.DEV) {
          console.debug('[dexie:create] importSessions', { id: obj.id });
        }
      })();
    });
    this.importSessions.hook('updating', function (mods, _pk, oldObj) {
      return (async () => {
        // obj is the third parameter - the complete new object passed to put()
        const obj = arguments[2]; // Access third parameter correctly
        const plainOld = await decodeEnvelope<ImportSession>(oldObj);
        const nextPlain = obj; // Use the complete new object, not oldVal + mods
        
        const envelope = await codec.encode(nextPlain);
        
        // Set this.value to replace the entire record
        this.value = envelope;
        
        if (import.meta.env.DEV) {
          console.debug('[dexie:update] importSessions', { id: nextPlain.id });
        }
      })();
    });

    // KV Hooks (für Salt, Settings etc.)
    this.kv.hook('reading', (val) => {
      // KV kann sowohl Envelope als auch plain Werte haben
      if (val && typeof val.value !== 'undefined') {
        return { ...val, value: isEnvelope(val.value) ? decodeEnvelope(val.value) : val.value };
      }
      return val;
    });
  }

  // KV Store Methods
  async getKV(key: string): Promise<any> {
    const result = await this.kv.get(key);
    return result?.value || null;
  }

  async setKV(key: string, value: any): Promise<void> {
    await this.kv.put({ key, value });
  }

  // Salt Management (unverschlüsselt für Crypto-Setup)
  async getSalt(): Promise<Uint8Array | null> {
    const saltData = await this.getKV('argon2_salt');
    if (!saltData) return null;
    
    // Salt als ArrayBuffer oder Uint8Array
    if (saltData instanceof ArrayBuffer) {
      return new Uint8Array(saltData);
    }
    if (saltData instanceof Uint8Array) {
      return saltData;
    }
    
    return null;
  }

  async setSalt(salt: Uint8Array): Promise<void> {
    await this.setKV('argon2_salt', salt.buffer);
  }

  // Development/Test Methods
  async clearAllData(): Promise<void> {
    await this.transaction('rw', [this.clients, this.users, this.importSessions], async () => {
      await this.clients.clear();
      await this.users.clear();
      await this.importSessions.clear();
    });
    
    // Seed-Flag auch löschen
    try {
      await this.kv.delete('seeded.v1');
    } catch (error) {
      // Ignoriere Fehler falls Key nicht existiert
    }
    
    console.log('🧹 DB: All data cleared');
  }

  // Bulk-Operationen für Import
  async bulkCreate(clients: Client[]): Promise<number> {
    if (!clients.length) return 0;
    
    await this.transaction('rw', [this.clients], async () => {
      for (const client of clients) {
        await this.clients.add(client);
      }
    });
    
    return clients.length;
  }

  async bulkPatch(patches: Partial<Client & { id: string }>[]): Promise<number> {
    if (!patches.length) return 0;
    
    await this.transaction('rw', [this.clients], async () => {
      for (const patch of patches) {
        const { id, ...updates } = patch;
        await this.clients.update(id, updates);
      }
    });
    
    return patches.length;
  }

  async bulkArchive(ids: string[], archivedAtISO: string): Promise<number> {
    if (!ids.length) return 0;
    
    await this.transaction('rw', [this.clients], async () => {
      for (const id of ids) {
        await this.clients.update(id, {
          isArchived: true,
          archivedAt: archivedAtISO
        });
      }
    });
    
    return ids.length;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    
    await this.transaction('rw', [this.clients], async () => {
      await this.clients.bulkDelete(ids);
    });
    
    return ids.length;
  }

  async putImportSession(session: ImportSession): Promise<void> {
    await this.importSessions.put(session);
  }

  // Admin-Funktion: Alle Daten nachträglich verschlüsseln
  async reencryptAll(): Promise<{ clients: number; users: number; sessions: number }> {
    const stats = { clients: 0, users: 0, sessions: 0 };
    
    await this.transaction('rw', [this.clients, this.users, this.importSessions], async () => {
      // Clients
      const clients = await this.clients.toArray();
      for (const c of clients) {
        if (!isEnvelope(c)) {
          const envelope = await codec.encode(c, {
            id: c.id,
            amsId: c.amsId,
            rowKey: c.rowKey
          });
          await this.clients.put(envelope as any);
          stats.clients++;
        }
      }
      
      // Users
      const users = await this.users.toArray();
      for (const u of users) {
        if (!isEnvelope(u)) {
          const envelope = await codec.encode(u);
          await this.users.put(envelope as any);
          stats.users++;
        }
      }
      
      // ImportSessions
      const sessions = await this.importSessions.toArray();
      for (const s of sessions) {
        if (!isEnvelope(s)) {
          const envelope = await codec.encode(s);
          await this.importSessions.put(envelope as any);
          stats.sessions++;
        }
      }
    });
    
    console.log('🔐 DB: Re-encryption completed', stats);
    return stats;
  }

  // Einmalige Rewrap-Reparatur für bestehende Datensätze
  async rewrapClients(): Promise<number> {
    let rewrapped = 0;
    const rows = await this.clients.toArray();
    
    await this.transaction('rw', [this.clients], async () => {
      for (const val of rows) {
        // Alte Sealed-Objekte zu Envelope v1 konvertieren
        if (val && val.nonce && val.ciphertext && !val.envelopeVersion) {
          const plain = await codec.decode({
            ...val,
            envelopeVersion: 'v1',
            mode: 'enc',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          
          const envelope = await codec.encode(plain, {
            id: val.id,
            amsId: plain?.amsId ?? val.amsId,
            rowKey: plain?.rowKey ?? val.rowKey
          });
          
          await this.clients.put(envelope as any);
          rewrapped++;
        }
      }
    });
    
    console.log(`🔄 DB: Rewrapped ${rewrapped} client records`);
    return rewrapped;
  }
}

// Singleton-Instanz
export const db = new ClientWorkDB();

// Salt-Management für CryptoManager (Legacy-Support)
import { cryptoManager } from './crypto';

(cryptoManager as any).loadSaltFromStorage = async (): Promise<Uint8Array | null> => {
  return await db.getSalt();
};

(cryptoManager as any).saveSaltToStorage = async (salt: Uint8Array): Promise<void> => {
  await db.setSalt(salt);
};