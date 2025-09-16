/**
 * Enhanced validation system for Importer V2
 * Comprehensive field validation with Austrian/German domain rules
 */

import type { InternalField, ValidationResult, ValidationIssue } from './types';

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

/**
 * Validates a single field value
 */
function validateField(
  field: InternalField,
  value: any,
  rowIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (value == null || String(value).trim() === '') {
    if (REQUIRED_FIELDS.includes(field)) {
      issues.push({
        type: 'error',
        row: rowIndex,
        field,
        message: `Pflichtfeld "${field}" ist leer`,
        value,
        suggestion: 'Wert eingeben oder Zeile überspringen'
      });
    }
    return issues;
  }
  
  const strValue = String(value).trim();
  
  // Field-specific validation
  switch (field) {
    case 'email':
      if (strValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: 'Ungültige E-Mail-Adresse',
          value: strValue,
          suggestion: 'Format: name@domain.com'
        });
      }
      break;
      
    case 'phone':
      // Austrian/German phone validation
      const phonePattern = /^(\+43|\+49|0)\s*\d{1,4}[\s\/-]*\d{3,}$/;
      if (strValue && !phonePattern.test(strValue.replace(/\s/g, ''))) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: 'Telefonnummer entspricht nicht österreichischem/deutschem Format',
          value: strValue,
          suggestion: 'Format: +43 1 234 5678 oder 01 234 5678'
        });
      }
      break;
      
    case 'zip':
      // Austrian (4 digits) or German (5 digits) postal codes
      if (strValue && !/^\d{4,5}$/.test(strValue)) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: 'Ungültige Postleitzahl',
          value: strValue,
          suggestion: 'Österreich: 4 Ziffern (1010), Deutschland: 5 Ziffern (10115)'
        });
      }
      break;
      
    case 'svNumber':
      // Austrian social security format: 1234 123456
      const svPattern = /^\d{4}\s?\d{6}$|^\d{10}$/;
      if (strValue && !svPattern.test(strValue.replace(/\s/g, ''))) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: 'Ungültige SV-Nummer',
          value: strValue,
          suggestion: 'Format: 1234 123456 oder 1234123456'
        });
      }
      break;
      
    case 'amsId':
      // AMS-ID format: A + 4-6 digits
      if (strValue && !/^A\d{4,6}$/i.test(strValue)) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: 'AMS-ID entspricht nicht dem erwarteten Format',
          value: strValue,
          suggestion: 'Format: A12345 (A + 4-6 Ziffern)'
        });
      }
      break;
      
    case 'birthDate':
    case 'amsBookingDate':
    case 'entryDate':
    case 'exitDate':
    case 'followUp':
    case 'lastActivity':
      // Date validation (multiple formats)
      const datePatterns = [
        /^\d{1,2}[.\/]\d{1,2}[.\/]\d{4}$/, // dd.mm.yyyy
        /^\d{4}-\d{2}-\d{2}$/, // yyyy-mm-dd
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO datetime
      ];
      
      const isValidDate = datePatterns.some(pattern => pattern.test(strValue)) ||
                         !isNaN(Date.parse(strValue));
      
      if (strValue && !isValidDate) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: 'Ungültiges Datumsformat',
          value: strValue,
          suggestion: 'Format: dd.mm.yyyy, yyyy-mm-dd oder ISO-Format'
        });
      }
      break;
      
    case 'status':
      const validStatuses = [
        'offen', 'inBearbeitung', 'terminVereinbart', 'wartetRueckmeldung',
        'dokumenteOffen', 'foerderAbklaerung', 'zugewiesenExtern', 'ruht',
        'erledigt', 'nichtErreichbar', 'abgebrochen'
      ];
      
      if (strValue && !validStatuses.includes(strValue)) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: 'Unbekannter Status-Wert',
          value: strValue,
          suggestion: `Erlaubte Werte: ${validStatuses.slice(0, 3).join(', ')}, ...`
        });
      }
      break;
      
    case 'priority':
      const validPriorities = ['niedrig', 'normal', 'hoch', 'dringend'];
      
      if (strValue && !validPriorities.includes(strValue)) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: 'Unbekannter Prioritäts-Wert',
          value: strValue,
          suggestion: `Erlaubte Werte: ${validPriorities.join(', ')}`
        });
      }
      break;
      
    case 'angebot':
      const validAngebote = ['BAM', 'LL/B+', 'BwB', 'NB'];
      
      if (strValue && !validAngebote.includes(strValue)) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: 'Unbekannter Angebot-Wert',
          value: strValue,
          suggestion: `Erlaubte Werte: ${validAngebote.join(', ')}`
        });
      }
      break;
      
    case 'firstName':
    case 'lastName':
      if (strValue.length < 2) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: 'Name ist sehr kurz',
          value: strValue,
          suggestion: 'Prüfen Sie, ob der Name vollständig ist'
        });
      }
      break;
  }
  
  return issues;
}

