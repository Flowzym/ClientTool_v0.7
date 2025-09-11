import { db } from './db';
import type { Client, User } from '../domain/models';
import type { Role } from '../domain/auth';
import { nowISO } from '../utils/date';

/**
 * Bestehende Funktion: in DEV drei Demo-User anlegen.
 * (Belassen für bisherige Nutzung.)
 */
export async function ensureDemoUsersTrio(): Promise<number> {
  if (import.meta.env.MODE !== 'development') return 0;
  const count = await db.users.count();
  if (count >= 3) return 0;
  const demo = buildDemoUsers();
  await db.users.bulkPut(demo as any);
  return demo.length;
}

/**
 * NEU: Legt die drei Demo-User an, wenn noch keine User existieren –
 * unabhängig von der Umgebung. Idempotent.
 */
export async function ensureDemoUsersIfEmpty(): Promise<number> {
  const count = await db.users.count();
  if (count > 0) return 0;
  const demo = buildDemoUsers();
  await db.users.bulkPut(demo as any);
  return demo.length;
}

/** Demo-User-Liste (einheitlich) */
export function buildDemoUsers(): User[] {
  const demoUsers: User[] = [
    { id: 'admin@local',  name: 'Admin (Demo)',  role: 'admin' as Role,  active: true },
    { id: 'editor@local', name: 'Editor (Demo)', role: 'editor' as Role, active: true },
    { id: 'user@local',   name: 'User (Demo)',   role: 'user' as Role,   active: true },
  ];
  return demoUsers;
}

/** (Optional) Beispiel-Clients – hier unverändert lassen */
export async function ensureDemoClients(mode: 'skip' | 'replace' | 'newIds' = 'skip'): Promise<number> {
  // no-op placeholder – belasse bestehende Implementierung falls vorhanden
  return 0;
}

// --- Added: Testdaten-Seeding für Clients ---
export type SeedMode = 'skip' | 'replace' | 'newIds';

export async function seedTestData(mode: SeedMode = 'skip'): Promise<{ clients: number; users: number }> {
  // Stelle Demo-User in DEV sicher (no-op in PROD)
  let usersCreated = 0;
  try {
    if (typeof ensureDemoUsersTrio === 'function') {
      usersCreated = await ensureDemoUsersTrio();
    }
  } catch {}

  // Bei 'replace' nur zuvor gesäte Datensätze entfernen (sourceId='seed')
  if (mode === 'replace') {
    try {
      await db.clients.where('sourceId').equals('seed').delete();
    } catch {
      // Fallback: alles löschen (nur wenn wirklich notwendig)
      // await db.clients.clear();
    }
  }

  // Bei 'skip': wenn bereits Seed-Datensätze existieren → nichts tun
  if (mode === 'skip') {
    const existing = await db.clients.where('sourceId').equals('seed').count();
    if (existing > 0) {
      return { clients: 0, users: usersCreated };
    }
  }

  // Erzeuge 16 Beispiel-Clients
  const statuses = [
    'offen','inBearbeitung','terminVereinbart','wartetRueckmeldung','dokumenteOffen',
    'foerderAbklaerung','zugewiesenExtern','ruht','erledigt','nichtErreichbar','abgebrochen'
  ] as const;
  const priorities = ['niedrig','normal','hoch','dringend'] as const;

  const firstNames = ['Anna','Bernd','Clara','David','Eva','Felix','Greta','Hans','Ida','Jakob','Klara','Lukas','Mara','Noah','Olga','Paul'];
  const lastNames  = ['Muster','Beispiel','Kunde','Test','Schmidt','Huber','Maier','Gruber','Müller','Lehner','Hofer','Bauer','Leitner','Fischer','Wagner','Pichler'];

  const now = new Date();
  const toISO = (d: Date) => new Date(d).toISOString();

  const plainClients = Array.from({ length: 16 }).map((_, i) => {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const id = mode === 'newIds' ? `seed-${Date.now()}-${i}` : `seed-${i+1}`;

    // Optional: Follow-up für jeden 3. Datensatz in der Zukunft
    const fu = (i % 3 === 0) ? toISO(new Date(now.getTime() + (i+1) * 24*3600*1000)) : undefined;

    const angebot = (['BAM','LL/B+','BwB','NB'] as const)[i % 4];

    return {
      id,
      firstName: fn,
      lastName: ln,
      title: (i % 5 === 0) ? 'Mag.' : undefined,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+43 660 ${String(100000 + i).padStart(6,'0')}`,
      priority: priorities[i % priorities.length],
      status: i % 5 === 0 ? 'terminVereinbart' : (i % 4 === 0 ? 'inBearbeitung' : 'offen'),
      result: undefined,
      angebot,
      followUp: fu,
      lastActivity: toISO(now),
      contactCount: 0,
      contactLog: [],
      isArchived: false,
      archivedAt: undefined,
      assignedTo: (i % 3 === 0) ? 'admin@local' : (i % 3 === 1 ? 'editor@local' : 'user@local'),
      amsAdvisor: (i % 4 === 0) ? 'Claudia Schmitt' : undefined,
      amsAgentFirstName: (i % 4 === 1) ? 'Max' : undefined,
      amsAgentLastName: (i % 4 === 1) ? 'Berater' : undefined,
      isPinned: i % 7 === 0,
      pinnedAt: i % 7 === 0 ? toISO(now) : undefined,
      sourceId: 'seed',
      rowKey: `seed-row-${i+1}`,
      source: {
        fileName: 'seedTestData',
        importedAt: toISO(now),
        mappingPreset: 'demo'
      }
    } as any;
  });

  // Einfügen (Dexie 'creating' Hook verschlüsselt das Plain automatisch)
  let inserted = 0;
  try {
    await db.clients.bulkPut(plainClients as any);
    inserted = plainClients.length;
  } catch (e) {
    console.warn('seedTestData: bulkPut failed, fallback to put loop', e);
    for (const c of plainClients) {
      try {
        await db.clients.put(c as any);
        inserted++;
      } catch {}
    }
  }

  // Seed-Flag setzen (optional)
  try {
    await db.setKV('seeded.v1', new TextEncoder().encode(new Date().toISOString()));
  } catch {}

  return { clients: inserted, users: usersCreated };
}
