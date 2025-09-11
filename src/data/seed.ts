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
