import { db } from './db';
import type { Client, User } from '../domain/models';
import type { Role } from '../domain/auth';

/**
 * DEV-Helfer (bestehendes Verhalten beibehalten):
 * Legt in Development drei Demo-User an (admin/editor/user), wenn noch keine existieren.
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
 * NEU: Legt die drei Demo-User an, wenn noch keine User existieren – unabhängig von der Umgebung.
 * Idempotent. Wird beim App-Start und vom UserSwitcher verwendet.
 */
export async function ensureDemoUsersIfEmpty(): Promise<number> {
  const count = await db.users.count();
  if (count > 0) return 0;
  const demo = buildDemoUsers();
  await db.users.bulkPut(demo as any);
  return demo.length;
}

/** Gemeinsamer Demo-User-Baukasten */
export function buildDemoUsers(): User[] {
  const demoUsers: User[] = [
    { id: 'admin@local',  name: 'Admin (Demo)',  role: 'admin' as Role,  active: true },
    { id: 'editor@local', name: 'Editor (Demo)', role: 'editor' as Role, active: true },
    { id: 'user@local',   name: 'User (Demo)',   role: 'user' as Role,   active: true },
  ];
  return demoUsers;
}

/**
 * OPTIONALER Platzhalter – bleibt erhalten, damit existierende Aufrufer nicht brechen.
 * Passe bei Bedarf an deinen Client-Seed an.
 */
export async function ensureDemoClients(_mode: 'skip' | 'replace' | 'newIds' = 'skip'): Promise<number> {
  return 0;
}

/** Testdaten-Seeding für Clients – wird u. a. in PassphraseGate genutzt */
export type SeedMode = 'skip' | 'replace' | 'newIds';

export async function seedTestData(mode: SeedMode = 'skip'): Promise<{ clients: number; users: number }> {
  // In DEV ggf. zusätzliche Demo-User anlegen (no-op außerhalb DEV)
  let usersCreated = 0;
  try {
    usersCreated = await ensureDemoUsersTrio();
  } catch {}

  if (mode === 'replace') {
    try { await db.clients.where('sourceId').equals('seed').delete(); } catch {}
  }
  if (mode === 'skip') {
    const existing = await db.clients.where('sourceId').equals('seed').count();
    if (existing > 0) return { clients: 0, users: usersCreated };
  }

  // const statuses = [
  //   'offen','inBearbeitung','terminVereinbart','wartetRueckmeldung','dokumenteOffen',
  //   'foerderAbklaerung','zugewiesenExtern','ruht','erledigt','nichtErreichbar','abgebrochen'
  // ] as const;
  const priorities = ['niedrig','normal','hoch','dringend'] as const;

  const firstNames = ['Anna','Bernd','Clara','David','Eva','Felix','Greta','Hans','Ida','Jakob','Klara','Lukas','Mara','Noah','Olga','Paul'];
  const lastNames  = ['Muster','Beispiel','Kunde','Test','Schmidt','Huber','Maier','Gruber','Müller','Lehner','Hofer','Bauer','Leitner','Fischer','Wagner','Pichler'];

  const now = new Date();
  const toISO = (d: Date) => new Date(d).toISOString();

  // Fixed base time for deterministic tests
  const baseTime = new Date('2024-01-15T10:00:00Z');
  const toISOFixed = (offsetDays: number) => new Date(baseTime.getTime() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

  const rows: Partial<Client & { sourceId?: string; rowKey?: string; source?: any }>[] = Array.from({ length: 16 }).map((_, i) => {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const id = mode === 'newIds' ? `seed-${baseTime.getTime()}-${i}` : `seed-${i+1}`;
    const fu = (i % 3 === 0) ? toISOFixed(i + 1) : undefined;
    const angebot = (['BAM','LL/B+','BwB','NB'] as const)[i % 4];

    return {
      id,
      firstName: fn,
      lastName: ln,
      title: (i % 5 === 0) ? 'Mag.' : undefined,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+43 660 ${String(100000 + i).padStart(6,'0')}`,
      priority: priorities[i % priorities.length] as any,
      status: (i % 5 === 0) ? 'terminVereinbart' as any : ((i % 4 === 0) ? 'inBearbeitung' as any : 'offen' as any),
      angebot,
      followUp: fu,
      lastActivity: toISOFixed(0), // Base time
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
      source: { fileName: 'seedTestData', importedAt: toISOFixed(0), mappingPreset: 'demo' }
    };
  });

  let inserted = 0;
  try {
    console.log(`📦 Versuche ${rows.length} Clients per bulkPut einzufügen...`);
    await db.clients.bulkPut(rows as any);
    inserted = rows.length;
    console.log(`✅ bulkPut erfolgreich: ${inserted} Clients eingefügt`);
  } catch (e) {
    console.warn('⚠️ seedTestData: bulkPut failed; fallback to put loop', e);
    console.error('bulkPut Error-Details:', e instanceof Error ? e.message : e);

    for (const c of rows) {
      try {
        await db.clients.put(c as any);
        inserted++;
        if (inserted % 5 === 0) {
          console.log(`📝 ${inserted}/${rows.length} Clients eingefügt...`);
        }
      } catch (putError) {
        console.error(`❌ Fehler beim Einfügen von Client ${c.id}:`, putError);
      }
    }
    console.log(`✅ Fallback-Insert abgeschlossen: ${inserted}/${rows.length} Clients eingefügt`);
  }

  // Verifikation
  const finalCount = await db.clients.count();
  console.log(`🔍 Verifikation: ${finalCount} Clients in DB nach Seed`);

  try {
    await db.setKV('seeded.v1', new TextEncoder().encode(new Date().toISOString()));
  } catch {}

  return { clients: inserted, users: usersCreated };
}
