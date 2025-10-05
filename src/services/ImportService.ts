/**
 * Einheitlicher Import-Service für CSV/XLSX
 * Robuste Verarbeitung mit Header-Mapping und Normalisierung
 */

import * as XLSX from 'xlsx';
import { parseToISO } from '../utils/date';
import { validateClient } from '../domain/zod';
import type { Client } from '../domain/models';
import { db } from '../data/db';
import { nowISO } from '../utils/date';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  warnings: string[];
  errors: string[];
}

export interface ImportOptions {
  sourceId: string;
  mode: 'append' | 'sync';
  skipValidation?: boolean;
}

// Header-Mapping-Tabelle (tolerant)
const HEADER_MAPPING: Record<string, string> = {
  // Name-Varianten
  'kunde': 'name',
  'name': 'name',
  'kundename': 'name',
  'client': 'name',
  'nachname': 'lastName',
  'vorname': 'firstName',
  'titel': 'title',
  'anrede': 'title',
  
  // Status & Angebot
  'status': 'status',
  'buchungsstatus': 'status',
  'angebot': 'angebot',
  'offer': 'angebot',
  'maßnahme': 'angebot',
  
  // AMS-Daten
  'ams': 'amsId',
  'ams-id': 'amsId',
  'kundennummer': 'amsId',
  'id': 'amsId',
  'ams berater': 'amsAdvisor',
  'ams_berater': 'amsAdvisor',
  'berater': 'amsAdvisor',
  'advisor': 'amsAdvisor',
  'betreuer': 'amsAdvisor',
  
  // Termine & Daten
  'termin': 'followUp',
  'datum': 'followUp',
  'date': 'followUp',
  'wiedervorlage': 'followUp',
  'zubuchung': 'amsBookingDate',
  'zubuchungsdatum': 'amsBookingDate',
  'eintritt': 'entryDate',
  'austritt': 'exitDate',
  'geburtsdatum': 'birthDate',
  
  // Kontakt
  'telefon': 'phone',
  'tel': 'phone',
  'email': 'email',
  'mail': 'email',
  'adresse': 'address',
  
  // Sonstiges
  'notiz': 'note',
  'notes': 'note',
  'note': 'note',
  'bemerkung': 'note',
  'anmerkung': 'note',
  'priorität': 'priority',
  'prio': 'priority'
};

// Angebot-Normalisierung
const ANGEBOT_MAPPING: Record<string, string> = {
  'bam': 'BAM',
  'llb': 'LL/B+',
  'll/b+': 'LL/B+',
  'bwb': 'BwB',
  'nb': 'NB'
};

class ImportService {
  /**
   * Einheitlicher Import-Entry-Point
   */
  async importFile(file: File, options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      warnings: [],
      errors: []
    };

    try {
      const workbook = await this.parseFile(file);
      
      // Erste Sheet verwenden
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        result.errors.push('Keine Arbeitsblätter gefunden');
        return result;
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length < 2) {
        result.errors.push('Keine Datenzeilen gefunden');
        return result;
      }

      const headers = rawData[0] as string[];
      const rows = rawData.slice(1);

      // Header-Mapping anwenden
      const mappedHeaders = this.mapHeaders(headers);

      // Zeilen sammeln für Bulk-Insert
      const validClients: Client[] = [];

