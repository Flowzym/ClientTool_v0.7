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

// Austrian/German specific validation rules
const VALIDATION_RULES = {
  svNumber: {
    pattern: /^\d{4}\s?\d{6}$/,
    message: 'SV-Nummer muss Format "1234 123456" haben'
  },
  amsId: {
    pattern: /^(AMS|ams)[-_]?\d{6,10}$/i,
    message: 'AMS-ID muss Format "AMS123456" haben'
  },
  zip: {
    pattern: /^([1-9]\d{3}|\d{5})$/,
    message: 'Postleitzahl muss 4-5 Ziffern haben'
  },
  phone: {
    pattern: /^(\+43|\+49|0043|0049|0)\s?[\d\s\-\/\(\)]{6,15}$/,
    message: 'Telefonnummer muss österreichisches/deutsches Format haben'
  },
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'E-Mail-Adresse ist ungültig'
  },
  date: {
    pattern: /^(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}|\d{4}[\.\/\-]\d{1,2}[\.\/\-]\d{1,2})$/,
    message: 'Datum muss Format DD.MM.YYYY oder YYYY-MM-DD haben'
  }
};

/**
 * Validates a single field value
 */
export function validateField(
  field: InternalField,
  value: any,
  rowIndex: number,
  allRowData?: Record<string, any>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Convert to string and trim
  const stringValue = value?.toString()?.trim() || '';
  
  // Check if required field is empty
  if (REQUIRED_FIELDS.includes(field) && !stringValue) {
    issues.push({
      type: 'error',
      row: rowIndex,
      field,
      message: `Pflichtfeld "${field}" ist leer`,
      value,
      suggestion: 'Wert eingeben oder Zeile entfernen'
    });
    return issues;
  }
  
  // Skip validation for empty optional fields
  if (!stringValue) {
    return issues;
  }
  
  // Field-specific validation
  switch (field) {
    case 'svNumber':
      if (!VALIDATION_RULES.svNumber.pattern.test(stringValue)) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: VALIDATION_RULES.svNumber.message,
          value,
          suggestion: 'Format: 1234 123456 (4 Ziffern, Leerzeichen, 6 Ziffern)'
        });
      }
      break;
      
    case 'amsId':
      if (!VALIDATION_RULES.amsId.pattern.test(stringValue)) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: VALIDATION_RULES.amsId.message,
          value,
          suggestion: 'Format: AMS123456 oder ams-123456'
        });
      }
      break;
      
    case 'zip':
      if (!VALIDATION_RULES.zip.pattern.test(stringValue)) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: VALIDATION_RULES.zip.message,
          value,
          suggestion: 'Österreich: 4 Ziffern (1000-9999), Deutschland: 5 Ziffern'
        });
      }
      break;
      
    case 'phone':
      if (!VALIDATION_RULES.phone.pattern.test(stringValue)) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: VALIDATION_RULES.phone.message,
          value,
          suggestion: 'Format: +43 123 456789 oder 0123 456789'
        });
      }
      break;
      
    case 'email':
      if (!VALIDATION_RULES.email.pattern.test(stringValue)) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: VALIDATION_RULES.email.message,
          value,
          suggestion: 'Format: name@domain.at'
        });
      }
      break;
      
    case 'birthDate':
    case 'entryDate':
    case 'exitDate':
    case 'amsBookingDate':
    case 'lastActivity':
      if (!VALIDATION_RULES.date.pattern.test(stringValue)) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: VALIDATION_RULES.date.message,
          value,
          suggestion: 'Format: 01.01.1990 oder 1990-01-01'
        });
      } else {
        // Additional date logic validation
        const dateIssue = validateDateLogic(field, stringValue, rowIndex, allRowData);
        if (dateIssue) {
          issues.push(dateIssue);
        }
      }
      break;
      
    case 'firstName':
    case 'lastName':
      if (stringValue.length < 2) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: `${field === 'firstName' ? 'Vorname' : 'Nachname'} ist sehr kurz`,
          value,
          suggestion: 'Vollständigen Namen eingeben'
        });
      }
      
      // Check for suspicious patterns
      if (/^\d+$/.test(stringValue)) {
        issues.push({
          type: 'error',
          row: rowIndex,
          field,
          message: `${field === 'firstName' ? 'Vorname' : 'Nachname'} darf nicht nur aus Zahlen bestehen`,
          value,
          suggestion: 'Namen korrigieren'
        });
      }
      break;
      
    case 'gender':
      const validGenders = ['m', 'w', 'd', 'männlich', 'weiblich', 'divers', 'male', 'female', 'diverse'];
      if (!validGenders.includes(stringValue.toLowerCase())) {
        issues.push({
          type: 'warning',
          row: rowIndex,
          field,
          message: 'Unbekannter Geschlechtswert',
          value,
          suggestion: 'Verwenden Sie: m, w, d oder männlich, weiblich, divers'
        });
      }
      break;
      
    case 'status':
      // Validate against common status values
      const validStatuses = ['aktiv', 'inaktiv', 'beendet', 'pausiert', 'offen', 'geschlossen'];
      if (!validStatuses.some(status => stringValue.toLowerCase().includes(status))) {
        issues.push({
          type: 'info',
          row: rowIndex,
          field,
          message: 'Ungewöhnlicher Status-Wert',
          value,
          suggestion: 'Prüfen Sie, ob der Status korrekt ist'
        });
      }
      break;
      
    case 'priority':
      // Validate priority values
      const validPriorities = ['hoch', 'mittel', 'niedrig', 'high', 'medium', 'low', '1', '2', '3', '4', '5'];
      if (!validPriorities.includes(stringValue.toLowerCase())) {
        issues.push({
          type: 'info',
          row: rowIndex,
          field,
          message: 'Ungewöhnlicher Prioritätswert',
          value,
          suggestion: 'Verwenden Sie: hoch, mittel, niedrig oder 1-5'
        });
      }
      break;
  }
  
  return issues;
}

