/**
 * Data transformation utilities for Importer V2
 * Handles normalization and conversion of imported data
 */

import type { InternalField } from './types';
import { mutationService } from '../../../services';

/**
 * Phone number parsing result
 */
export interface PhoneResult {
  countryDialCode?: string;
  areaDialCode?: string;
  phoneNumber?: string;
  phoneDisplay: string;
}

/**
 * Transform options for data processing
 */
export interface TransformOptions {
  dateFormat: 'auto' | 'dd.mm.yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy';
  phoneFormat: 'international' | 'national' | 'local';
  genderMapping: Record<string, string>;
  customFields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required?: boolean;
  }>;
}

/**
 * Internal record type (matches Client domain model)
 */
export interface InternalRecord {
  id?: string;
  amsId?: string;
  firstName: string;
  lastName: string;
  title?: string;
  gender?: string;
  birthDate?: string;
  svNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  zip?: string;
  city?: string;
  countryCode?: string;
  areaCode?: string;
  phoneNumber?: string;
  amsBookingDate?: string;
  entryDate?: string;
  exitDate?: string;
  amsAgentLastName?: string;
  amsAgentFirstName?: string;
  amsAdvisor?: string;
  note?: string;
  internalCode?: string;
  status?: string;
  priority?: string;
  result?: string;
  angebot?: string;
  followUp?: string;
  lastActivity?: string;
  assignedTo?: string;
  [key: string]: any;
}

/**
 * Validation result for transformed records
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Batch transform result
 */
export interface BatchTransformResult {
  successful: InternalRecord[];
  failed: Array<{
    rowIndex: number;
    data: any[];
    errors: string[];
  }>;
  stats: {
    total: number;
    successful: number;
    failed: number;
    processingTime: number;
  };
}

/**
 * Build normalized phone number from various input formats
 */
export function buildPhone(input: string | { country?: string; area?: string; number?: string }): PhoneResult {
  if (!input) {
    return { phoneDisplay: '' };
  }

  // Handle object input
  if (typeof input === 'object') {
    const { country, area, number } = input;
    const display = [country, area, number].filter(Boolean).join(' ');
    return {
      countryDialCode: country,
      areaDialCode: area,
      phoneNumber: number,
      phoneDisplay: display
    };
  }

  const phone = input.toString().trim();
  if (!phone) {
    return { phoneDisplay: '' };
  }

  // Austrian phone number patterns
  const patterns = [
    // International format: +43 1 234 5678 or +43 664 123 4567
    /^\+(\d{1,3})\s*(\d{1,4})\s*(.+)$/,
    // National format: 01 234 5678 or 0664 123 4567
    /^0(\d{1,4})\s*(.+)$/,
    // Local format: 234 5678
    /^(\d{3,4})\s*(.+)$/
  ];

  for (const pattern of patterns) {
    const match = phone.match(pattern);
    if (match) {
      if (phone.startsWith('+')) {
        // International format
        return {
          countryDialCode: `+${match[1]}`,
          areaDialCode: match[2],
          phoneNumber: match[3],
          phoneDisplay: phone
        };
      } else if (phone.startsWith('0')) {
        // National format - assume Austrian
        return {
          countryDialCode: '+43',
          areaDialCode: match[1],
          phoneNumber: match[2],
          phoneDisplay: phone
        };
      } else {
        // Local format - assume US/international
        return {
          countryDialCode: '+1',
          areaDialCode: match[1],
          phoneNumber: match[2],
          phoneDisplay: phone
        };
      }
    }
  }

  // Fallback: return as-is
  return { phoneDisplay: phone };
}

/**
 * Parse date from various formats and return ISO string
 */
