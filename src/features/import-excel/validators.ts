/**
 * Validierung für Import-Daten
 */
import { parseToISO } from '../../utils/date';
import { normalize, normalizePriority, normalizeStatus, normalizeResult, trimToNull } from '../../utils/normalize';
import type { Priority, Status } from '../../domain/models';
import type { ImportRawRow, ImportMappedRow } from './types';

const toISOIfFilled = (value: unknown): string | undefined => {
  const s = value == null ? '' : String(value).trim();
  if (!s) return undefined;               // leer => kein Throw, Feld bleibt undefined
  try {
    return parseToISO(s);                  // nur bei nicht-leer parsen
  } catch (err) {
    return undefined;                      // ungültiges Datum => undefined
  }
};

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_PRIORITIES: Priority[] = ['niedrig', 'normal', 'hoch', 'dringend'];
const VALID_STATUSES: Status[] = [
  'offen','inBearbeitung','terminVereinbart','wartetRueckmeldung','dokumenteOffen','foerderAbklaerung','zugewiesenExtern','ruht','erledigt','nichtErreichbar','abgebrochen'
];

export function validateRow(row: ImportRawRow): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Pflichtfelder (mindestens irgendeine Form von Identifikation)
  const fn = trimToNull((row as any).firstName);
  const ln = trimToNull((row as any).lastName);
  const amsId = trimToNull((row as any).amsId);

  if (!amsId && !(fn && ln)) {
    errors.push('Fehlende Identifikation (AMS-ID oder Vor- und Nachname)');
  }

  // Datum Felder robust parsen
  const birth = toISOIfFilled((row as any).birthDate);
  if ((row as any).birthDate && !birth) warnings.push('Geburtsdatum unverständlich – übernommen als Rohtext');

  const follow = toISOIfFilled((row as any).followUp);
  if ((row as any).followUp && !follow) warnings.push('Follow-up Datum unverständlich – übernommen als Rohtext');

  // Priorität/Status/Ergebnis normalisieren
  const prio = normalizePriority((row as any).priority);
  if (!VALID_PRIORITIES.includes(prio)) errors.push(`Ungültige Priorität: ${row.priority ?? ''}`);

  const status = normalizeStatus((row as any).status);
  if (!VALID_STATUSES.includes(status)) errors.push(`Ungültiger Status: ${row.status ?? ''}`);

  // Ergebnis ist weicher – normalisieren, keine harte Fehlerbedingung
  normalizeResult((row as any).result);

  // E-Mail/Telefon einfache Plausis
  if ((row as any).email && !/.+@.+\..+/.test(String((row as any).email))) warnings.push('E-Mail wirkt ungültig');
  if ((row as any).phone && String((row as any).phone).replace(/\D/g, '').length < 6) warnings.push('Telefonnummer sehr kurz');

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Deduplizierung innerhalb der Importdaten (nur gleiche Quelle)
 * Findet Duplikate per AMS-ID oder (normalized name + birthdate)
 */
export function dedupeImport(rows: ImportRawRow[]): { duplicates: Array<{indices: number[]; key: string; reason: string}> } {
  const seen = new Map<string, number[]>();
  const duplicates: Array<{indices: number[]; key: string; reason: string}> = [];

  rows.forEach((row, i) => {
    let key: string | null = null;
    if (row.amsId?.trim()) {
      key = `ams:${row.amsId.trim().toUpperCase()}`;
    } else if (row.firstName && row.lastName && row.birthDate) {
      key = `name:${normalize(row.firstName)}-${normalize(row.lastName)}-${parseToISO(row.birthDate) ?? row.birthDate}`;
    }
    if (!key) return;
    const arr = seen.get(key) ?? [];
    arr.push(i);
    seen.set(key, arr);
  });

  // Duplikate sammeln
  seen.forEach((indices, key) => {
    if (indices.length > 1) {
      duplicates.push({
        indices,
        key,
        reason: key.startsWith('name:') ? 'Name + Geburtsdatum' : 'AMS-ID'
      });
    }
  });

  return { duplicates };
}
