import { db } from '../data/db';
import { cryptoManager } from '../data/crypto';
import { getEncryptionMode } from './env';

export interface HealthCheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  details: {
    indexedDB: boolean;
    crypto: boolean;
    encryptionMode: string;
    database: boolean;
  };
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details = {
    indexedDB: false,
    crypto: false,
    encryptionMode: 'unknown',
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
    details.encryptionMode = getEncryptionMode();

    if (details.encryptionMode === 'dev-enc' || details.encryptionMode === 'prod-enc') {
      try {
        await cryptoManager.getActiveKey();
        details.crypto = true;
      } catch (err) {
        const errMsg = (err as Error).message;
        if (errMsg.includes('DEV-Key')) {
          warnings.push('DEV-Key wird automatisch generiert. Vorherige Daten könnten nicht lesbar sein.');
        } else {
          errors.push('Crypto-Initialisierung fehlgeschlagen: ' + errMsg);
        }
      }
    } else {
      details.crypto = true;
    }
  } catch (err) {
    errors.push('Encryption-Mode-Prüfung fehlgeschlagen: ' + (err as Error).message);
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