export function parseDate(value: any, options: { format?: string } = {}): string | null {
  if (!value) return null;

  const dateStr = value.toString().trim();
  if (!dateStr) return null;

  try {
    let date: Date;

    // Try German format first (dd.mm.yyyy or d.m.yyyy)
    const germanMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (germanMatch) {
      const [, day, month, year] = germanMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Try ISO format
    else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      date = new Date(dateStr);
    }
    // Try US format (mm/dd/yyyy)
    else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      date = new Date(dateStr);
    }
    // Fallback to Date constructor
    else {
      date = new Date(dateStr);
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Normalize gender values to standard format
 */
export function normalizeGender(value: any): string | null {
  if (!value) return null;

  const gender = value.toString().toLowerCase().trim();
  
  // Male variants
  if (['m', 'male', 'mann', 'männlich', 'maennlich', '1'].includes(gender)) {
    return 'M';
  }
  
  // Female variants
  if (['f', 'w', 'female', 'frau', 'weiblich', '2'].includes(gender)) {
    return 'F';
  }
  
  // Diverse variants
  if (['d', 'diverse', 'divers', 'other', 'x', '3'].includes(gender)) {
    return 'D';
  }
  
  // Unknown/empty
  if (['unknown', 'unbekannt', '', '-', 'n/a'].includes(gender)) {
    return null;
  }
  
  // Return as-is for custom values
  return null;
}

/**
 * Normalize booking status values
 */
export function normalizeBookingStatus(value: any): string {
  if (!value) return '';

  const status = value.toString().trim();
  const normalized = status.toLowerCase();

  // Known status mappings
  const statusMap: Record<string, string> = {
    'offen': 'offen',
    'open': 'offen',
    'gebucht': 'gebucht',
    'booked': 'gebucht',
    'reserviert': 'gebucht',
    'reserved': 'gebucht',
    'abgeschlossen': 'abgeschlossen',
    'completed': 'abgeschlossen',
    'finished': 'abgeschlossen',
    'beendet': 'abgeschlossen',
    'storniert': 'storniert',
    'cancelled': 'storniert',
    'canceled': 'storniert',
    'abgebrochen': 'storniert'
  };

  return statusMap[normalized] || status;
}

/**
 * Apply field mapping to a data row
 */
export function applyMapping(
  row: any[],
  headers: string[],
  mapping: Map<string, InternalField>,
  options: TransformOptions
): Partial<InternalRecord> {
  const record: Partial<InternalRecord> = {};

  // Process each column
  headers.forEach((header, index) => {
    const field = mapping.get(header);
    const value = row[index];

    if (!field || value === undefined || value === null || value === '') {
      return;
    }

    const stringValue = value.toString().trim();
    if (!stringValue) return;

    // Apply field-specific transformations
    switch (field) {
      case 'birthDate': {
      }
      case 'entryDate':
      case 'exitDate':
      case 'amsBookingDate':
      case 'followUp':
      case 'lastActivity': {
        record[field] = parseDate(stringValue, { format: options.dateFormat });
        break;
      }
      case 'phone': {
        const phoneResult = buildPhone(stringValue);
        record.phone = phoneResult.phoneDisplay;
        record.countryCode = phoneResult.countryDialCode;
        record.areaCode = phoneResult.areaDialCode;
        record.phoneNumber = phoneResult.phoneNumber;
        break;
      }
      case 'gender': {
        record.gender = normalizeGender(stringValue);
        break;
      }
      case 'email': {
        // Basic email validation and normalization
        const email = stringValue.toLowerCase();
        if (email.includes('@') && email.includes('.')) {
          record.email = email;
        }
        break;
      }
      case 'zip': {
        // Ensure ZIP is string and remove leading zeros for Austrian format
        const zip = stringValue.replace(/^0+/, '') || '0';
        record.zip = zip.length >= 4 ? zip : stringValue;
        break;
      }
      case 'svNumber': {
        // Format SV number (remove spaces, ensure correct format)
        const svNumber = stringValue.replace(/\s/g, '');
        if (svNumber.match(/^\d{10}$/)) {
          record.svNumber = svNumber;
        }
        break;
      }
      default:
        // Direct assignment for other fields
        record[field] = stringValue;
        break;
    }
  });

  // Handle custom fields
  options.customFields.forEach(customField => {
    const headerIndex = headers.findIndex(h => h === customField.name);
    if (headerIndex >= 0 && row[headerIndex] !== undefined) {
      const value = row[headerIndex];

      switch (customField.type) {
        case 'number': {
          const num = parseFloat(value.toString());
          if (!isNaN(num)) {
            (record as any)[customField.name] = num;
          }
          break;
        }
        case 'boolean': {
          const boolValue = value.toString().toLowerCase();
          (record as any)[customField.name] = ['true', '1', 'yes', 'ja', 'y'].includes(boolValue);
          break;
        }
        case 'date': {
          (record as any)[customField.name] = parseDate(value);
          break;
        }
        default: {
          (record as any)[customField.name] = value.toString();
          break;
        }
      }
    }
  });

  // Auto-copy 'planned' field to 'followUp' if followUp is not set
  const plannedIndex = headers.findIndex(h =>
    h.toLowerCase().includes('geplant') ||
    h.toLowerCase() === 'planned'
  );
  if (plannedIndex >= 0 && row[plannedIndex] && !record.followUp) {
    const plannedValue = row[plannedIndex];
    const parsedDate = parseDate(plannedValue);
    if (parsedDate) {
      record.followUp = parsedDate;
    }
  }

  return record;
}

/**
 * Validate a transformed record
 */
export function validateTransformedRecord(
  record: Partial<InternalRecord>,
  requiredFields: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  requiredFields.forEach(field => {
    const value = (record as any)[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`${field} ist erforderlich`);
    }
  });

  // Validate email format
  if (record.email && !record.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push('email hat ungültiges Format');
  }

  // Validate SV number format (Austrian)
  if (record.svNumber && !record.svNumber.match(/^\d{10}$/)) {
    warnings.push('svNumber hat ungewöhnliches Format');
  }

  // Validate ZIP code (Austrian)
  if (record.zip && !record.zip.match(/^\d{4}$/)) {
    warnings.push('zip sollte 4-stellig sein (österreichisches Format)');
  }

  // Validate phone number
  if (record.phone && !record.phone.match(/[\d\s\+\-\(\)]/)) {
    warnings.push('phone enthält ungewöhnliche Zeichen');
  }

  // Validate dates
  const dateFields = ['birthDate', 'entryDate', 'exitDate', 'amsBookingDate'] as const;
  dateFields.forEach(field => {
    const dateValue = record[field];
    if (dateValue && !dateValue.match(/^\d{4}-\d{2}-\d{2}T/)) {
      errors.push(`${field} hat ungültiges Datumsformat`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Transform data in batches with progress reporting
 */
export async function batchTransform(
  rows: any[][],
  headers: string[],
  mapping: Map<string, InternalField>,
  options: TransformOptions,
  requiredFields: string[],
  onProgress?: (progress: { processed: number; total: number; current?: any }) => void,
  batchSize: number = 200
): Promise<BatchTransformResult> {
  const startTime = Date.now();
  const successful: InternalRecord[] = [];
  const failed: Array<{ rowIndex: number; data: any[]; errors: string[] }> = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j;
      const row = batch[j];
      
      try {
        // Transform the row
        const transformed = applyMapping(row, headers, mapping, options);
        
        // Validate the result
        const validation = validateTransformedRecord(transformed, requiredFields);
        
        if (validation.isValid) {
          successful.push(transformed as InternalRecord);
        } else {
          failed.push({
            rowIndex,
            data: row,
            errors: validation.errors
          });
        }
      } catch (error) {
        failed.push({
          rowIndex,
          data: row,
          errors: [`Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
      
      // Report progress
      if (onProgress) {
        onProgress({
          processed: rowIndex + 1,
          total: rows.length,
          current: row
        });
      }
    }
    
    // Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const processingTime = Date.now() - startTime;

  return {
    successful,
    failed,
    stats: {
      total: rows.length,
      successful: successful.length,
      failed: failed.length,
      processingTime
    }
  };
}

/**
 * Create a summary of transformation results
 */
export function createTransformSummary(result: BatchTransformResult): string {
  const { stats, failed } = result;
  
  let summary = `Transformation abgeschlossen:\n`;
  summary += `• ${stats.successful} Datensätze erfolgreich verarbeitet\n`;
  summary += `• ${stats.failed} Datensätze mit Fehlern\n`;
  summary += `• Verarbeitungszeit: ${(stats.processingTime / 1000).toFixed(1)}s\n`;
  
  if (failed.length > 0) {
    summary += `\nFehlerhafte Zeilen:\n`;
    failed.slice(0, 5).forEach(error => {
      summary += `• Zeile ${error.rowIndex + 1}: ${error.errors.join(', ')}\n`;
    });
    
    if (failed.length > 5) {
      summary += `• ... und ${failed.length - 5} weitere Fehler\n`;
    }
  }
  
  return summary;
}

/**
 * Adapter function to import records via existing service layer
 * Integrates with MutationService for database persistence
 */
export async function importRecordsViaService(
  records: InternalRecord[],
  onProgress?: (progress: { processed: number; total: number }) => void
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  const BATCH_SIZE = 100;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const result = await mutationService.createClients(batch);

      if (result.success) {
        imported += batch.length;
      } else {
        batch.forEach((record, batchIndex) => {
          const recordIndex = i + batchIndex;
          errors.push(`Record ${recordIndex + 1} (${record.firstName} ${record.lastName}): ${result.error || 'Import failed'}`);
        });
      }

      if (onProgress) {
        onProgress({ processed: Math.min(i + BATCH_SIZE, records.length), total: records.length });
      }

      await new Promise(resolve => setTimeout(resolve, 0));

    } catch (error) {
      batch.forEach((record, batchIndex) => {
        const recordIndex = i + batchIndex;
        errors.push(`Record ${recordIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    }
  }

  console.log(`✅ Import completed: ${imported}/${records.length} records successfully imported`);

  return {
    success: errors.length === 0,
    imported,
    errors
  };
}