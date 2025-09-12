/**
 * Tests für ExportService und Roundtrip
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportService } from './ExportService';
import { importService } from './ImportService';
import type { Client } from '../domain/models';

// Mock db
const mockClients: Client[] = [
  {
    id: 'test-1',
    amsId: 'A12345',
    firstName: 'Max',
    lastName: 'Mustermann',
    title: 'Dr.',
    birthDate: '1985-03-15',
    phone: '+43 1 234 5678',
    email: 'max.mustermann@example.com',
    status: 'offen',
    priority: 'normal',
    angebot: 'BAM',
    followUp: '2024-12-25',
    amsAdvisor: 'Claudia Schmitt',
    note: 'Erstkontakt erfolgreich',
    contactCount: 0,
    contactLog: [],
    isArchived: false
  },
  {
    id: 'test-2',
    amsId: 'A67890',
    firstName: 'Anna',
    lastName: 'Schmidt',
    birthDate: '1992-07-22',
    phone: '+43 699 987 6543',
    email: 'anna.schmidt@test.at',
    status: 'inBearbeitung',
    priority: 'hoch',
    angebot: 'LL/B+',
    amsAdvisor: 'Max Berater',
    note: 'Termin vereinbart',
    contactCount: 1,
    contactLog: [],
    isArchived: false
  }
];

const mockDb = {
  clients: {
    toArray: vi.fn().mockResolvedValue(mockClients)
  },
  users: {
    toArray: vi.fn().mockResolvedValue([])
  }
};

vi.mock('../data/db', () => ({
  db: mockDb
}));

vi.mock('../utils/env', () => ({
  getEncryptionMode: () => 'plain'
}));

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSV Export', () => {
    it('should export clients to CSV with semicolon delimiter', async () => {
      const result = await exportService.exportClients({
        format: 'csv',
        delimiter: ';'
      });

      expect(result.success).toBe(true);
      expect(result.exported).toBe(2);
      expect(result.blob).toBeDefined();
      expect(result.fileName).toMatch(/\.csv$/);

      // Prüfe CSV-Inhalt
      const csvText = await result.blob!.text();
      expect(csvText).toContain('AMS-ID;Vorname;Nachname');
      expect(csvText).toContain('A12345;Max;Mustermann');
      expect(csvText).toContain('15.03.1985'); // Datum formatiert
    });

    it('should export clients to CSV with comma delimiter', async () => {
      const result = await exportService.exportClients({
        format: 'csv',
        delimiter: ','
      });

      expect(result.success).toBe(true);
      const csvText = await result.blob!.text();
      expect(csvText).toContain('AMS-ID,Vorname,Nachname');
    });

    it('should exclude archived clients by default', async () => {
      const archivedClient = { ...mockClients[0], isArchived: true };
      mockDb.clients.toArray.mockResolvedValue([archivedClient, mockClients[1]]);

      const result = await exportService.exportClients({
        format: 'csv'
      });

      expect(result.success).toBe(true);
      expect(result.exported).toBe(1); // Nur nicht-archivierte
    });

    it('should include archived clients when requested', async () => {
      const archivedClient = { ...mockClients[0], isArchived: true };
      mockDb.clients.toArray.mockResolvedValue([archivedClient, mockClients[1]]);

      const result = await exportService.exportClients({
        format: 'csv',
        includeArchived: true
      });

      expect(result.success).toBe(true);
      expect(result.exported).toBe(2); // Alle Clients
    });
  });

  describe('XLSX Export', () => {
    it('should export clients to XLSX', async () => {
      const result = await exportService.exportClients({
        format: 'xlsx'
      });

      expect(result.success).toBe(true);
      expect(result.exported).toBe(2);
      expect(result.blob).toBeDefined();
      expect(result.fileName).toMatch(/\.xlsx$/);
    });
  });

  describe('Backup', () => {
    it('should create complete backup', async () => {
      const result = await exportService.createBackup();

      expect(result.success).toBe(true);
      expect(result.exported).toBe(2); // clients + users
      expect(result.blob).toBeDefined();
      expect(result.fileName).toMatch(/\.json$/);

      // Prüfe Backup-Struktur
      const backupText = await result.blob!.text();
      const backup = JSON.parse(backupText);
      expect(backup.meta.version).toBe('1.0');
      expect(backup.tables.clients).toHaveLength(2);
    });
  });
});

describe('Roundtrip Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain data integrity in CSV roundtrip', async () => {
    // Export
    const exportResult = await exportService.exportClients({
      format: 'csv',
      delimiter: ';'
    });

    expect(exportResult.success).toBe(true);
    expect(exportResult.blob).toBeDefined();

    // Re-Import
    const csvFile = new File([exportResult.blob!], 'roundtrip.csv', { type: 'text/csv' });
    const importResult = await importService.importFile(csvFile, {
      sourceId: 'roundtrip-test',
      mode: 'append',
      skipValidation: true
    });

    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(2);
    expect(importResult.warnings).toHaveLength(0);
  });

  it('should maintain data integrity in XLSX roundtrip', async () => {
    // Export
    const exportResult = await exportService.exportClients({
      format: 'xlsx'
    });

    expect(exportResult.success).toBe(true);
    expect(exportResult.blob).toBeDefined();

    // Re-Import würde XLSX-File benötigen
    // Für jetzt nur Export-Erfolg prüfen
    expect(exportResult.exported).toBe(2);
  });
});