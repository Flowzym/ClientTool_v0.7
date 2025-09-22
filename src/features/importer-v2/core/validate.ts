/**
 * Enhanced validation system for Importer V2
 * Comprehensive field validation with Austrian/German domain rules
 */

import type { InternalField, ValidationResult, ValidationIssue } from './types';
import { validateFieldContent } from './detect';

// Required fields for client records
export const REQUIRED_FIELDS: InternalField[] = [
  'firstName',
  'lastName'
];

// Optional but recommended fields
export const RECOMMENDED_FIELDS: InternalField[] = [
  'amsId',
  'phone',
  'email',
  'status',
  'priority'
];

// Austrian/German specific validation patterns
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(\+43|0043|0)\s*\d{1,4}[\s\/-]*\d{3,4}[\s\/-]*\d{3,4}$|^\d{7,}$/,
  zip: /^\d{4,5}$/,
  svNumber: /^\d{4}\s?\d{6}$/,
  amsId: /^A\d{4,6}$/,
  date: /^\d{1,2}[.\/]\d{1,2}[.\/]\d{4}$|^\d{4}-\d{2}-\d{2}$/
};

// Valid enum values
const VALID_VALUES = {
  status: [
    'offen', 'inBearbeitung', 'terminVereinbart', 'wartetRueckmeldung',
    'dokumenteOffen', 'foerderAbklaerung', 'zugewiesenExtern', 'ruht',
    'erledigt', 'nichtErreichbar', 'abgebrochen'
  ],
  priority: ['niedrig', 'normal', 'hoch', 'dringend'],
  result: [
    'infogespraech', 'terminFixiert', 'nachrichtHinterlassen', 'rueckrufZugesagt',
    'keineReaktion', 'ablehnung', 'massnahmeBeendet', 'vermittelt', 'sonstiges',
    'bam', 'bewerbungsbuero', 'lebenslauf', 'mailaustausch',
    'gesundheitlicheMassnahme', 'uebergabeAnAMS', 'terminNichtEingehalten', 'keinInteresse'
  ],
  angebot: ['BAM', 'LL/B+', 'BwB', 'NB'],
  gender: ['M', 'F', 'D', 'm', 'f', 'd', 'männlich', 'weiblich', 'divers']
};

/**
 * Validates a single row of data
 */
export function validateRow(
  rowData: Record<InternalField, any>,
  rowIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const value = rowData[field];
    if (!value || (typeof value === 'string' && !value.trim())) {
      issues.push({
        type: 'error',
        row: rowIndex,
        field,
        message: `Pflichtfeld "${field}" ist leer`,
        value
      });
    }
  }

  // Validate field formats
  for (const [field, value] of Object.entries(rowData)) {
    if (!value || (typeof value === 'string' && !value.trim())) continue;

    const fieldKey = field as InternalField;
    const stringValue = String(value).trim();

    // Email validation
    if (fieldKey === 'email' && !VALIDATION_PATTERNS.email.test(stringValue)) {
      issues.push({
        type: 'error',
        row: rowIndex,
        field: fieldKey,
        message: 'Ungültige E-Mail-Adresse',
        value: stringValue,
        suggestion: 'Prüfen Sie das Format (z.B. name@domain.at)'
      });
    }

    // Phone validation
    if (fieldKey === 'phone' && !VALIDATION_PATTERNS.phone.test(stringValue)) {
      issues.push({
        type: 'warning',
        row: rowIndex,
        field: fieldKey,
        message: 'Telefonnummer entspricht nicht österreichischem Format',
        value: stringValue,
        suggestion: 'Erwartetes Format: +43 1 234 5678 oder 01 234 5678'
      });
    }

    // ZIP validation
    if (fieldKey === 'zip' && !VALIDATION_PATTERNS.zip.test(stringValue)) {
      issues.push({
        type: 'error',
        row: rowIndex,
        field: fieldKey,
        message: 'Ungültige Postleitzahl',
        value: stringValue,
        suggestion: 'Österreich: 4 Ziffern (z.B. 1010), Deutschland: 5 Ziffern'
      });
    }

    // SV number validation
    if (fieldKey === 'svNumber' && !VALIDATION_PATTERNS.svNumber.test(stringValue)) {
      issues.push({
        type: 'error',
        row: rowIndex,
        field: fieldKey,
        message: 'Ungültige SV-Nummer',
        value: stringValue,
        suggestion: 'Format: 1234 567890 oder 1234567890'
      });
    }

    // AMS ID validation
    if (fieldKey === 'amsId' && !VALIDATION_PATTERNS.amsId.test(stringValue)) {
      issues.push({
        type: 'error',
        row: rowIndex,
        field: fieldKey,
        message: 'Ungültige AMS-ID',
        value: stringValue,
        suggestion: 'Format: A + 4-6 Ziffern (z.B. A12345)'
      });
    }

    // Date validation
    const dateFields: InternalField[] = ['birthDate', 'entryDate', 'exitDate', 'amsBookingDate', 'followUp', 'lastActivity'];
    if (dateFields.includes(fieldKey) && !VALIDATION_PATTERNS.date.test(stringValue)) {
      issues.push({
        type: 'warning',
        row: rowIndex,
        field: fieldKey,
        message: 'Ungewöhnliches Datumsformat',
        value: stringValue,
        suggestion: 'Erwartetes Format: DD.MM.YYYY oder YYYY-MM-DD'
      });
    }

    // Enum validation
    if (fieldKey === 'status' && !VALID_VALUES.status.includes(stringValue)) {
      issues.push({
        type: 'warning',
        row: rowIndex,
        field: fieldKey,
        message: 'Unbekannter Status-Wert',
        value: stringValue,
        suggestion: `Gültige Werte: ${VALID_VALUES.status.join(', ')}`
      });
    }

    if (fieldKey === 'priority' && !VALID_VALUES.priority.includes(stringValue)) {
      issues.push({
        type: 'warning',
        row: rowIndex,
        field: fieldKey,
        message: 'Unbekannter Prioritäts-Wert',
        value: stringValue,
        suggestion: `Gültige Werte: ${VALID_VALUES.priority.join(', ')}`
      });
    }

    // Name length validation
    if ((fieldKey === 'firstName' || fieldKey === 'lastName') && stringValue.length < 2) {
      issues.push({
        type: 'warning',
        row: rowIndex,
        field: fieldKey,
        message: 'Name ist sehr kurz',
        value: stringValue,
        suggestion: 'Prüfen Sie, ob der Name vollständig ist'
      });
    }
  }

  // Cross-field validation
  const entryDate = rowData.entryDate;
  const exitDate = rowData.exitDate;
  if (entryDate && exitDate) {
    try {
      const entryTime = new Date(entryDate).getTime();
      const exitTime = new Date(exitDate).getTime();
      if (entryTime > exitTime) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field: 'entryDate',
          message: 'Eintrittsdatum liegt nach Austrittsdatum',
          value: entryDate,
          suggestion: 'Prüfen Sie die Datumsangaben'
        });
      }
    } catch {
      // Date parsing failed - already handled by date validation above
    }
  }

  // Follow-up date validation (should not be in the past)
  const followUp = rowData.followUp;
  if (followUp) {
    try {
      const followUpTime = new Date(followUp).getTime();
      const now = Date.now();
      if (followUpTime < now - 24 * 60 * 60 * 1000) { // More than 1 day ago
        issues.push({
          type: 'warning',
          row: rowIndex,
          field: 'followUp',
          message: 'Follow-up-Termin liegt in der Vergangenheit',
          value: followUp,
          suggestion: 'Prüfen Sie, ob das Datum korrekt ist'
        });
      }
    } catch {
      // Date parsing failed - already handled by date validation above
    }
  }

  // Name completeness validation
  const firstName = rowData.firstName;
  const lastName = rowData.lastName;
  if ((!firstName || !firstName.trim()) && (!lastName || !lastName.trim())) {
    issues.push({
      type: 'error',
      row: rowIndex,
      message: 'Weder Vor- noch Nachname vorhanden',
      suggestion: 'Mindestens ein Name ist erforderlich'
    });
  }

  return issues;
}

