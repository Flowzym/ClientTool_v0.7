# OneDrive/SharePoint Sync-Ordner Integration Plan

## Überblick

Diese Lösung nutzt den **Microsoft 365 Sync Client** (OneDrive) als Transportschicht für verschlüsselte Daten zwischen mehreren App-Instanzen. Die App bleibt dabei "local-first" und interagiert nur mit dem lokalen Dateisystem.

## Architektur-Prinzipien

### 1. Ende-zu-Ende-Verschlüsselung
- **Verschlüsselung vor Sync**: Alle Daten werden **innerhalb der App** verschlüsselt, bevor sie den Sync-Ordner erreichen
- **Cloud sieht nur Cipher-Blobs**: OneDrive/SharePoint speichert nur unlesbare, verschlüsselte Dateien
- **Entschlüsselung nach Sync**: Erst beim Import in die Ziel-App werden die Daten wieder entschlüsselt

### 2. Manifest-basierte Synchronisation
- **Manifest-Datei**: Zentrale Metadaten-Datei (`sync-manifest.json`) koordiniert alle Sync-Operationen
- **Atomare Updates**: Two-Phase-Commit-Pattern für konsistente Datenverteilung
- **Versionierung**: Jeder Sync-Vorgang erhält eine eindeutige Version/Timestamp

### 3. Delta-Sync-Optimierung
- **Nur Änderungen übertragen**: Statt kompletter Datenbank-Dumps nur geänderte Datensätze
- **Kompression**: Verschlüsselte Deltas werden zusätzlich komprimiert
- **Deduplizierung**: Identische Änderungen werden nur einmal übertragen

## Detaillierte Implementierung

### Phase 1: Sync-Ordner-Setup

#### 1.1 Ordner-Struktur
```
/OneDrive/Apps/KlientenTool/
├── manifest.json                 # Sync-Koordination
├── snapshots/                    # Vollständige Datenbank-Snapshots
│   ├── snapshot-20241201-143022.enc
│   └── snapshot-20241202-091545.enc
├── deltas/                       # Inkrementelle Änderungen
│   ├── delta-20241202-143022.enc
│   └── delta-20241202-143045.enc
├── locks/                        # Koordination für gleichzeitige Zugriffe
│   └── .lock-user1-20241202-143022
└── metadata/                     # Zusätzliche Metadaten
    ├── schema-version.txt
    └── participants.json
```

#### 1.2 Manifest-Format
```json
{
  "version": "1.0",
  "lastUpdate": "2024-12-02T14:30:22.123Z",
  "coordinator": "user1@firma.at",
  "participants": [
    "user1@firma.at",
    "user2@firma.at", 
    "user3@firma.at"
  ],
  "currentSnapshot": {
    "file": "snapshots/snapshot-20241202-091545.enc",
    "hash": "sha256:abc123...",
    "timestamp": "2024-12-02T09:15:45.123Z",
    "recordCount": 1247
  },
  "pendingDeltas": [
    {
      "file": "deltas/delta-20241202-143022.enc",
      "hash": "sha256:def456...",
      "timestamp": "2024-12-02T14:30:22.123Z",
      "operations": {
        "created": 15,
        "updated": 8,
        "archived": 2
      }
    }
  ],
  "schemaVersion": "2.1",
  "encryptionMode": "aes-gcm-256"
}
```

### Phase 2: App-Integration

#### 2.1 Sync-Manager-Komponente
```typescript
class SyncManager {
  private syncPath: string | null = null;
  private isCoordinator: boolean = false;
  private lastSyncCheck: number = 0;
  
  // Sync-Ordner einmalig auswählen (File System Access API)
  async setupSyncFolder(): Promise<void>
  
  // Rolle bestimmen (Coordinator = derjenige, der CSV importiert)
  async becomeCoordinator(): Promise<void>
  
  // Vollständigen Snapshot erstellen und hochladen
  async createSnapshot(): Promise<void>
  
  // Delta seit letztem Snapshot erstellen
  async createDelta(since: string): Promise<void>
  
  // Änderungen von anderen Nutzern abrufen
  async pullUpdates(): Promise<SyncResult>
  
  // Automatische Sync-Überwachung
  startAutoSync(intervalMs: number): void
}
```

