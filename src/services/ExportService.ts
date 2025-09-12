/**
 * Export-Service für CSV/XLSX mit Roundtrip-Unterstützung
 */

import * as XLSX from 'xlsx';
import { db } from '../data/db';
import { getEncryptionMode } from '../utils/env';
import type { Client, User } from '../domain/models';

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeArchived?: boolean;
  fields?: string[];
  delimiter?: ';' | ',';
}

export interface ExportResult {
  success: boolean;
  exported: number;
  errors: string[];
  blob?: Blob;
  fileName?: string;
}

// Standard-Export-Felder
const DEFAULT_EXPORT_FIELDS = [
  'amsId',
  'firstName', 
  'lastName',
  'title',
  'birthDate',
  'phone',
  'email',
  'address',
  'status',
  'priority',
  'angebot',
  'followUp',
  'amsAdvisor',
  'note',
  'isArchived'
];

// Feld-Labels für CSV-Header
const FIELD_LABELS: Record<string, string> = {
  'amsId': 'AMS-ID',
  'firstName': 'Vorname',
  'lastName': 'Nachname',
  'title': 'Titel',
  'birthDate': 'Geburtsdatum',
  'phone': 'Telefon',
  'email': 'E-Mail',
  'address': 'Adresse',
  'status': 'Status',
  'priority': 'Priorität',
  'angebot': 'Angebot',
  'followUp': 'Termin',
  'amsAdvisor': 'AMS Berater',
  'note': 'Notiz',
  'isArchived': 'Archiviert'
};

class ExportService {
  /**
   * Clients exportieren
   */
  async exportClients(options: ExportOptions): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      exported: 0,
      errors: []
    };

    try {
      // Daten laden
      const allClients = await db.clients.toArray() as Client[];
      const clients = options.includeArchived 
        ? allClients 
        : allClients.filter(c => !c.isArchived);

      if (clients.length === 0) {
        result.errors.push('Keine Daten zum Exportieren gefunden');
        return result;
      }

      const fields = options.fields || DEFAULT_EXPORT_FIELDS;
      
      // Daten für Export vorbereiten
      const exportData = clients.map(client => {
        const row: any = {};
        fields.forEach(field => {
          const value = (client as any)[field];
          row[field] = this.formatValue(value, field);
        });
        return row;
      });

      // Export-Format erstellen
      if (options.format === 'csv') {
        const csv = this.createCSV(exportData, fields, options.delimiter || ';');
        result.blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        result.fileName = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        const xlsx = this.createXLSX(exportData, fields);
        result.blob = new Blob([xlsx], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        result.fileName = `clients-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      result.exported = clients.length;
      result.success = true;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Export-Fehler');
    }

    return result;
  }

  /**
   * Vollbackup erstellen (alle Tabellen)
   */
  async createBackup(): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      exported: 0,
      errors: []
    };

    try {
      const [clients, users] = await Promise.all([
        db.clients.toArray(),
        db.users.toArray()
      ]);

      const backup = {
        meta: {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          encryptionMode: getEncryptionMode()
        },
        tables: {
          clients,
          users
        }
      };

      const json = JSON.stringify(backup, null, 2);
      result.blob = new Blob([json], { type: 'application/json' });
      result.fileName = `clienttool-backup-${new Date().toISOString().split('T')[0]}.json`;
      result.exported = clients.length + users.length;
      result.success = true;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Backup-Fehler');
    }

    return result;
  }

  /**
   * CSV erstellen
   */
  private createCSV(data: any[], fields: string[], delimiter: ';' | ','): string {
    const headers = fields.map(field => FIELD_LABELS[field] || field);
    const headerRow = headers.join(delimiter);
    
    const dataRows = data.map(row => 
      fields.map(field => this.escapeCSVValue(row[field], delimiter)).join(delimiter)
    );
    
    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * XLSX erstellen
   */
  private createXLSX(data: any[], fields: string[]): ArrayBuffer {
    // Headers mit Labels
    const headers = fields.map(field => FIELD_LABELS[field] || field);
    
    // Daten mit Headers kombinieren
    const worksheetData = [headers, ...data.map(row => 
      fields.map(field => row[field])
    )];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  }

  /**
   * Wert für Export formatieren
   */
  private formatValue(value: any, field: string): string {
    if (value == null) return '';
    
    // Datum-Felder zu DD.MM.YYYY
    if (['birthDate', 'followUp', 'amsBookingDate', 'entryDate', 'exitDate'].includes(field)) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('de-DE');
        }
      } catch {
        // Fallback: Originalwert
      }
    }
    
    // Boolean-Felder
    if (field === 'isArchived') {
      return value ? 'Ja' : 'Nein';
    }
    
    return String(value);
  }

  /**
   * CSV-Wert escapen
   */
  private escapeCSVValue(value: any, delimiter: ';' | ','): string {
    const str = String(value || '');
    
    if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    
    return str;
  }
}

export const exportService = new ExportService();