/**
 * Validates a complete row of mapped data
 */
export function validateRow(
  rowData: Record<InternalField, any>,
  rowIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Validate each field
  Object.entries(rowData).forEach(([field, value]) => {
    const fieldIssues = validateField(field as InternalField, value, rowIndex);
    issues.push(...fieldIssues);
  });
  
  // Cross-field validation
  
  // Check if both firstName and lastName are missing
  if (!rowData.firstName && !rowData.lastName) {
    issues.push({
      type: 'error',
      row: rowIndex,
      message: 'Weder Vor- noch Nachname vorhanden',
      suggestion: 'Mindestens ein Name ist erforderlich'
    });
  }
  
  // Check date consistency (entry before exit)
  if (rowData.entryDate && rowData.exitDate) {
    const entryTime = new Date(rowData.entryDate).getTime();
    const exitTime = new Date(rowData.exitDate).getTime();
    
    if (!isNaN(entryTime) && !isNaN(exitTime) && entryTime > exitTime) {
      issues.push({
        type: 'error',
        row: rowIndex,
        message: 'Eintrittsdatum liegt nach Austrittsdatum',
        suggestion: 'Prüfen Sie die Datumsangaben'
      });
    }
  }
  
  // Check follow-up date is in future (warning only)
  if (rowData.followUp) {
    const followUpTime = new Date(rowData.followUp).getTime();
    const now = Date.now();
    
    if (!isNaN(followUpTime) && followUpTime < now - (7 * 24 * 60 * 60 * 1000)) {
      issues.push({
        type: 'warning',
        row: rowIndex,
        field: 'followUp',
        message: 'Follow-up-Termin liegt mehr als eine Woche in der Vergangenheit',
        value: rowData.followUp,
        suggestion: 'Prüfen Sie, ob das Datum korrekt ist'
      });
    }
  }
  
  return issues;
}

/**
 * Validates a batch of rows
 */
export function validateBatch(
  rows: Array<Record<InternalField, any>>,
  onProgress?: (progress: number) => void
): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;
  
  rows.forEach((row, index) => {
    const rowIssues = validateRow(row, index + 1); // 1-based row numbers
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
    if (onProgress && (index + 1) % 100 === 0) {
      onProgress((index + 1) / rows.length);
    }
  });
  
  // Final progress report
  if (onProgress) {
    onProgress(1.0);
  }
  
  return {
    valid: errorRows === 0,
    issues: allIssues,
    stats: {
      totalRows: rows.length,
      validRows,
      errorRows,
      warningRows
    }
  };
}

/**
 * Suggests fixes for common validation issues
 */
export function suggestFixes(issues: ValidationIssue[]): Array<{
  type: 'bulk_fix' | 'mapping_change' | 'data_transform';
  description: string;
  affectedRows: number[];
  action: string;
}> {
  const suggestions: any[] = [];
  
  // Group issues by type and field
  const issueGroups = new Map<string, ValidationIssue[]>();
  
  issues.forEach(issue => {
    const key = `${issue.type}-${issue.field || 'general'}`;
    if (!issueGroups.has(key)) {
      issueGroups.set(key, []);
    }
    issueGroups.get(key)!.push(issue);
  });
  
  // Generate suggestions for common patterns
  issueGroups.forEach((groupIssues, key) => {
    if (groupIssues.length >= 3) { // Only suggest bulk fixes for 3+ occurrences
      const [type, field] = key.split('-');
      const affectedRows = groupIssues.map(issue => issue.row);
      
      if (field === 'email' && type === 'error') {
        suggestions.push({
          type: 'bulk_fix',
          description: 'E-Mail-Adressen automatisch korrigieren',
          affectedRows,
          action: 'Häufige Tippfehler reparieren (z.B. @ durch . ersetzt)'
        });
      }
      
      if (field === 'phone' && type === 'warning') {
        suggestions.push({
          type: 'data_transform',
          description: 'Telefonnummern normalisieren',
          affectedRows,
          action: 'Einheitliches Format anwenden (+43 1 234 5678)'
        });
      }
      
      if (field === 'birthDate' && type === 'error') {
        suggestions.push({
          type: 'data_transform',
          description: 'Datumsformat vereinheitlichen',
          affectedRows,
          action: 'Alle Daten zu dd.mm.yyyy Format konvertieren'
        });
      }
    }
  });
  
  return suggestions;
}

/**
 * Quick validation for single value
 */
export function quickValidate(field: InternalField, value: any): {
  valid: boolean;
  message?: string;
} {
  const issues = validateField(field, value, 0);
  const errors = issues.filter(issue => issue.type === 'error');
  
  return {
    valid: errors.length === 0,
    message: errors[0]?.message
  };
}