      // Zeilen verarbeiten
      for (let i = 0; i < rows.length; i++) {
        try {
          const rawRow = rows[i];
          const mappedRow = this.mapRow(rawRow, headers, mappedHeaders);

          if (this.isEmptyRow(mappedRow)) {
            result.skipped++;
            continue;
          }

          const normalizedRow = this.normalizeRow(mappedRow);

          if (!options.skipValidation) {
            try {
              validateClient(normalizedRow);
            } catch (validationError) {
              result.warnings.push(`Zeile ${i + 2}: Validierung fehlgeschlagen - ${validationError}`);
              result.skipped++;
              continue;
            }
          }

          // Client-Objekt erstellen
          const client: Client = {
            ...normalizedRow,
            id: crypto.randomUUID(),
            sourceId: options.sourceId,
            contactCount: normalizedRow.contactCount || 0,
            contactLog: normalizedRow.contactLog || [],
            isArchived: false,
            lastImportedAt: nowISO(),
            lastSeenInSourceAt: nowISO(),
            source: {
              fileName: file.name,
              importedAt: nowISO()
            }
          };

          validClients.push(client);

        } catch (rowError) {
          result.warnings.push(`Zeile ${i + 2}: ${rowError instanceof Error ? rowError.message : 'Unbekannter Fehler'}`);
          result.skipped++;
        }
      }

      // Bulk-Insert in DB
      if (validClients.length > 0) {
        try {
          if (options.mode === 'append') {
            result.imported = await db.bulkCreate(validClients);
          } else if (options.mode === 'sync') {
            // Sync-Modus: Delta-Sync implementieren
            const syncResult = await this.performSync(validClients, options.sourceId);
            result.imported = syncResult.created + syncResult.updated;
            result.warnings.push(...syncResult.warnings);
          }
        } catch (dbError) {
          result.errors.push(`Datenbank-Fehler: ${dbError instanceof Error ? dbError.message : 'Unbekannter Fehler'}`);
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    }

    return result;
  }

