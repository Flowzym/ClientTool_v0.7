/**
 * Big data generator for performance testing
 * Creates large synthetic datasets deterministically
 */

import type { Client } from '../domain/models';

// Simple LCG for deterministic random numbers
class SimpleRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000;
    return this.seed / 0x100000000;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(array.length)];
  }
}

const firstNames = [
  'Anna', 'Bernd', 'Clara', 'David', 'Eva', 'Felix', 'Greta', 'Hans', 'Ida', 'Jakob',
  'Klara', 'Lukas', 'Mara', 'Noah', 'Olga', 'Paul', 'Quirin', 'Rosa', 'Stefan', 'Tina',
  'Ulrich', 'Vera', 'Werner', 'Xenia', 'Yves', 'Zora', 'Alexander', 'Barbara', 'Christian', 'Diana',
  'Emil', 'Franziska', 'Georg', 'Helena', 'Igor', 'Julia', 'Karl', 'Lisa', 'Martin', 'Nina'
];

const lastNames = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
  'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier',
  'Lehmann', 'Schmid', 'Schulze', 'Maier', 'Köhler', 'Herrmann', 'König', 'Walter', 'Mayer', 'Huber'
];

const statuses = ['offen', 'inBearbeitung', 'terminVereinbart', 'wartetRueckmeldung', 'dokumenteOffen', 'foerderAbklaerung', 'zugewiesenExtern', 'ruht', 'erledigt', 'nichtErreichbar', 'abgebrochen'] as const;
const priorities = ['niedrig', 'normal', 'hoch', 'dringend'] as const;
const angebote = ['BAM', 'LL/B+', 'BwB', 'NB'] as const;

export function generateClients(n: number, seed: number = 12345): Client[] {
  const rng = new SimpleRandom(seed);
  const clients: Client[] = [];
  
  // Fixed base time for deterministic tests
  const baseTime = new Date('2024-01-15T10:00:00Z').getTime();
  
  for (let i = 0; i < n; i++) {
    const firstName = rng.pick(firstNames);
    const lastName = rng.pick(lastNames);
    const amsId = `A${String(10000 + i).padStart(5, '0')}`; // A10000, A10001, etc.
    
    // Random dates within last year
    const dayOffset = rng.nextInt(365);
    const lastActivity = new Date(baseTime - dayOffset * 24 * 60 * 60 * 1000).toISOString();
    
    // Follow-up dates (30% chance)
    const hasFollowUp = rng.next() < 0.3;
    const followUp = hasFollowUp 
      ? new Date(baseTime + rng.nextInt(30) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    
    // Contact attempts (0-5)
    const contactCount = rng.nextInt(6);
    
    // Notes (0-3)
    const noteCount = rng.nextInt(4);
    const notes = Array.from({ length: noteCount }, (_, j) => `Notiz ${j + 1} für ${firstName} (seed:${seed})`);
    
    const client: Client = {
      id: `perf-client-${seed}-${i}`, // Include seed for uniqueness
      amsId,
      firstName,
      lastName,
      title: rng.next() < 0.1 ? rng.pick(['Dr.', 'Mag.', 'DI', 'Prof.']) : undefined,
      birthDate: new Date(1950 + rng.nextInt(50), rng.nextInt(12), 1 + rng.nextInt(28)).toISOString().split('T')[0],
      phone: `+43 ${rng.nextInt(900) + 100} ${rng.nextInt(900000) + 100000}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example${rng.nextInt(5)}.com`,
      address: `${rng.pick(['Haupt', 'Neben', 'Kirchen', 'Schul', 'Bahn'])}straße ${rng.nextInt(200) + 1}`,
      zip: String(1000 + rng.nextInt(9000)),
      city: rng.pick(['Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt']),
      assignedTo: rng.next() < 0.7 ? rng.pick(['admin@local', 'editor@local', 'user@local']) : undefined,
      priority: rng.pick(priorities),
      status: rng.pick(statuses),
      angebot: rng.next() < 0.8 ? rng.pick(angebote) : undefined,
      followUp,
      lastActivity,
      contactCount,
      contactLog: [],
      isArchived: rng.next() < 0.1,
      archivedAt: undefined,
      sourceId: `perf-dataset-${n}`,
      rowKey: `perf-${i}`,
      isPinned: rng.next() < 0.05, // 5% pinned
      pinnedAt: undefined,
      amsAdvisor: rng.next() < 0.3 ? rng.pick(['Claudia Schmitt', 'Max Berater', 'Anna Betreuerin']) : undefined,
      source: {
        fileName: `perf-dataset-${n}.xlsx`,
        importedAt: now.toISOString()
      }
    };
    
    // Add notes to client
    if (notes.length > 0) {
      (client as any).notes = notes;
    }
    
    clients.push(client);
  }
  
  return clients;
}