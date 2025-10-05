/**
 * Dexie-basierte IndexedDB (Plain Storage - ohne Verschlüsselung)
 * Stores: clients, users, importSessions, kv
 */

import Dexie, { type Table } from 'dexie';
import type { Client, User, ImportSession } from '../domain/models';
import { getDbName } from '../utils/env';

function normalizeClientStored(c: any) {
  if (!c || typeof c !== 'object') return c;

  const normalized = { ...c };

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
  if (normalized.firstName === undefined) {
    normalized.firstName = '';
  }
  if (normalized.lastName === undefined) {
    normalized.lastName = '';
  }
  if (typeof normalized.id === 'undefined' && normalized.amsId) {
    normalized.id = normalized.amsId;
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

interface KeyValueStore {
  key: string;
  value: any;
}

class ClientWorkDB extends Dexie {
  clients!: Table<Client>;
  users!: Table<User>;
  importSessions!: Table<ImportSession>;
  kv!: Table<KeyValueStore>;

  constructor() {
    super(getDbName());

    this.version(1).stores({
      clients: 'id, amsId, assignedTo, status, priority, isArchived, sourceId, rowKey, followUp, lastActivity',
      users: 'id, name, role, active',
      importSessions: 'id, sourceId, createdAt',
      kv: 'key'
    });

    this.version(2).stores({
      clients: 'id, amsId, assignedTo, status, priority, isArchived, sourceId, rowKey, followUp, lastActivity',
      users: 'id, name, role, active',
      importSessions: 'id, sourceId, createdAt',
      kv: 'key'
    }).upgrade(async (tx) => {
      try {
        const users = tx.table('users');
        const existingIds = new Set<string>(await users.toCollection().primaryKeys() as string[]);
        const mk = (id: string, name: string, role: string) => ({
          id,
          name,
          role,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

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

    this.version(3).stores({
      clients: 'id, amsId, assignedTo, status, priority, isArchived, sourceId, rowKey, followUp, lastActivity',
      users: 'id, name, role, active',
      importSessions: 'id, sourceId, createdAt',
      kv: 'key'
    }).upgrade(async () => {
      console.log('✅ DB v3: Migrated to plain storage (no encryption)');
    });

    this.clients.hook('reading', normalizeClientStored);
    this.users.hook('reading', normalizeUserStored);
  }

  async getKV(key: string): Promise<any> {
    const result = await this.kv.get(key);
    return result?.value || null;
  }

  async setKV(key: string, value: any): Promise<void> {
    await this.kv.put({ key, value });
  }

  async deleteKV(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', [this.clients, this.users, this.importSessions], async () => {
      await this.clients.clear();
      await this.users.clear();
      await this.importSessions.clear();
    });

    try {
      await this.kv.delete('seeded.v1');
    } catch (error) {
      // Ignore
    }

    console.log('🧹 DB: All data cleared');
  }

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
}

export const db = new ClientWorkDB();