  /**
   * Datei parsen (CSV oder XLSX)
   */
  private async parseFile(file: File): Promise<XLSX.WorkBook> {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      return this.parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return this.parseXLSX(file);
    } else {
      throw new Error('Nicht unterstütztes Dateiformat. Erlaubt: .csv, .xlsx, .xls');
    }
  }

  /**
   * CSV-Parsing mit Delimiter-Erkennung
   */
  private async parseCSV(file: File): Promise<XLSX.WorkBook> {
    let text: string;
    
    try {
      // UTF-8 versuchen
      text = await file.text();
    } catch {
      // Fallback für andere Encodings
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('latin1');
      text = decoder.decode(arrayBuffer);
    }

    // BOM entfernen falls vorhanden
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    // Delimiter erkennen (bevorzugt Semikolon)
    const delimiter = text.includes(';') ? ';' : ',';
    
    return XLSX.read(text, {
      type: 'string',
      FS: delimiter,
      codepage: 65001 // UTF-8
    });
  }

  /**
   * XLSX-Parsing
   */
  private async parseXLSX(file: File): Promise<XLSX.WorkBook> {
    const arrayBuffer = await file.arrayBuffer();
    
    return XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false
    });
  }

  /**
   * Header-Mapping anwenden
   */
  private mapHeaders(headers: string[]): Record<number, string> {
    const mapped: Record<number, string> = {};
    
    headers.forEach((header, index) => {
      if (!header) return;
      
      const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const targetField = HEADER_MAPPING[normalized];
      
      if (targetField) {
        mapped[index] = targetField;
      }
    });
    
    return mapped;
  }

  /**
   * Zeile auf Domain-Felder mappen
   */
  private mapRow(row: any[], headers: string[], mappedHeaders: Record<number, string>): any {
    const mapped: any = {};
    
    row.forEach((value, index) => {
      const targetField = mappedHeaders[index];
      if (targetField && value != null && value !== '') {
        mapped[targetField] = value;
      }
    });
    
    return mapped;
  }

  /**
   * Zeile normalisieren (Name-Parser, Datum-Normalizer)
   */
  private normalizeRow(row: any): Partial<Client> {
    const normalized: any = { ...row };
    
    // Name-Parser
    if (row.name && !row.firstName && !row.lastName) {
      const parsed = this.parseName(row.name);
      normalized.firstName = parsed.firstName;
      normalized.lastName = parsed.lastName;
      if (parsed.title) normalized.title = parsed.title;
      delete normalized.name;
    }
    
    // Datum-Normalizer
    ['birthDate', 'followUp', 'amsBookingDate', 'entryDate', 'exitDate'].forEach(field => {
      if (row[field]) {
        try {
          normalized[field] = parseToISO(row[field]);
        } catch {
          // Ungültiges Datum - Feld leer lassen
          delete normalized[field];
        }
      }
    });
    
    // Angebot normalisieren
    if (row.angebot) {
      const normalizedAngebot = ANGEBOT_MAPPING[row.angebot.toLowerCase()] || row.angebot;
      if (['BAM', 'LL/B+', 'BwB', 'NB'].includes(normalizedAngebot)) {
        normalized.angebot = normalizedAngebot;
      }
    }
    
    // Defaults für Pflichtfelder
    if (!normalized.priority) normalized.priority = 'normal';
    if (!normalized.status) normalized.status = 'offen';
    if (!normalized.contactCount) normalized.contactCount = 0;
    if (!normalized.contactLog) normalized.contactLog = [];
    if (normalized.isArchived === undefined) normalized.isArchived = false;
    
    return normalized;
  }

  /**
   * Name-Parser für AT-Formate
   */
  private parseName(name: string): { firstName: string; lastName: string; title?: string } {
    const cleaned = name.trim().replace(/\s+/g, ' ');
    
    // "Nachname, Vorname" Format
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',').map(p => p.trim());
      return {
        lastName: parts[0] || '',
        firstName: parts[1] || ''
      };
    }
    
    // "Titel Vorname Nachname" Format
    const parts = cleaned.split(' ');
    if (parts.length >= 3) {
      const firstPart = parts[0];
      // Titel erkennen (Dr., Mag., etc.)
      if (firstPart.includes('.') || ['Dr', 'Mag', 'Dipl', 'Prof'].includes(firstPart)) {
        return {
          title: firstPart,
          firstName: parts[1] || '',
          lastName: parts.slice(2).join(' ')
        };
      }
    }
    
    // "Vorname Nachname" Format (Standard)
    if (parts.length >= 2) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
      };
    }
    
    // Fallback: alles als Nachname
    return {
      firstName: '',
      lastName: cleaned
    };
  }

  /**
   * Prüft ob Zeile leer ist
   */
  private isEmptyRow(row: any): boolean {
    return !row.firstName && !row.lastName && !row.amsId && !row.name;
  }

  /**
   * Sync-Modus: Delta-Sync mit bestehenden Daten
   */
  private async performSync(newClients: Client[], sourceId: string): Promise<{
    created: number;
    updated: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let created = 0;
    let updated = 0;

    try {
      // Bestehende Clients mit gleicher sourceId laden
      const existingClients = await db.clients.where('sourceId').equals(sourceId).toArray();
      const existingByRowKey = new Map(
        existingClients.map(c => [c.rowKey, c]).filter(([key]) => key)
      );

      for (const newClient of newClients) {
        const rowKey = newClient.rowKey || `${newClient.firstName}_${newClient.lastName}`;
        const existing = existingByRowKey.get(rowKey);

        if (!existing) {
          // Neu: erstellen
          await db.clients.add(newClient);
          created++;
        } else {
          // Vorhanden: aktualisieren (nur nicht-protected Felder)
          const updates: Partial<Client> = {
            ...newClient,
            id: existing.id, // Behalte Original-ID
            assignedTo: existing.assignedTo, // Protected
            priority: existing.priority, // Protected
            status: existing.status, // Protected
            result: existing.result, // Protected
            contactLog: existing.contactLog, // Protected
            contactCount: existing.contactCount, // Protected
            followUp: existing.followUp, // Protected
            lastSeenInSourceAt: nowISO()
          };

          await db.clients.update(existing.id, updates);
          updated++;
        }
      }
    } catch (error) {
      warnings.push(`Sync-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }

    return { created, updated, warnings };
  }
}

export const importService = new ImportService();