#### 2.2 Verschlüsselungs-Pipeline
```typescript
interface SyncPayload {
  type: 'snapshot' | 'delta';
  timestamp: string;
  data: {
    clients?: Client[];
    operations?: SyncOperation[];
  };
  metadata: {
    sourceUser: string;
    recordCount: number;
    schemaVersion: string;
  };
}

class SyncCrypto {
  // Payload verschlüsseln vor Sync-Ordner-Upload
  async encryptForSync(payload: SyncPayload): Promise<Uint8Array>
  
  // Payload entschlüsseln nach Sync-Ordner-Download
  async decryptFromSync(encrypted: Uint8Array): Promise<SyncPayload>
  
  // Integrität prüfen (HMAC)
  async verifyIntegrity(file: Uint8Array, expectedHash: string): Promise<boolean>
}
```

### Phase 3: Workflow-Integration

#### 3.1 Master-Nutzer-Workflow (CSV-Import)
1. **CSV-Import wie gewohnt** über bestehende Import-Funktion
2. **Automatischer Snapshot-Export** nach erfolgreichem Import:
   ```typescript
   // Nach CSV-Import in ImportExcel.tsx
   if (syncManager.isCoordinator()) {
     await syncManager.createSnapshot();
     console.log('✅ Sync: Snapshot für Team erstellt');
   }
   ```
3. **Manifest-Update** mit neuer Snapshot-Info
4. **Benachrichtigung** an andere Nutzer (optional, über lokale Notification API)

#### 3.2 Slave-Nutzer-Workflow (Auto-Sync)
1. **Periodische Sync-Checks** (z.B. alle 5 Minuten)
2. **Manifest-Vergleich** mit lokaler Version
3. **Delta/Snapshot-Download** bei Änderungen
4. **Lokale DB-Aktualisierung** mit Merge-Logik
5. **UI-Benachrichtigung** über neue Daten

#### 3.3 Konfliktbehandlung
```typescript
interface ConflictResolution {
  strategy: 'coordinator-wins' | 'timestamp-wins' | 'manual-merge';
  
  // Coordinator-Wins: Master-Nutzer hat immer Vorrang
  // Timestamp-Wins: Neueste Änderung gewinnt
  // Manual-Merge: UI für manuelle Konfliktlösung
}
```

### Phase 4: UI-Integration

#### 4.1 Sync-Status-Anzeige
```typescript
// Neuer Badge im Header
<SyncStatusBadge 
  status={syncStatus} 
  lastSync={lastSyncTime}
  pendingUpdates={pendingCount}
/>

// Mögliche Status:
// - 'synced': Alle Daten aktuell
// - 'pending': Updates verfügbar
// - 'syncing': Sync läuft gerade
// - 'offline': Sync-Ordner nicht verfügbar
// - 'conflict': Manuelle Konfliktlösung erforderlich
```

#### 4.2 Sync-Einstellungen-Panel
```typescript
// Neue Seite: /sync-settings
<SyncSettings>
  <SyncFolderPicker />           // Sync-Ordner auswählen
  <CoordinatorToggle />          // Coordinator-Rolle übernehmen
  <AutoSyncInterval />           // Sync-Intervall einstellen
  <ConflictResolutionStrategy /> // Konfliktbehandlung konfigurieren
  <SyncHistory />                // Letzte Sync-Vorgänge anzeigen
</SyncSettings>
```

### Phase 5: Sicherheits-Implementierung

#### 5.1 Verschlüsselungs-Schema
```typescript
// Sync-spezifische Verschlüsselung (zusätzlich zur normalen DB-Verschlüsselung)
interface SyncEncryption {
  // Shared Secret für Team (aus gemeinsamer Passphrase abgeleitet)
  teamKey: CryptoKey;
  
  // Pro-Sync-Nonce für Forward Secrecy
  syncNonce: Uint8Array;
  
  // AEAD für Authentizität + Vertraulichkeit
  algorithm: 'AES-GCM';
}
```