/**
 * Validates date logic (e.g., birth date not in future, exit after entry)
 */
function validateDateLogic(
  field: InternalField,
  dateValue: string,
  rowIndex: number,
  allRowData?: Record<string, any>
): ValidationIssue | null {
  try {
    // Parse date (simplified - would need proper date parsing in production)
    const parsedDate = new Date(dateValue.replace(/\./g, '/'));
    const now = new Date();
    
    switch (field) {
      case 'birthDate':
        if (parsedDate > now) {
          return {
            type: 'error',
            row: rowIndex,
            field,
            message: 'Geburtsdatum liegt in der Zukunft',
            value: dateValue,
            suggestion: 'Datum korrigieren'
          };
        }
        
        // Check if person would be too old (>120 years)
        const age = now.getFullYear() - parsedDate.getFullYear();
        if (age > 120) {
          return {
            type: 'warning',
            row: rowIndex,
            field,
            message: 'Person wäre über 120 Jahre alt',
            value: dateValue,
            suggestion: 'Geburtsdatum prüfen'
          };
        }
        
        // Check if person would be too young (<14 years for AMS)
        if (age < 14) {
          return {
            type: 'warning',
            row: rowIndex,
            field,
            message: 'Person ist unter 14 Jahre alt',
            value: dateValue,
            suggestion: 'Geburtsdatum prüfen (AMS-Mindestalter)'
          };
        }
        break;
        
      case 'entryDate':
      case 'amsBookingDate':
        // Entry dates shouldn't be too far in the future
        const monthsInFuture = (parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsInFuture > 6) {
          return {
            type: 'warning',
            row: rowIndex,
            field,
            message: 'Eintrittsdatum liegt weit in der Zukunft',
            value: dateValue,
            suggestion: 'Datum prüfen'
          };
        }
        break;
        
      case 'exitDate':
        // Exit date should be after entry date if both are present
        if (allRowData?.entryDate) {
          const entryDate = new Date(allRowData.entryDate.replace(/\./g, '/'));
          if (parsedDate < entryDate) {
            return {
              type: 'error',
              row: rowIndex,
              field,
              message: 'Austrittsdatum liegt vor Eintrittsdatum',
              value: dateValue,
              suggestion: 'Datumsreihenfolge prüfen'
            };
          }
        }
        break;
    }
  } catch (error) {
    // Date parsing failed - already handled by pattern validation
  }
  
  return null;
}

/**
 * Validates entire dataset
 */
