import { db } from './db';
import { nowISO } from '../utils/date';
import type { Client, User } from '../domain/models';
import type { Role } from '../domain/auth';

type SeedMode = 'skip' | 'replace' | 'newIds';

/**
 * Sorgt dafür, dass in DEV die drei Demo-User existieren (admin/editor/user).
 * Idempotent via bulkPut.
 */
export async function ensureDemoUsersTrio(): Promise<number> {
  if (import.meta.env.MODE !== 'development') return 0;

  const demoUsers: User[] = [
    { id: 'admin@local',  name: 'Admin (Demo)',  role: 'admin' as Role,  active: true },
    { id: 'editor@local', name: 'Editor (Demo)', role: 'editor' as Role, active: true },
    { id: 'user@local',   name: 'User (Demo)',   role: 'user' as Role,   active: true },
    { id: 'user1@local',  name: 'Sarah Weber',   role: 'editor' as Role, active: true, initials: 'SW' },
    { id: 'user2@local',  name: 'Michael Huber', role: 'editor' as Role, active: true, initials: 'MH' },
    { id: 'user3@local',  name: 'Lisa Schmidt',  role: 'editor' as Role, active: true, initials: 'LS' },
  ];

  let created = 0;
  await db.transaction('rw', [db.users], async () => {
    const existingIds = new Set((await db.users.toArray()).map(u => u.id));
    for (const u of demoUsers) if (!existingIds.has(u.id)) created++;
    await db.users.bulkPut(demoUsers);
  });

  if (created > 0) {
    console.log(`🌱 ensureDemoUsersTrio: created ${created} demo users`);
  }
  return created;
}

/**
 * DEV-Bootstrap: ruft ensureDemoUsersTrio auf und gibt {created} zurück.
 */
export async function ensureDevDemoUsersSeeded(): Promise<{ created: number }> {
  if (import.meta.env.MODE !== 'development') return { created: 0 };
  const created = await ensureDemoUsersTrio();
  return { created };
}

/**
 * Erzeugt Testdaten für Clients. Modus:
 *  - 'skip': legt nur an, wenn die Ziel-IDs noch nicht existieren
 *  - 'replace': löscht seedbare Altdatensätze (sourceId='seed-test-data' ODER kontaktlos & unassigned), schreibt neu
 *  - 'newIds': generiert neue UUIDs für jeden Datensatz
 */
export async function seedTestData(mode: SeedMode = 'skip'): Promise<{ clients: number; users: number }> {
  // Demo-User sicherstellen (in DEV); zählt, aber bricht nicht in PROD
  const usersCreated = await ensureDemoUsersTrio().catch(() => 0);

  // Test-Client-Basisdaten
  const lastNames = ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun'];
  const firstNames = ['Anna','Peter','Julia','Thomas','Laura','Michael','Sarah','Daniel','Lisa','Andreas','Nina','Markus','Sophie','Jan','Lea','Christian','Laura','Felix','Marie','Paul'];
  const statuses: Client['status'][] = ['offen','in_bearbeitung','erfolgreich','kein_interesse'];
  const priorities: Client['priority'][] = ['hoch','mittel','niedrig'];

  const baseClients: Omit<Client, 'id'|'contactCount'|'contactLog'|'isArchived'>[] = Array.from({length: 24}).map((_, i) => {
    const first = firstNames[i % firstNames.length];
    const last  = lastNames[i % lastNames.length];
    return {
      amsId: `AMS${String(100000 + i).padStart(6,'0')}`,
      firstName: first,
      lastName: last,
      phone: `+49 ${String(100 + i)} ${String(1000000 + i * 123).slice(0,7)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      address: `${last}straße ${i+1}, ${String(10000 + i*100)} Musterstadt`,
      internalCode: `INT-${String(i+1).padStart(3,'0')}`,
      assignedTo: i % 3 === 0 ? 'admin@local' : (i % 3 === 1 ? 'editor@local' : undefined),
      priority: priorities[i % priorities.length],
      status: statuses[i % statuses.length],
      followUp: i % 4 === 0 ? `${new Date().getFullYear()}-${String((i % 12) + 1).padStart(2, '0')}-15` : undefined,
      lastActivity: `${new Date().getFullYear()}-01-${String((i % 28) + 1).padStart(2, '0')}T${String(9 + (i % 8))}:00:00Z`,
      sourceId: 'seed-test-data',
      rowKey: `AMS${String(100000 + i).padStart(6, '0')}`,
      sourceRowHash: `seed-hash-${i}`,
      lastImportedAt: nowISO(),
      lastSeenInSourceAt: nowISO(),
    };
  });

  const clients: Client[] = baseClients.map((base, i) => ({
    ...base,
    id: mode === 'newIds' ? crypto.randomUUID() : `test-client-${i+1}`,
    contactCount: 0,
    contactLog: [],
    isArchived: false,
  }));

  // Optionales Replace: alte seedbare Datensätze entfernen
  if (mode === 'replace') {
    const deletableIds = await db.clients
      .filter(c => (c.contactLog?.length ?? 0) === 0 && !c.assignedTo || c.sourceId === 'seed-test-data')
      .primaryKeys();
    if (deletableIds.length > 0) {
      await db.clients.bulkDelete(deletableIds as string[]);
    }
  }

  // 'skip': nur anlegen, wenn Ziel-ID nicht existiert
  let toInsert = clients;
  if (mode === 'skip') {
    const existingIds = new Set((await db.clients.bulkGet(clients.map(c => c.id))).filter(Boolean).map(c => (c as Client).id));
    toInsert = clients.filter(c => !existingIds.has(c.id));
  }

  await db.transaction('rw', [db.clients], async () => {
    if (toInsert.length) {
      await db.clients.bulkPut(toInsert);
    }
  });

  // Seed-Flag setzen
  await db.setKV('seeded.v1', new TextEncoder().encode(nowISO()));

  return { clients: toInsert.length, users: usersCreated };
}

export async function wasSeeded(): Promise<boolean> {
  try {
    const flagData = await db.getKV('seeded.v1');
    return !!flagData;
  } catch {
    return false;
  }
}

export async function getSeedTimestamp(): Promise<string | null> {
  try {
    const flagData = await db.getKV('seeded.v1');
    if (!flagData) return null;
    return new TextDecoder().decode(flagData);
  } catch {
    return null;
  }
}
