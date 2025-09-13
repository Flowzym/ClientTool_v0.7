export type ISODateString = string;          // bereits normalisiert: 'YYYY-MM-DD'
export type NonEmptyString = string;         // semantischer Alias

export interface ImportRawRow {
  // Felder, wie sie aus XLSX/HTML/CSV kommen (alles optional/weit)
  name?: string;
  angebot?: string | null;
  offer?: string | null;
  status?: string | null;
  followUp?: string | null;
  bookingDate?: string | null;
  [key: string]: unknown;
}

export interface ImportMappedRow {
  // nach Mapping/Normalisierung
  name: string;
  offer?: string | null;
  status?: string;
  followUp?: ISODateString | undefined;
  bookingDate?: ISODateString | undefined;
  [key: string]: unknown;
}

export interface ImportIssue {
  type:
    | 'date-parse'
    | 'validation'
    | 'mapping'
    | 'duplicate'
    | 'unsupported';
  row: number;              // 1-based
  column?: string;
  value?: unknown;
  message: string;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  warnings: ImportIssue[];
  duplicates?: number;
}

export interface SniffResult {
  kind: 'xlsx' | 'csv' | 'html' | 'unknown';
  mime?: string;
  reason?: string;
}