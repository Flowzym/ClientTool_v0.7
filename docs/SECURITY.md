# Sicherheit & Betriebsprofile

## Betriebsprofile

Das Klient:innendaten-Tool unterstützt drei Betriebsprofile für verschiedene Einsatzszenarien:

### 1. PLAIN-Modus (`plain`)
- **Verwendung**: Nur für lokale Entwicklung und Tests
- **Verschlüsselung**: Keine - Daten werden unverschlüsselt gespeichert
- **Guardrails**: 
  - Blockiert auf Nicht-localhost-Umgebungen
  - Verbietet Production-Builds
  - Deaktiviert Export-Funktionen

### 2. DEV-ENC-Modus (`dev-enc`)
- **Verwendung**: Entwicklung mit Verschlüsselung
- **Verschlüsselung**: AES-GCM mit festem DEV-Key
- **Key-Quelle**: `VITE_DEV_MASTER_KEY` (Base64, 32 Bytes)

### 3. PROD-ENC-Modus (`prod-enc`)
- **Verwendung**: Produktive Umgebungen
- **Verschlüsselung**: AES-GCM mit Benutzer-Passphrase
- **Key-Quelle**: Argon2id-abgeleiteter Key aus Passphrase

## Konfiguration

### Umgebungsvariablen

Die App verwendet verschiedene `.env`-Dateien je nach Umgebung:

**Development** (`.env.development`):
```bash
VITE_ENCRYPTION_MODE=dev-enc          # plain | dev-enc | prod-enc
VITE_DB_NAMESPACE=clienttool          # DB-Name-Präfix
VITE_DEV_MASTER_KEY=dGVzdGtleWZvcmRldmVsb3BtZW50b25seWRvbm90dXNlaW5wcm9k
```

**Production** (`.env.production` oder CI):
```bash
VITE_ENCRYPTION_MODE=prod-enc         # Niemals 'plain' in Production!
VITE_DB_NAMESPACE=clienttool
# VITE_DEV_MASTER_KEY nicht benötigt in prod-enc
```

### Dev-Defaults

- **Development**: Fällt automatisch auf `dev-enc` zurück wenn `VITE_ENCRYPTION_MODE` nicht gesetzt
- **Production**: Strikte Validierung - Build bricht ab bei ungültigen/fehlenden Werten
- **DEV-Key-Management**: Automatische Generierung und localStorage-Persistierung

## DEV-ENC Key Management

### Option A: ENV-Variable (empfohlen)

Setzen Sie in `.env.development`:

```bash
VITE_DEV_MASTER_KEY=<32-Byte-Base64-Key>
```

Key generieren:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OpenSSL
openssl rand -base64 32
```

### Option B: Automatischer lokaler DEV-Key

Wenn `VITE_DEV_MASTER_KEY` nicht gesetzt ist:
- Wird automatisch ein 32-Byte-Key generiert
- Persistiert in `localStorage['dev_master_key_b64']`
- Konsole zeigt Warnung bei Erstgenerierung

### Risiken & Management

- **Key-Wechsel**: Alt-Daten werden unlesbar
- **DB-Reset empfohlen**: Bei Key-Änderung in Development
- **Sicherheit-Panel**: Zeigt Key-Quelle und Status

## Guardrails

### ENV-Validierung
- **Development**: Auto-Fallback auf `dev-enc` mit Warnung
- **Missing DEV-Key**: Fehler bei `dev-enc` ohne `VITE_DEV_MASTER_KEY`
- **Invalid Values**: Klare Fehlermeldungen mit Lösungshinweisen
- **CI/CD**: Explizite Variablen-Setzung erforderlich

### Build-Zeit
- **PLAIN im Production-Build**: Bricht Build mit Fehler ab
- **Fehlender DEV-Key**: Fehler bei dev-enc ohne `VITE_DEV_MASTER_KEY`

### Runtime
- **PLAIN auf Nicht-localhost**: Zeigt Blocker-Overlay
- **Export-Sperre**: Deaktiviert Exports im PLAIN-Modus

## Datenbank-Namespacing

Jeder Modus verwendet eine separate IndexedDB:
- `clienttool_plain`
- `clienttool_dev_enc` 
- `clienttool_prod_enc`

## Envelope-Format v1

Alle Daten werden in einheitlichen Envelopes gespeichert:

```typescript
interface EnvelopeV1 {
  // Meta-Daten (unverschlüsselt für Indizes)
  id?: string;
  amsId?: string;
  rowKey?: string;
  
