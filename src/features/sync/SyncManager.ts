/**
 * Sync-Manager für OneDrive/SharePoint-Ordner-Integration
 * Koordiniert verschlüsselte Datenverteilung zwischen App-Instanzen
 */

import { db } from '../../data/db';
import { cryptoManager } from '../../data/crypto';
import { nowISO } from '../../utils/date';
import type { Client } from '../../domain/models';

export interface SyncManifest {
  version: string;
  lastUpdate: string;
  coordinator: string;
  participants: string[];
  currentSnapshot: {
    file: string;
    hash: string;
    timestamp: string;
    recordCount: number;
  } | null;
  pendingDeltas: Array<{
    file: string;
    hash: string;
    timestamp: string;
    operations: {
      created: number;
      updated: number;
      archived: number;
    };
  }>;
  schemaVersion: string;
  encryptionMode: string;
}

export interface SyncPayload {
  type: 'snapshot' | 'delta';
  timestamp: string;
  sourceUser: string;
  data: {
    clients?: Client[];
    operations?: SyncOperation[];
  };
  metadata: {
    recordCount: number;
    schemaVersion: string;
    sourceId?: string;
  };
}

export interface SyncOperation {
  type: 'create' | 'update' | 'archive' | 'delete';
  clientId: string;
  data?: Partial<Client>;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  applied: {
    created: number;
    updated: number;
    archived: number;
  };
  errors: string[];
}

export interface SyncHealth {
  folderAccessible: boolean;
  manifestValid: boolean;
  encryptionWorking: boolean;
  diskSpaceOk: boolean;
  lastSuccessfulSync?: string;
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'conflict' | 'error';

class SyncManager {
  private syncFolderHandle: FileSystemDirectoryHandle | null = null;
  private isCoordinator: boolean = false;
  private currentUser: string = '';
  private autoSyncInterval: number | null = null;
  private lastSyncCheck: number = 0;
  
  /**
   * Sync-Ordner einmalig auswählen und konfigurieren
   */
  async setupSyncFolder(): Promise<void> {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('File System Access API nicht unterstützt');
    }

