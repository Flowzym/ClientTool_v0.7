import { db } from '../data/db';

export interface HealthCheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  details: {
    indexedDB: boolean;
    database: boolean;
  };
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details = {
    indexedDB: false,
    database: false,
  };

  try {
    if (!window.indexedDB) {
      errors.push('IndexedDB ist nicht verfügbar. Die App benötigt IndexedDB für lokale Datenspeicherung.');
    } else {
      details.indexedDB = true;
    }
  } catch (err) {
    errors.push('Fehler beim Prüfen von IndexedDB: ' + (err as Error).message);
  }

  try {
    const count = await db.users.count();
    details.database = true;

    if (count === 0) {
      warnings.push('Keine Benutzer in Datenbank gefunden. Demo-User werden automatisch angelegt.');
    }
  } catch (err) {
    errors.push('Datenbank-Initialisierung fehlgeschlagen: ' + (err as Error).message);
    details.database = false;
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    details,
  };
}
