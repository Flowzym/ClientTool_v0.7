import { safeParseToISO } from '../../utils/date/safeParseToISO';

const isDev = import.meta.env.DEV;

function devWarn(message: string, data?: any): void {
  if (isDev) {
    console.warn(`[validators] ${message}`, data);
  }
}

export type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] };

// Email regex (simple but effective)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone regex (international format, flexible)
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

// Valid enum values
const VALID_STATUS = ['offen', 'terminVereinbart', 'inBearbeitung', 'wartetRueckmeldung', 'erledigt', 'nichtErreichbar', 'abgebrochen'];
const VALID_PRIORITY = ['niedrig', 'normal', 'hoch', 'dringend'];
const VALID_ANGEBOT = ['BAM', 'LL/B+', 'BwB', 'NB'];
const VALID_RESULT = ['bam', 'lebenslauf', 'bewerbungsbuero', 'gesundheitlicheMassnahme', 'mailaustausch', 'keineReaktion'];

/**
 * Complete validation for import rows
 * - Validates required fields (firstName, lastName)
 * - Validates formats (email, phone)
 * - Validates enum values (status, priority, angebot, result)
 * - Validates date ranges (birthDate not in future)
 */
export function validateRow(row: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: firstName OR lastName OR name
  const firstName = String(row.firstName ?? '').trim();
  const lastName = String(row.lastName ?? '').trim();
  const name = String(row.name ?? '').trim();

  if (!firstName && !lastName && !name) {
    errors.push('Missing required field: firstName, lastName or name');
  }

  // Email format validation (if provided)
  const email = String(row.email ?? '').trim();
  if (email && !EMAIL_REGEX.test(email)) {
    warnings.push(`Invalid email format: ${email}`);
    devWarn('Invalid email format', { email, row: name || firstName || 'unknown' });
  }

  // Phone format validation (if provided)
  const phone = String(row.phone ?? '').trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    warnings.push(`Invalid phone format: ${phone}`);
    devWarn('Invalid phone format', { phone, row: name || firstName || 'unknown' });
  }

  // Status enum validation
  const status = (row as any).status;
  if (status && !VALID_STATUS.includes(status)) {
    warnings.push(`Invalid status value: ${status} (will default to 'offen')`);
    (row as any).status = 'offen';
  }

  // Priority enum validation
  const priority = (row as any).priority;
  if (priority && !VALID_PRIORITY.includes(priority)) {
    warnings.push(`Invalid priority value: ${priority} (will default to 'normal')`);
    (row as any).priority = 'normal';
  }

  // Angebot enum validation
  const angebot = (row as any).angebot;
  if (angebot && !VALID_ANGEBOT.includes(angebot)) {
    warnings.push(`Invalid angebot value: ${angebot}`);
    (row as any).angebot = null;
  }

  // Result enum validation
  const result = (row as any).result;
  if (result && !VALID_RESULT.includes(result)) {
    warnings.push(`Invalid result value: ${result}`);
    (row as any).result = null;
  }

  // Date validations
  const dateFields = ['birthDate', 'followUp', 'amsBookingDate', 'entryDate', 'exitDate'];
  dateFields.forEach(field => {
    const rawDate = (row as any)[field];
    if (rawDate != null && String(rawDate).trim()) {
      try {
        const iso = safeParseToISO(String(rawDate));
        if (iso) {
          (row as any)[field] = iso;

          // birthDate should not be in the future
          if (field === 'birthDate') {
            const birthDate = new Date(iso);
            const now = new Date();
            if (birthDate > now) {
              warnings.push(`Birth date is in the future: ${iso}`);
              devWarn('Future birth date detected', { birthDate: iso, row: name || firstName || 'unknown' });
            }
          }
        } else {
          warnings.push(`Could not parse ${field}: ${rawDate}`);
          devWarn(`${field} parse failed`, { input: rawDate, row: name || firstName || 'unknown' });
        }
      } catch {
        warnings.push(`Could not parse ${field}: ${rawDate}`);
        devWarn(`${field} parse exception`, { input: rawDate, row: name || firstName || 'unknown' });
      }
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}

export { dedupeImport } from './dedupe';