    try {
      // @ts-ignore - File System Access API
      this.syncFolderHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Sync-Ordner-Info in lokaler DB speichern
      await db.setKV('sync:folderName', this.syncFolderHandle.name);
      
      // Prüfe ob Manifest existiert, sonst erstelle es
      await this.ensureManifest();
      
      console.log('✅ Sync: Ordner konfiguriert:', this.syncFolderHandle.name);
    } catch (error) {
      console.error('❌ Sync: Ordner-Setup fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Coordinator-Rolle übernehmen (für CSV-Import-Nutzer)
   */
  async becomeCoordinator(userId: string): Promise<void> {
    this.isCoordinator = true;
    this.currentUser = userId;
    
    await db.setKV('sync:isCoordinator', true);
    await db.setKV('sync:currentUser', userId);
    
    // Manifest aktualisieren
    const manifest = await this.loadManifest();
    if (manifest) {
      manifest.coordinator = userId;
      if (!manifest.participants.includes(userId)) {
        manifest.participants.push(userId);
      }
      await this.saveManifest(manifest);
    }
    
    console.log('✅ Sync: Coordinator-Rolle übernommen:', userId);
  }

  /**
   * Vollständigen Datenbank-Snapshot erstellen
   */
  async createSnapshot(): Promise<void> {
    if (!this.isCoordinator || !this.syncFolderHandle) {
      throw new Error('Nur Coordinator kann Snapshots erstellen');
    }

    try {
      // Alle Clients aus lokaler DB laden
      const clients = await db.clients.toArray();
      
      const payload: SyncPayload = {
        type: 'snapshot',
        timestamp: nowISO(),
        sourceUser: this.currentUser,
        data: { clients },
        metadata: {
          recordCount: clients.length,
          schemaVersion: '2.1'
        }
      };

      // Verschlüsseln
      const encrypted = await this.encryptPayload(payload);
      
      // Dateiname generieren
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `snapshot-${timestamp}.enc`;
      
      // In Sync-Ordner schreiben
      await this.writeToSyncFolder(`snapshots/${fileName}`, encrypted);
      
      // Manifest aktualisieren
      const manifest = await this.loadManifest();
      if (manifest) {
        manifest.currentSnapshot = {
          file: `snapshots/${fileName}`,
          hash: await this.calculateHash(encrypted),
          timestamp: payload.timestamp,
          recordCount: clients.length
        };
        manifest.lastUpdate = nowISO();
        await this.saveManifest(manifest);
      }
      
      console.log(`✅ Sync: Snapshot erstellt (${clients.length} Datensätze)`);
    } catch (error) {
      console.error('❌ Sync: Snapshot-Erstellung fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Updates von anderen Nutzern abrufen
   */
  async pullUpdates(): Promise<SyncResult> {
    if (!this.syncFolderHandle) {
      throw new Error('Sync-Ordner nicht konfiguriert');
    }

    const result: SyncResult = {
      success: false,
      applied: { created: 0, updated: 0, archived: 0 },
      errors: []
    };

    try {
      const manifest = await this.loadManifest();
      if (!manifest) {
        result.errors.push('Kein gültiges Manifest gefunden');
        return result;
      }

      // Prüfe ob Updates verfügbar sind
      const localLastUpdate = await db.getKV('sync:lastUpdate') as string;
      if (localLastUpdate && localLastUpdate >= manifest.lastUpdate) {
        result.success = true;
        return result; // Bereits aktuell
      }

      // Lade aktuellen Snapshot
      if (manifest.currentSnapshot) {
        const snapshotData = await this.readFromSyncFolder(manifest.currentSnapshot.file);
        const payload = await this.decryptPayload(snapshotData);
        
        if (payload.type === 'snapshot' && payload.data.clients) {
          // Merge mit lokalen Daten (Coordinator-Wins-Strategie)
          const mergeResult = await this.mergeClients(payload.data.clients);
          result.applied = mergeResult;
        }
      }

      // Lade und wende Deltas an
      for (const delta of manifest.pendingDeltas) {
        try {
          const deltaData = await this.readFromSyncFolder(delta.file);
          const payload = await this.decryptPayload(deltaData);
          
          if (payload.type === 'delta' && payload.data.operations) {
            const deltaResult = await this.applyOperations(payload.data.operations);
            result.applied.created += deltaResult.created;
            result.applied.updated += deltaResult.updated;
            result.applied.archived += deltaResult.archived;
          }
        } catch (error) {
          result.errors.push(`Delta ${delta.file}: ${error}`);
        }
      }

      // Lokalen Sync-Timestamp aktualisieren
      await db.setKV('sync:lastUpdate', manifest.lastUpdate);
      
      result.success = result.errors.length === 0;
      console.log('✅ Sync: Updates angewendet:', result.applied);
      
    } catch (error) {
      console.error('❌ Sync: Pull fehlgeschlagen:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    }

    return result;
  }

  /**
   * Automatische Sync-Überwachung starten
   */
  startAutoSync(intervalMs: number = 5 * 60 * 1000): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = window.setInterval(async () => {
      try {
        const result = await this.pullUpdates();
        if (result.applied.created + result.applied.updated + result.applied.archived > 0) {
          // UI-Benachrichtigung über neue Daten
          document.dispatchEvent(new CustomEvent('sync:dataUpdated', {
            detail: result.applied
          }));
        }
      } catch (error) {
        console.warn('⚠️ Sync: Auto-sync fehlgeschlagen:', error);
      }
    }, intervalMs);

    console.log(`🔄 Sync: Auto-sync gestartet (${intervalMs}ms Intervall)`);
  }

  /**
   * Sync-Status für UI abrufen
   */
  async getSyncStatus(): Promise<{
    status: SyncStatus;
    lastSync?: string;
    pendingUpdates: number;
    health: SyncHealth;
  }> {
    const health = await this.checkHealth();
    
    if (!health.folderAccessible) {
      return { status: 'offline', pendingUpdates: 0, health };
    }

    try {
      const manifest = await this.loadManifest();
      const localLastUpdate = await db.getKV('sync:lastUpdate') as string;
      
      if (!manifest) {
        return { status: 'error', pendingUpdates: 0, health };
      }

      const pendingUpdates = manifest.pendingDeltas.length;
      const hasUpdates = !localLastUpdate || localLastUpdate < manifest.lastUpdate;

      return {
        status: hasUpdates ? 'pending' : 'synced',
        lastSync: localLastUpdate,
        pendingUpdates,
        health
      };
    } catch (error) {
      return { status: 'error', pendingUpdates: 0, health };
    }
  }

  // Private Helper-Methoden
  private async ensureManifest(): Promise<void> {
    try {
      await this.loadManifest();
    } catch {
      // Manifest existiert nicht, erstelle es
      const initialManifest: SyncManifest = {
        version: '1.0',
        lastUpdate: nowISO(),
        coordinator: this.currentUser,
        participants: [this.currentUser],
        currentSnapshot: null,
        pendingDeltas: [],
        schemaVersion: '2.1',
        encryptionMode: 'aes-gcm-256'
      };
      
      await this.saveManifest(initialManifest);
    }
  }

  private async loadManifest(): Promise<SyncManifest | null> {
    if (!this.syncFolderHandle) return null;
    
    try {
      const fileHandle = await this.syncFolderHandle.getFileHandle('manifest.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private async saveManifest(manifest: SyncManifest): Promise<void> {
    if (!this.syncFolderHandle) throw new Error('Sync-Ordner nicht verfügbar');
    
    const fileHandle = await this.syncFolderHandle.getFileHandle('manifest.json', {
      create: true
    });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(manifest, null, 2));
    await writable.close();
  }

  private async encryptPayload(payload: SyncPayload): Promise<Uint8Array> {
    const json = JSON.stringify(payload);
    const encrypted = await cryptoManager.encrypt(json);
    
    // Kombiniere Nonce + Ciphertext für einfache Speicherung
    const combined = new Uint8Array(encrypted.nonce.length + encrypted.ciphertext.length);
    combined.set(encrypted.nonce, 0);
    combined.set(encrypted.ciphertext, encrypted.nonce.length);
    
    return combined;
  }

  private async decryptPayload(encrypted: Uint8Array): Promise<SyncPayload> {
    // Nonce (erste 12 Bytes) und Ciphertext trennen
    const nonce = encrypted.slice(0, 12);
    const ciphertext = encrypted.slice(12);
    
    const decrypted = await cryptoManager.decrypt({ nonce, ciphertext });
    return JSON.parse(decrypted);
  }

  private async writeToSyncFolder(path: string, data: Uint8Array): Promise<void> {
    if (!this.syncFolderHandle) throw new Error('Sync-Ordner nicht verfügbar');
    
    // Ordner-Struktur erstellen falls nötig
    const pathParts = path.split('/');
    const fileName = pathParts.pop()!;
    
    let currentDir = this.syncFolderHandle;
    for (const dirName of pathParts) {
      try {
        currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
      } catch (error) {
        throw new Error(`Ordner ${dirName} konnte nicht erstellt werden: ${error}`);
      }
    }
    
    // Datei schreiben
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  private async readFromSyncFolder(path: string): Promise<Uint8Array> {
    if (!this.syncFolderHandle) throw new Error('Sync-Ordner nicht verfügbar');
    
    const pathParts = path.split('/');
    const fileName = pathParts.pop()!;
    
    let currentDir = this.syncFolderHandle;
    for (const dirName of pathParts) {
      currentDir = await currentDir.getDirectoryHandle(dirName);
    }
    
    const fileHandle = await currentDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    
    return new Uint8Array(arrayBuffer);
  }

  private async calculateHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return 'sha256:' + Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async mergeClients(incomingClients: Client[]): Promise<{
    created: number;
    updated: number;
    archived: number;
  }> {
    const stats = { created: 0, updated: 0, archived: 0 };
    
    // Coordinator-Wins-Strategie: Eingehende Daten überschreiben lokale
    await db.transaction('rw', [db.clients], async () => {
      for (const client of incomingClients) {
        const existing = await db.clients.get(client.id);
        
        if (!existing) {
          await db.clients.add(client);
          stats.created++;
        } else {
          // Merge mit Schutz für lokale Änderungen
          const merged = { ...existing, ...client };
          await db.clients.put(merged);
          stats.updated++;
        }
      }
    });
    
    return stats;
  }

  private async applyOperations(operations: SyncOperation[]): Promise<{
    created: number;
    updated: number;
    archived: number;
  }> {
    const stats = { created: 0, updated: 0, archived: 0 };
    
    await db.transaction('rw', [db.clients], async () => {
      for (const op of operations) {
        switch (op.type) {
          case 'create':
            if (op.data) {
              await db.clients.add(op.data as Client);
              stats.created++;
            }
            break;
            
          case 'update':
            if (op.data) {
              await db.clients.update(op.clientId, op.data);
              stats.updated++;
            }
            break;
            
          case 'archive':
            await db.clients.update(op.clientId, {
              isArchived: true,
              archivedAt: op.timestamp
            });
            stats.archived++;
            break;
            
          case 'delete':
            await db.clients.delete(op.clientId);
            break;
        }
      }
    });
    
    return stats;
  }

  private async checkHealth(): Promise<SyncHealth> {
    const health: SyncHealth = {
      folderAccessible: false,
      manifestValid: false,
      encryptionWorking: false,
      diskSpaceOk: true // Vereinfacht für jetzt
    };

    try {
      // Ordner-Zugriff prüfen
      if (this.syncFolderHandle) {
        await this.syncFolderHandle.getFileHandle('manifest.json');
        health.folderAccessible = true;
      }
    } catch {
      health.folderAccessible = false;
    }

    try {
      // Manifest-Validität prüfen
      const manifest = await this.loadManifest();
      health.manifestValid = !!manifest && !!manifest.version;
    } catch {
      health.manifestValid = false;
    }

    try {
      // Verschlüsselung testen
      const testPayload: SyncPayload = {
        type: 'delta',
        timestamp: nowISO(),
        sourceUser: 'test',
        data: {},
        metadata: { recordCount: 0, schemaVersion: '2.1' }
      };
      
      const encrypted = await this.encryptPayload(testPayload);
      const decrypted = await this.decryptPayload(encrypted);
      health.encryptionWorking = decrypted.sourceUser === 'test';
    } catch {
      health.encryptionWorking = false;
    }

    return health;
  }

  /**
   * Sync-Ordner-Handle aus Storage wiederherstellen
   */
  async restoreSyncFolder(): Promise<boolean> {
    try {
      const folderName = await db.getKV('sync:folderName') as string;
      if (!folderName) return false;

      // In einer echten Implementierung würden wir hier versuchen,
      // das Handle aus dem Browser-Storage zu restaurieren
      // Für jetzt: Benutzer muss Ordner neu auswählen
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Initialisierung beim App-Start
   */
  async initialize(): Promise<void> {
    try {
      // Lade gespeicherte Einstellungen
      const [isCoordinator, currentUser, folderName] = await Promise.all([
        db.getKV('sync:isCoordinator'),
        db.getKV('sync:currentUser'),
        db.getKV('sync:folderName')
      ]);

      this.isCoordinator = !!isCoordinator;
      this.currentUser = currentUser as string || '';

      // Versuche Sync-Ordner zu restaurieren
      if (folderName) {
        // In einer echten Implementierung würden wir das Handle restaurieren
        console.log('🔄 Sync: Gespeicherter Ordner gefunden:', folderName);
      }

      // Auto-Sync starten wenn konfiguriert
      const autoInterval = await db.getKV('sync:autoInterval') as number;
      if (autoInterval && this.syncFolderHandle) {
        this.startAutoSync(autoInterval * 60 * 1000);
      }

    } catch (error) {
      console.warn('⚠️ Sync: Initialisierung teilweise fehlgeschlagen:', error);
    }
  }
}

// Singleton-Instanz
export const syncManager = new SyncManager();