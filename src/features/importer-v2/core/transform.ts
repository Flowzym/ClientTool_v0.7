/**
 * Data transformation utilities for Importer V2
 * Converts raw mapped data to normalized internal records
 */

import type { InternalField } from './types';
import { safeParseToISO } from '../../../utils/date/safeParseToISO';
import { normalizeStatus, normalizePriority } from '../../../utils/normalize';

export interface PhoneComponents {
  countryDialCode?: string;
  areaDialCode?: string;
  phoneNumber?: string;
  phoneDisplay: string;
}

export interface TransformOptions {
  dateFormat?: 'auto' | 'dd.mm.yyyy' | 'yyyy-mm-dd';
  phoneFormat?: 'split' | 'combined';
  genderMapping?: Record<string, 'M' | 'F' | 'D'>;
  addressFormat?: 'combined' | 'split';
  strictValidation?: boolean;
}

export interface InternalRecord {
  [key: string]: any;
  // Core fields that should always be present
  firstName?: string;
  lastName?: string;
  amsId?: string;
  status?: string;
  priority?: string;
}

/**
 * Builds phone components from various input formats
 */
export function buildPhone(input: string | { country?: string; area?: string; number?: string }): PhoneComponents {
  if (typeof input === 'object' && input !== null) {
    const { country, area, number } = input;
    const display = [country, area, number].filter(Boolean).join(' ');
    return {
      countryDialCode: country,
      areaDialCode: area,
      phoneNumber: number,
      phoneDisplay: display
    };
  }

  const phoneStr = String(input || '').trim();
  if (!phoneStr) {
    return { phoneDisplay: '' };
  }

  // Austrian/German phone number patterns
  const patterns = [
    // +43 1 234 5678 (Austrian landline)
    /^(\+43|0043)\s*(\d{1,4})\s*(\d{3,4})\s*(\d{3,4})$/,
    // +43 664 123 4567 (Austrian mobile)
    /^(\+43|0043)\s*(\d{3})\s*(\d{3})\s*(\d{4})$/,
    // 01 234 5678 (Local Austrian)
    /^0(\d{1,4})\s*(\d{3,4})\s*(\d{3,4})$/,
    // International format
    /^(\+\d{1,3})\s*(\d{1,4})\s*(.+)$/
  ];

  for (const pattern of patterns) {
    const match = phoneStr.match(pattern);
    if (match) {
      const [, country, area, ...rest] = match;
      return {
        countryDialCode: country?.startsWith('+') ? country : `+${country}`,
        areaDialCode: area,
        phoneNumber: rest.join(' '),
        phoneDisplay: phoneStr
      };
    }
  }

  // Fallback: return as-is
  return { phoneDisplay: phoneStr };
}

/**
 * Parses date with various format options
 */
