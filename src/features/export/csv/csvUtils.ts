/**
 * Pure functions for CSV export with advanced options
 * Extracted from existing export logic for testability
 */

export interface ColumnSpec {
  key: string;
  label?: string;
  transform?: (value: any) => any;
}

export interface CsvOptions {
  separator: ',' | ';';
  includeBOM: boolean;
  guardForSpreadsheetInjection: boolean;
  lineEnding?: '\n' | '\r\n';
}

/**
 * Builds CSV header row from column specifications
 * 
 * @param columns - Column specifications with keys and optional labels
 * @param opts - CSV formatting options
 * @returns Formatted header string
 */
export function buildCsvHeader(columns: ColumnSpec[], opts: CsvOptions): string {
  const headers = columns.map(col => col.label || col.key);
  return headers.map(header => escapeCsvValue(header, opts)).join(opts.separator);
}

/**
 * Serializes a data row to CSV format
 * 
 * @param row - Data object to serialize
 * @param columns - Column specifications
 * @param opts - CSV formatting options
 * @returns Formatted row string
 */
export function serializeRow(row: any, columns: ColumnSpec[], opts: CsvOptions): string {
  const values = columns.map(col => {
    let value = row[col.key];
    
    // Apply transform if provided
    if (col.transform && typeof col.transform === 'function') {
      value = col.transform(value);
    }
    
    return escapeCsvValue(value, opts);
  });
  
  return values.join(opts.separator);
}

/**
 * Joins CSV lines with proper line endings and optional BOM
 * 
 * @param lines - Array of CSV lines (header + data rows)
 * @param opts - CSV formatting options
 * @returns Complete CSV string
 */
export function joinCsv(lines: string[], opts: CsvOptions): string {
  const lineEnding = opts.lineEnding || '\n';
  let csv = lines.join(lineEnding);
  
  // Add BOM for UTF-8 if requested
  if (opts.includeBOM) {
    csv = '\uFEFF' + csv;
  }
  
  return csv;
}

/**
 * Escapes a single CSV value with proper quoting and injection guards
 * 
 * @param value - Value to escape
 * @param opts - CSV options including separator and injection guard settings
 * @returns Escaped value string
 */
export function escapeCsvValue(value: any, opts: CsvOptions): string {
  // Handle null/undefined
  if (value == null) return '';
  
  let str = String(value);
  
  // Spreadsheet injection guard
  if (opts.guardForSpreadsheetInjection && str.length > 0) {
    const firstChar = str.charAt(0);
    if (['=', '+', '-', '@'].includes(firstChar)) {
      // Prepend single quote to neutralize potential injection
      str = "'" + str;
    }
  }
  
  // Check if quoting is needed
  const needsQuoting = str.includes(opts.separator) || 
                      str.includes('\n') || 
                      str.includes('\r') || 
                      str.includes('"');
  
  if (needsQuoting) {
    // Escape existing quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return str;
}

/**
 * Converts array of objects to CSV string with full options support
 * 
 * @param data - Array of data objects
 * @param columns - Column specifications
 * @param opts - CSV formatting options
 * @returns Complete CSV string
 */
export function arrayToCsv(data: any[], columns: ColumnSpec[], opts: CsvOptions): string {
  const lines: string[] = [];
  
  // Add header
  lines.push(buildCsvHeader(columns, opts));
  
  // Add data rows
  data.forEach(row => {
    lines.push(serializeRow(row, columns, opts));
  });
  
  return joinCsv(lines, opts);
}

/**
 * Default CSV options
 */
export const defaultCsvOptions: CsvOptions = {
  separator: ',',
  includeBOM: false,
  guardForSpreadsheetInjection: true,
  lineEnding: '\n'
};