  // Envelope-Info
  envelopeVersion: 'v1';
  mode: 'plain' | 'enc';
  createdAt: number;
  updatedAt: number;
  
  // Payload (je nach Modus)
  data?: any;           // plain
  nonce?: string;       // enc
  ciphertext?: string;  // enc
}
```

## Best Practices

1. **Development**: Verwenden Sie `dev-enc` mit festem Key
2. **Testing**: `plain` nur auf localhost für schnelle Tests
3. **Production**: Immer `prod-enc` mit starker Passphrase
4. **Key-Management**: DEV-Keys nicht in Git committen
5. **Migration**: Separate DBs pro Modus - keine automatische Migration

## Rollen & Berechtigungen (RBAC)

### Rollensystem

Das Tool implementiert ein rollenbasiertes Zugriffskontrollsystem (RBAC) mit drei Rollen:

| Rolle | Beschreibung | Zielgruppe |
|-------|--------------|------------|
| **admin** | Vollzugriff auf alle Funktionen | Systemadministratoren |
| **editor** | Bearbeitung und Import/Export | Sachbearbeitung |
| **user** | Nur Lesezugriff | Externe Betrachter |

### Berechtigungsmatrix

| Berechtigung | admin | editor | user | Beschreibung |
|--------------|-------|--------|------|--------------|
| `view_board` | ✅ | ✅ | ✅ | Board anzeigen |
| `update_status` | ✅ | ✅ | ❌ | Status/Priorität ändern |
| `assign` | ✅ | ✅ | ❌ | Zuweisungen verwalten |
| `edit_followup` | ✅ | ✅ | ❌ | Follow-up-Termine setzen |
| `import_data` | ✅ | ✅ | ❌ | Excel/PDF-Import |
| `export_data` | ✅ | ✅ | ❌ | Daten exportieren |
| `view_stats` | ✅ | ✅ | ✅ | Statistiken anzeigen |
| `view_security` | ✅ | ❌ | ❌ | Sicherheitseinstellungen |
| `run_migration` | ✅ | ❌ | ❌ | DB-Migrationen/Rewrap |
| `manage_users` | ✅ | ❌ | ❌ | Benutzer verwalten |

### UI-Verhalten

**Sichtbarkeitsprinzip**: Funktionen ohne Berechtigung werden **ausgeblendet** (nicht deaktiviert).

- **Navigation**: Menüpunkte erscheinen nur bei entsprechender Berechtigung
- **Board-Aktionen**: Status-Chips, Zuweisungen etc. nur für `editor`/`admin` sichtbar
- **Batch-Operationen**: Buttons je nach Rolle verfügbar
- **Routen-Schutz**: Direkter URL-Aufruf zeigt "Kein Zugriff"-Meldung

### Demo-Benutzer

In der Entwicklung stehen drei Demo-Benutzer zur Verfügung:

- **Admin User** (admin) - Vollzugriff
- **Editor User** (editor) - Standard-Sachbearbeitung  
- **Standard User** (user) - Nur Lesezugriff

**User-Switcher**: In Development-Builds erscheint ein User-Switcher im Header zum schnellen Rollenwechsel.

### Technische Umsetzung

- **AuthProvider**: React Context für aktuelle Rolle und Berechtigungen
- **Route Guards**: `<Require perms={[...]}>` Komponente für Seitenschutz
- **UI Guards**: `<Can perm="...">` Komponente für Element-Sichtbarkeit
- **Persistierung**: Aktuelle Benutzer-ID in IndexedDB KV-Store
- **Fallback**: Automatische Zuweisung zu Editor-Rolle bei fehlendem Benutzer