export function parseDate(value: any, opts: TransformOptions = {}): string | null {
  if (!value) return null;

  const { dateFormat = 'auto' } = opts;
  
  try {
    // Use existing safe parser
    const result = safeParseToISO(value);
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Normalizes gender values to standard format
 */
export function normalizeGender(value: any): 'M' | 'F' | 'D' | null {
  if (!value) return null;

  const str = String(value).toLowerCase().trim();
  
  const maleVariants = ['m', 'male', 'mann', 'männlich', 'maennlich', 'herr'];
  const femaleVariants = ['f', 'w', 'female', 'frau', 'weiblich', 'dame'];
  const diverseVariants = ['d', 'diverse', 'divers', 'other', 'x', 'non-binary'];

  if (maleVariants.includes(str)) return 'M';
  if (femaleVariants.includes(str)) return 'F';
  if (diverseVariants.includes(str)) return 'D';

  return null;
}

/**
 * Normalizes booking status with enum + freetext support
 */
export function normalizeBookingStatus(value: any): string {
  if (!value) return 'offen';

  const str = String(value).trim();
  
  // Use existing status normalizer
  return normalizeStatus(str);
}

/**
 * Applies column mapping to raw row data
 */
export function applyMapping(
  rawRow: Record<string, any>,
  mapping: Record<string, InternalField>,
  options: TransformOptions = {}
): InternalRecord {
  const record: InternalRecord = {};
  const errors: string[] = [];

  // Apply mapped fields
  for (const [columnIndex, field] of Object.entries(mapping)) {
    const rawValue = rawRow[columnIndex];
    if (rawValue == null || rawValue === '') continue;

    try {
      switch (field) {
        case 'firstName':
        case 'lastName':
        case 'title':
        case 'amsId':
        case 'note':
        case 'internalCode':
        case 'address':
        case 'city':
        case 'svNumber':
          record[field] = String(rawValue).trim();
          break;

        case 'phone':
          const phoneComponents = buildPhone(rawValue);
          record.phone = phoneComponents.phoneDisplay;
          if (options.phoneFormat === 'split') {
            record.countryCode = phoneComponents.countryDialCode;
            record.areaCode = phoneComponents.areaDialCode;
            record.phoneNumber = phoneComponents.phoneNumber;
          }
          break;

        case 'email':
          const email = String(rawValue).trim().toLowerCase();
          if (email.includes('@')) {
            record.email = email;
          }
          break;

        case 'gender':
          record.gender = normalizeGender(rawValue);
          break;

        case 'zip':
          const zip = String(rawValue).trim();
          if (/^\d{4,5}$/.test(zip)) {
            record.zip = zip;
          }
          break;

        case 'birthDate':
        case 'entryDate':
        case 'exitDate':
        case 'amsBookingDate':
        case 'followUp':
        case 'lastActivity':
          const dateResult = parseDate(rawValue, options);
          if (dateResult) {
            record[field] = dateResult;
          }
          break;

        case 'status':
          record.status = normalizeBookingStatus(rawValue);
          break;

        case 'priority':
          record.priority = normalizePriority(rawValue);
          break;

        case 'assignedTo':
        case 'result':
        case 'angebot':
          record[field] = String(rawValue).trim();
          break;

        default:
          // Custom fields or unknown fields
          record[field] = rawValue;
          break;
      }
    } catch (error) {
      errors.push(`Field ${field}: ${error instanceof Error ? error.message : 'Transform error'}`);
    }
  }

  // Apply defaults for required fields
  if (!record.firstName && !record.lastName) {
    record.firstName = 'Unbekannt';
    record.lastName = 'Unbekannt';
  }

  if (!record.status) {
    record.status = 'offen';
  }

  if (!record.priority) {
    record.priority = 'normal';
  }

  if (!record.contactCount) {
    record.contactCount = 0;
  }

  if (!record.contactLog) {
    record.contactLog = [];
  }

  if (record.isArchived === undefined) {
    record.isArchived = false;
  }

  // Add transform metadata
  (record as any).__transformErrors = errors;
  (record as any).__transformedAt = new Date().toISOString();

  return record;
}

/**
 * Validates transformed record for completeness
 */
export function validateTransformedRecord(record: InternalRecord): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!record.firstName && !record.lastName) {
    errors.push('Weder Vor- noch Nachname vorhanden');
  }

  // Email validation
  if (record.email && !record.email.includes('@')) {
    errors.push('Ungültige E-Mail-Adresse');
  }

  // Phone validation
  if (record.phone && record.phone.length < 5) {
    warnings.push('Telefonnummer sehr kurz');
  }

  // Date validation
  const dateFields = ['birthDate', 'entryDate', 'exitDate', 'amsBookingDate', 'followUp'];
  for (const field of dateFields) {
    if (record[field] && !record[field].match(/^\d{4}-\d{2}-\d{2}T/)) {
      warnings.push(`${field}: Ungewöhnliches Datumsformat`);
    }
  }

  // Transform errors
  if ((record as any).__transformErrors?.length > 0) {
    warnings.push(...(record as any).__transformErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Batch transforms raw rows to internal records
 */
export function batchTransform(
  rawRows: Record<string, any>[],
  mapping: Record<string, InternalField>,
  options: TransformOptions = {},
  onProgress?: (progress: number, current: number, total: number) => void
): {
  records: InternalRecord[];
  errors: Array<{ row: number; errors: string[]; warnings: string[] }>;
  stats: { total: number; valid: number; warnings: number; errors: number };
} {
  const records: InternalRecord[] = [];
  const errors: Array<{ row: number; errors: string[]; warnings: string[] }> = [];
  const stats = { total: rawRows.length, valid: 0, warnings: 0, errors: 0 };

  for (let i = 0; i < rawRows.length; i++) {
    try {
      const record = applyMapping(rawRows[i], mapping, options);
      const validation = validateTransformedRecord(record);

      records.push(record);

      if (validation.valid) {
        stats.valid++;
      } else {
        stats.errors++;
      }

      if (validation.warnings.length > 0) {
        stats.warnings++;
      }

      if (!validation.valid || validation.warnings.length > 0) {
        errors.push({
          row: i + 1,
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Report progress
      if (onProgress && i % 50 === 0) {
        onProgress((i + 1) / rawRows.length, i + 1, rawRows.length);
      }
    } catch (error) {
      stats.errors++;
      errors.push({
        row: i + 1,
        errors: [error instanceof Error ? error.message : 'Unbekannter Transform-Fehler'],
        warnings: []
      });
    }
  }

  if (onProgress) {
    onProgress(1.0, rawRows.length, rawRows.length);
  }

  return { records, errors, stats };
}