/**
 * Validates entire dataset with progress reporting
 */
export function validateBatch(
  data: Array<Record<InternalField, any>>,
  onProgress?: (progress: number) => void
): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;

  for (let i = 0; i < data.length; i++) {
    const rowIssues = validateRow(data[i], i + 1); // 1-based row numbers
    allIssues.push(...rowIssues);

    const hasErrors = rowIssues.some(issue => issue.type === 'error');
    const hasWarnings = rowIssues.some(issue => issue.type === 'warning');

    if (hasErrors) {
      errorRows++;
    } else if (hasWarnings) {
      warningRows++;
    } else {
      validRows++;
    }

    // Report progress
    if (onProgress && i % 100 === 0) {
      onProgress((i + 1) / data.length);
    }
  }

  if (onProgress) {
    onProgress(1.0);
  }

  return {
    valid: errorRows === 0,
    issues: allIssues,
    stats: {
      totalRows: data.length,
      validRows,
      errorRows,
      warningRows
    }
  };
}

/**
 * Quick validation for single field values
 */
export function quickValidate(
  field: InternalField,
  value: any
): { valid: boolean; message?: string } {
  if (!value || (typeof value === 'string' && !value.trim())) {
    if (REQUIRED_FIELDS.includes(field)) {
      return { valid: false, message: `${field} ist ein Pflichtfeld` };
    }
    return { valid: true };
  }

  const result = validateFieldContent(field, String(value));
  return {
    valid: result.valid,
    message: result.message
  };
}

/**
 * Provides validation suggestions based on issues
 */
export function suggestFixes(
  issues: ValidationIssue[]
): Array<{
  type: 'bulk_fix' | 'data_transform' | 'review_data' | 'ignore_warning';
  description: string;
  action?: string;
  affectedRows?: number[];
}> {
  const suggestions: any[] = [];
  
  // Group issues by type and field
  const issueGroups = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const key = `${issue.type}-${issue.field}`;
    if (!issueGroups.has(key)) {
      issueGroups.set(key, []);
    }
    issueGroups.get(key)!.push(issue);
  }

  // Suggest bulk fixes for common issues
  for (const [key, groupIssues] of issueGroups) {
    if (groupIssues.length >= 3) { // At least 3 occurrences
      const field = groupIssues[0].field;
      const type = groupIssues[0].type;

      if (field === 'email' && type === 'error') {
        suggestions.push({
          type: 'bulk_fix',
          description: `${groupIssues.length} E-Mail-Adressen reparieren`,
          action: 'Fehlende @ oder Domain-Endungen ergänzen',
          affectedRows: groupIssues.map(i => i.row)
        });
      }

      if (field === 'phone' && type === 'warning') {
        suggestions.push({
          type: 'data_transform',
          description: `${groupIssues.length} Telefonnummern normalisieren`,
          action: 'Österreichisches Format anwenden (+43 Vorwahl)',
          affectedRows: groupIssues.map(i => i.row)
        });
      }

      if (field === 'zip' && type === 'error') {
        suggestions.push({
          type: 'bulk_fix',
          description: `${groupIssues.length} Postleitzahlen korrigieren`,
          action: 'Führende Nullen ergänzen oder ungültige Zeichen entfernen',
          affectedRows: groupIssues.map(i => i.row)
        });
      }
    }
  }

  return suggestions;
}