#### 5.2 Zugriffskontrollen
```typescript
interface SyncPermissions {
  // Nur bestimmte Nutzer dürfen Coordinator werden
  allowedCoordinators: string[];
  
  // Nur bestimmte Nutzer dürfen Sync-Ordner konfigurieren
  allowedSyncAdmins: string[];
  
  // Maximale Sync-Datei-Größe
  maxSyncFileSize: number;
}
```

### Phase 6: Robustheit & Monitoring

#### 6.1 Fehlerbehandlung
```typescript
interface SyncErrorHandling {
  // Retry-Logik für fehlgeschlagene Sync-Vorgänge
  retryPolicy: {
    maxRetries: number;
    backoffMs: number[];
  };
  
  // Fallback auf manuellen Export/Import bei Sync-Problemen
  manualFallback: boolean;
  
  // Sync-Ordner-Gesundheitsprüfung
  healthCheck: () => Promise<SyncHealth>;
}

interface SyncHealth {
  folderAccessible: boolean;
  manifestValid: boolean;
  encryptionWorking: boolean;
  diskSpaceOk: boolean;
}
```

#### 6.2 Audit & Logging
```typescript
interface SyncAuditLog {
  timestamp: string;
  user: string;
  action: 'snapshot-created' | 'delta-applied' | 'conflict-resolved';
  details: {
    recordsAffected: number;
    fileSize: number;
    syncDuration: number;
  };
}
```

## Implementierungs-Roadmap

### Woche 1: Grundlagen
- [x] SyncManager-Klasse implementieren
- [x] File System Access API-Integration
- [x] Basis-Verschlüsselung für Sync-Dateien

### Woche 2: Koordination
- [x] Manifest-System implementieren
- [x] Coordinator/Slave-Rollen-Logik
- [x] Snapshot-Export nach CSV-Import

### Woche 3: Auto-Sync
- [ ] Periodische Sync-Checks
- [ ] Delta-Import-Logik
- [ ] UI-Benachrichtigungen

### Woche 4: Robustheit
- [ ] Konfliktbehandlung
- [ ] Fehlerbehandlung & Retry-Logik
- [ ] Sync-Einstellungen-UI

## DSGVO-Compliance-Checkliste

✅ **Datenminimierung**: Nur notwendige Sync-Metadaten werden übertragen
✅ **Zweckbindung**: Sync dient ausschließlich der lokalen Datenverteilung
✅ **Technische Sicherheit**: Ende-zu-Ende-Verschlüsselung vor Cloud-Transit
✅ **Transparenz**: Nutzer sehen genau, welche Daten wann synchronisiert werden
✅ **Kontrolle**: Nutzer können Sync jederzeit deaktivieren
✅ **Speicherbegrenzung**: Automatische Bereinigung alter Sync-Dateien
✅ **Auditierbarkeit**: Vollständige Logs aller Sync-Vorgänge

## Technische Vorteile

1. **Nutzt bewährte Infrastruktur**: Microsoft 365 Sync Client ist hochoptimiert
2. **Offline-Robustheit**: Sync funktioniert auch bei temporären Netzwerkausfällen
3. **Skalierbarkeit**: Kann leicht auf mehr als 3 Nutzer erweitert werden
4. **Wartungsarm**: Keine eigene Server-Infrastruktur erforderlich
5. **Vertraut**: Nutzer kennen bereits OneDrive-Sync-Verhalten

## Nächste Schritte

1. **Proof of Concept**: Einfacher Snapshot-Export/Import implementieren
2. **File System Access API**: Integration für Sync-Ordner-Auswahl
3. **Verschlüsselungs-Pipeline**: Sync-spezifische Crypto-Layer
4. **UI-Integration**: Sync-Status und -Einstellungen in bestehende App
5. **Testing**: Ausgiebige Tests mit 3 lokalen App-Instanzen