export function validateDataset(
  data: Record<string, any>[],
  mappings: Record<string, InternalField>
): ValidationResult {
  const issues: ValidationIssue[] = [];
  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;
  
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    const rowIssues: ValidationIssue[] = [];
    
    // Validate each mapped field
    for (const [column, field] of Object.entries(mappings)) {
      const value = row[column];
      const fieldIssues = validateField(field, value, rowIndex, row);
      rowIssues.push(...fieldIssues);
    }
    
    // Categorize row
    const hasErrors = rowIssues.some(issue => issue.type === 'error');
    const hasWarnings = rowIssues.some(issue => issue.type === 'warning');
    
    if (hasErrors) {
      errorRows++;
    } else if (hasWarnings) {
      warningRows++;
    } else {
      validRows++;
    }
    
    issues.push(...rowIssues);
  }
  
  return {
    valid: errorRows === 0,
    issues,
    stats: {
      totalRows: data.length,
      validRows,
      errorRows,
      warningRows
    }
  };
}

/**
 * Validates mapping completeness
 */
export function validateMappingCompleteness(
  mappings: Record<string, InternalField>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mappedFields = Object.values(mappings);
  
  // Check for missing required fields
  for (const requiredField of REQUIRED_FIELDS) {
    if (!mappedFields.includes(requiredField)) {
      issues.push({
        type: 'error',
        row: -1, // Mapping-level issue
        field: requiredField,
        message: `Pflichtfeld "${requiredField}" ist nicht zugeordnet`,
        suggestion: 'Spalte für dieses Feld auswählen'
      });
    }
  }
  
  // Check for missing recommended fields
  for (const recommendedField of RECOMMENDED_FIELDS) {
    if (!mappedFields.includes(recommendedField)) {
      issues.push({
        type: 'info',
        row: -1,
        field: recommendedField,
        message: `Empfohlenes Feld "${recommendedField}" ist nicht zugeordnet`,
        suggestion: 'Spalte für bessere Datenqualität zuordnen'
      });
    }
  }
  
  // Check for duplicate mappings
  const fieldCounts = mappedFields.reduce((counts, field) => {
    counts[field] = (counts[field] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  for (const [field, count] of Object.entries(fieldCounts)) {
    if (count > 1) {
      issues.push({
        type: 'error',
        row: -1,
        field: field as InternalField,
        message: `Feld "${field}" ist mehrfach zugeordnet`,
        suggestion: 'Doppelte Zuordnungen entfernen'
      });
    }
  }
  
  return issues;
}

/**
 * Provides validation suggestions based on issues
 */
export function getValidationSuggestions(
  issues: ValidationIssue[]
): Array<{
  type: 'fix_format' | 'add_mapping' | 'review_data' | 'ignore_warning';
  message: string;
  action?: string;
  affectedRows?: number[];
}> {
  const suggestions: Array<{
    type: 'fix_format' | 'add_mapping' | 'review_data' | 'ignore_warning';
    message: string;
    action?: string;
    affectedRows?: number[];
  }> = [];
  
  // Group issues by type and field
  const issueGroups = issues.reduce((groups, issue) => {
    const key = `${issue.type}-${issue.field}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(issue);
    return groups;
  }, {} as Record<string, ValidationIssue[]>);
  
  for (const [key, groupIssues] of Object.entries(issueGroups)) {
    const firstIssue = groupIssues[0];
    const affectedRows = groupIssues.map(issue => issue.row).filter(row => row >= 0);
    
    if (firstIssue.type === 'error' && firstIssue.row === -1) {
      // Mapping-level error
      suggestions.push({
        type: 'add_mapping',
        message: firstIssue.message,
        action: firstIssue.suggestion
      });
    } else if (firstIssue.type === 'error') {
      // Data format error
      suggestions.push({
        type: 'fix_format',
        message: `${groupIssues.length} Zeilen haben Formatfehler in "${firstIssue.field}"`,
        action: firstIssue.suggestion,
        affectedRows
      });
    } else if (firstIssue.type === 'warning') {
      // Data quality warning
      suggestions.push({
        type: 'review_data',
        message: `${groupIssues.length} Zeilen haben Warnungen in "${firstIssue.field}"`,
        action: firstIssue.suggestion,
        affectedRows
      });
    } else {
      // Info-level issues
      suggestions.push({
        type: 'ignore_warning',
        message: `${groupIssues.length} Hinweise zu "${firstIssue.field}"`,
        action: firstIssue.suggestion,
        affectedRows
      });
    }
  }
  
  return suggestions.sort((a, b) => {
    // Sort by priority: errors first, then warnings, then info
    const priority = { fix_format: 1, add_mapping: 2, review_data: 3, ignore_warning: 4 };
    return priority[a.type] - priority[b.type];
  });
}