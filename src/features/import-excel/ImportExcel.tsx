/**
 * Excel/CSV-Import mit Delta-Sync und Mapping-Presets
 */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import * as XLSX from 'xlsx';
import { CheckCircle, Upload, ArrowRight, ArrowLeft, AlertCircle, Eye, Plus, RefreshCw, FileSpreadsheet, Settings, FolderOpen } from 'lucide-react';
import { extractTablesFromHtml } from '../../utils/htmlTable';
import { sniffBuffer, firstBytesHex } from '../../utils/fileSniff';
import { validateRow, dedupeImport } from './validators';
import { buildRowKey, hashRow } from './dedupe';
import { autoMapHeaders, PRESET_AMS_DEFAULT } from './presets';
import { normalizeHeader } from './normalize';
import { COMPUTED_FIELDS, computeAllFields } from './computed';
import { savePreset, loadPreset } from './mappingPresets';
import { nowISO } from '../../utils/date';
import { db } from '../../data/db';
import { cryptoManager } from '../../data/crypto';
import { supportsFSAccess, isEmbedded, isBoltHost } from '../../utils/env';
import type { Client, ImportSession } from '../../domain/models';
import type { ImportMappedRow } from './types';

// Protected fields that won't be overwritten during sync
const PROTECTED_FIELDS: string[] = [
  'assignedTo',
  'priority', 
  'status',
  'result',
  'contactLog',
  'contactCount',
  'followUp'
];

type WizardStep = 'file' | 'mapping' | 'preview' | 'result';

interface ImportData {
  fileName: string;
  headers: string[];
  rows: unknown[][];
  mappedRows: ImportMappedRow[];
  validationResults: Array<{ ok: boolean; errors: string[]; warnings: string[] }>;
  duplicates: Array<{ indices: number[]; key: string; reason: string }>;
}

interface SyncPreview {
  new: Client[];
  updated: Array<{ existing: Client; updates: any; diff: string[] }>;
  removed: Client[];
}

export function ImportExcel() {
  const [step, setStep] = useState<WizardStep>('file');
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sourceId, setSourceId] = useState('');
  const [mode, setMode] = useState<'append' | 'sync'>('append');
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Sync-Optionen
  const [onlyEmptyFields, setOnlyEmptyFields] = useState(false);
  const [respectProtected, setRespectProtected] = useState(true);
  const [archiveRemoved, setArchiveRemoved] = useState(true);
  const [deleteOnlyInactive, setDeleteOnlyInactive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-Mapping für deutsche Spaltennamen (memoized)
  const autoMapping = useMemo(() => ({
    'nachname': 'lastName',
    'vorname': 'firstName',
    'titel': 'title',
    'anrede': 'title',
    'geburtsdatum': 'birthDate',
    'telefon': 'phone',
    'tel': 'phone',
    'email': 'email',
    'mail': 'email',
    'adresse': 'address',
    'status': 'status',
    'priorität': 'priority',
    'prio': 'priority',
    'angebot': 'angebot',
    'offer': 'angebot',
    'maßnahme': 'angebot',
    'ams': 'amsId',
    'ams-id': 'amsId',
    'kundennummer': 'amsId',
    'id': 'amsId',
    'termin': 'followUp',
    'datum': 'followUp',
    'wiedervorlage': 'followUp',
    'zubuchung': 'amsBookingDate',
    'zubuchungsdatum': 'amsBookingDate',
    'eintritt': 'entryDate',
    'austritt': 'exitDate',
    'notiz': 'note',
    'notes': 'note',
    'note': 'note',
    'bemerkung': 'note',
    'anmerkung': 'note',
    'ams berater': 'amsAdvisor',
    'ams_berater': 'amsAdvisor',
    'berater': 'amsAdvisor',
    'advisor': 'amsAdvisor',
    'betreuer': 'amsAdvisor'
  }), []);

  // Datei-Upload-Handler
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUploadError(null);
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    try {
      console.log(`📂 Reading file: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      
      const arrayBuffer = await file.arrayBuffer();
      const fileType = sniffBuffer(arrayBuffer, file.name, file.type);
      
      console.log(`🔍 File type detected: ${fileType} (Magic bytes: ${firstBytesHex(arrayBuffer)})`);
      
      let workbook: XLSX.WorkBook;
      
      if (fileType === 'html') {
        // HTML-Fallback: Tabellen extrahieren
        const text = new TextDecoder().decode(arrayBuffer);
        const tables = extractTablesFromHtml(text);
        
        if (tables.length === 0) {
          throw new Error('Keine Tabellen in HTML-Datei gefunden');
        }
        
        // Erste Tabelle verwenden
        const table = tables[0];
        const wsData = [table.headers, ...table.rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, ws, table.name);
        
        console.log(`🔄 HTML converted: ${table.headers.length} columns, ${table.rows.length} rows`);
        
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      } else if (fileType === 'csv') {
        const text = new TextDecoder().decode(arrayBuffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        throw new Error(`Nicht unterstütztes Dateiformat: ${fileType}. Magic bytes: ${firstBytesHex(arrayBuffer)}`);
      }
      
      // Erste Sheet verwenden
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Keine Arbeitsblätter gefunden');
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length < 2) {
        throw new Error('Keine Datenzeilen gefunden (nur Header oder leer)');
      }

      const headers = rawData[0] as string[];
      const rows = rawData.slice(1);

      // Auto-Mapping anwenden
      const detectedMapping: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (!header) return;
        const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const targetField = autoMapping[normalized];
        if (targetField) {
          detectedMapping[index.toString()] = targetField;
        }
      });

      // Zeilen zu Objekten mappen
      const mappedRows: ImportMappedRow[] = rows.map(row => {
        const mapped: ImportMappedRow = {} as ImportMappedRow;
        headers.forEach((header, index) => {
          const value = row[index];
          if (value != null && value !== '') {
            const targetField = detectedMapping[index.toString()] || header;
            (mapped as any)[targetField] = value;
          }
        });
        return mapped;
      });

      // Validierung
      const validationResults = mappedRows.map(row => validateRow(row));
      
      // Deduplizierung
      const { duplicates } = dedupeImport(mappedRows);

      setImportData({
        fileName: file.name,
        headers,
        rows,
        mappedRows,
        validationResults,
        duplicates
      });
      
      setMapping(detectedMapping);
      setStep('mapping');
      
      console.log(`✅ File processed: ${mappedRows.length} rows, ${Object.keys(detectedMapping).length} auto-mapped columns`);
      
    } catch (error) {
      console.error('❌ File processing failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Unbekannter Fehler beim Verarbeiten der Datei');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  }, [autoMapping]);

  // System File Picker
  const handleSystemPicker = useCallback(async () => {
    if (!supportsFSAccess()) {
      setUploadError('System-Dateidialog in dieser Umgebung nicht verfügbar');
      return;
    }

    try {
      setUploadError(null);
      setIsProcessing(true);
      
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{
          description: 'Excel/CSV-Dateien',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
          }
        }],
        multiple: false
      });
      
      const file = await handle.getFile();
      
      // Simuliere File-Input-Event
      const fakeEvent = {
        target: { files: [file], value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      
      await handleFileUpload(fakeEvent);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('📂 File picker cancelled by user');
        return;
      }
      
      console.error('❌ System picker failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Fehler beim System-Dateidialog');
    } finally {
      setIsProcessing(false);
    }
  }, [handleFileUpload]);

  // Mapping-Schritt weiter
  const handleMappingNext = useCallback(async () => {
    if (!importData) return;
    
    setIsProcessing(true);
    
    try {
      // Mapping-Preset speichern falls sourceId gesetzt
      if (sourceId) {
        await savePreset(sourceId, mapping);
      }
      
      // Sync-Vorschau erstellen falls Sync-Modus
      if (mode === 'sync') {
        await createSyncPreview();
      }
      
      setStep('preview');
      
    } catch (error) {
      console.error('❌ Mapping step failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Fehler beim Verarbeiten des Mappings');
    } finally {
      setIsProcessing(false);
    }
  }, [importData, sourceId, mapping, mode]);

  // Sync-Vorschau erstellen
  const createSyncPreview = useCallback(async () => {
    if (!importData || mode !== 'sync') return;
    
    try {
      await cryptoManager.getActiveKey();
      
      const existingClients = await Promise.all((await db.clients.toArray()) as any);
      const existingByRowKey = new Map<string, Client>();
      
      existingClients.forEach(client => {
        if (client.rowKey) {
          existingByRowKey.set(client.rowKey, client);
        }
      });
      
      const newItems: any[] = [];
      const updatedItems: SyncPreview['updated'] = [];
      
      importData.mappedRows.forEach(row => {
        const rowKey = buildRowKey(row);
        const rowHash = hashRow(row);
        const existing = existingByRowKey.get(rowKey);
        
        if (!existing) {
          newItems.push({
            ...row,
            id: crypto.randomUUID(),
            rowKey,
            sourceRowHash: rowHash,
            sourceId,
            contactCount: 0,
            contactLog: [],
            isArchived: false,
            lastImportedAt: nowISO(),
            lastSeenInSourceAt: nowISO()
          });
        } else if (existing.sourceRowHash !== rowHash) {
          // Aktualisiert
          const diff: string[] = [];
          const updates: any = {};
          Object.keys(row).forEach(key => {
            const newVal = row[key];
            const oldVal = (existing as any)[key];
            if (oldVal !== newVal) {
              const isProtected = respectProtected && PROTECTED_FIELDS.includes(key);
              if (isProtected) {
                diff.push(`${key}: "${oldVal}" → "${newVal}" (geschützt, nicht überschrieben)`);
              } else if (onlyEmptyFields && oldVal != null && oldVal !== '') {
                diff.push(`${key}: "${oldVal}" → "${newVal}" (übersprungen: onlyEmptyFields)`);
              } else {
                diff.push(`${key}: "${oldVal}" → "${newVal}"`);
                updates[key] = newVal;
              }
            }
          });
          
          updatedItems.push({
            existing,
            updates: {
              ...updates,
              sourceRowHash: rowHash,
              lastSeenInSourceAt: nowISO()
            },
            diff
          });
        }
      });
      
      // Entfallene finden
      const importRowKeys = new Set(importData.mappedRows.map(row => buildRowKey(row)));
      const removedItems = existingClients.filter(client => 
        client.sourceId === sourceId && 
        client.rowKey && 
        !importRowKeys.has(client.rowKey) &&
        !client.isArchived
      );
      
      setSyncPreview({
        new: newItems,
        updated: updatedItems,
        removed: removedItems
      });
      
    } catch (error) {
      console.error('Sync preview error:', error);
      throw error;
    }
  }, [importData, mode, sourceId, onlyEmptyFields, respectProtected]);

  // Import ausführen
  const executeImport = useCallback(async () => {
    if (!importData) return;
    
    setIsProcessing(true);
    
    try {
      await cryptoManager.getActiveKey();
      
      const stats = { created: 0, updated: 0, archived: 0, deleted: 0 };
      
      if (mode === 'append') {
        const clients: Client[] = importData.mappedRows.map(row => ({
          ...row,
          id: crypto.randomUUID(),
          rowKey: buildRowKey(row),
          sourceRowHash: hashRow(row),
          sourceId,
          contactCount: 0,
          contactLog: [],
          isArchived: false,
          lastImportedAt: nowISO(),
          lastSeenInSourceAt: nowISO(),
          source: {
            fileName: importData.fileName,
            importedAt: nowISO()
          }
        }));
        
        stats.created = await db.bulkCreate(clients);
        
      } else if (syncPreview) {
        if (syncPreview.new.length > 0) {
          stats.created = await db.bulkCreate(syncPreview.new);
        }
        
        if (syncPreview.updated.length > 0) {
          const patches = syncPreview.updated.map(item => ({
            id: item.existing.id,
            ...item.updates
          }));
          stats.updated = await db.bulkPatch(patches);
        }
        
        if (syncPreview.removed.length > 0) {
          const removedIds = syncPreview.removed.map(c => c.id);
          
          if (archiveRemoved) {
            stats.archived = await db.bulkArchive(removedIds, nowISO());
          } else {
            const toDelete = deleteOnlyInactive 
              ? syncPreview.removed.filter(c => c.contactLog.length === 0 && !c.assignedTo)
              : syncPreview.removed;
            
            if (toDelete.length > 0) {
              stats.deleted = await db.bulkDelete(toDelete.map(c => c.id));
            }
            
            const toArchive = syncPreview.removed.filter(c => !toDelete.includes(c));
            if (toArchive.length > 0) {
              stats.archived = await db.bulkArchive(toArchive.map(c => c.id), nowISO());
            }
          }
        }
      }
      
      const session: ImportSession = {
        id: crypto.randomUUID(),
        sourceId,
        createdAt: nowISO(),
        stats
      };
      
      await db.putImportSession(session);
      
      setResult({
        success: true,
        stats,
        session
      });
      
      setStep('result');
      
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  }, [importData, mode, sourceId, syncPreview, archiveRemoved, deleteOnlyInactive]);

  // Preset laden
  const loadMappingPreset = useCallback(async () => {
    if (!sourceId) return;
    
    try {
      const preset = await loadPreset(sourceId);
      if (preset) {
        setMapping(preset);
        console.log(`📂 Mapping preset loaded for: ${sourceId}`);
      }
    } catch (error) {
      console.warn('Failed to load mapping preset:', error);
    }
  }, [sourceId]);

  // Auto-Suggest Mapping basierend auf Header-Namen
  const autoSuggestMappings = useCallback(() => {
    if (!importData) return;
    
    const { mapping: detectedMapping, suggestions } = autoMapHeaders(
      importData.headers,
      PRESET_AMS_DEFAULT,
      0.5 // Confidence threshold
    );
    
    setMapping(detectedMapping);
    
    // Log suggestions für Debugging
    if (import.meta.env.DEV) {
      console.log(`🤖 Auto-mapping applied: ${Object.keys(detectedMapping).length} columns mapped`);
      suggestions.forEach(s => {
        if (s.repairs.length > 0) {
          console.log(`🔧 Mojibake repaired: ${s.repairs.join(', ')}`);
        }
        if (s.field) {
          console.log(`✅ ${s.header} → ${s.field} (${Math.round(s.confidence * 100)}%: ${s.reason})`);
        }
      });
    }
  }, [importData, autoMapping]);

  // Render-Funktionen
  const renderFileStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Excel/CSV-Datei auswählen
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Excel/CSV-Datei hochladen</p>
                <p className="text-gray-500">Unterstützt .xlsx, .xls, .csv und HTML-Tabellen</p>
              </div>
              
              <div className="mt-6 space-y-3">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.html"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 disabled:opacity-50"
                  />
                </div>
                
                {supportsFSAccess() && (
                  <div className="pt-2 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSystemPicker}
                      disabled={isProcessing}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      System-Dateidialog öffnen
                    </Button>
                  </div>
                )}
                
                {(isEmbedded() || isBoltHost()) && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2">
                    💡 In dieser Umgebung sind System-Dateidialoge eingeschränkt. 
                    Bitte den Datei-Auswählen-Button verwenden.
                  </div>
                )}
              </div>
            </div>
            
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Upload-Fehler</div>
                    <div className="mt-1">{uploadError}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
              <div className="font-medium mb-1">Unterstützte Formate</div>
              <div>
                <strong>Excel:</strong> .xlsx, .xls (automatische Erkennung)<br />
                <strong>CSV:</strong> .csv (UTF-8 empfohlen, Semikolon/Komma-Delimiter)<br />
                <strong>HTML-Fallback:</strong> .html mit Tabellen (für Web-Portal-Downloads)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Spalten-Mapping
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source-ID</label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  onBlur={loadMappingPreset}
                  placeholder="z.B. AMS-Export-KW36"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Eindeutige ID für diese Datenquelle (für Mapping-Presets)
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Import-Modus</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'append' | 'sync')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="append">Anhängen</option>
                  <option value="sync">Synchronisieren</option>
                </select>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">Spalten-Zuordnung</h4>
              <div className="mb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={autoSuggestMappings}
                  disabled={!importData}
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Automatische Zuordnung vorschlagen
                </Button>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  Erkennt deutsche Spaltennamen automatisch (inkl. Mojibake-Reparatur)
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {importData?.headers.map((header, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 border border-gray-100 rounded">
                    <div className="w-32 text-sm">
                      <div className="font-medium truncate" title={header}>
                        {normalizeHeader(header).repaired}
                      </div>
                      {normalizeHeader(header).repairs.length > 0 && (
                        <div className="text-xs text-green-600">
                          ✓ Encoding repariert
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <select
                      value={mapping[index.toString()] || ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        [index.toString()]: e.target.value
                      }))}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Ignorieren</option>
                      <option value="amsId">AMS-ID</option>
                      <option value="firstName">Vorname</option>
                      <option value="lastName">Nachname</option>
                      <option value="title">Titel</option>
                      <option value="birthDate">Geburtsdatum</option>
                      <option value="phone">Telefon</option>
                      <option value="email">E-Mail</option>
                      <option value="address">Adresse</option>
                      <option value="status">Status</option>
                      <option value="priority">Priorität</option>
                      <option value="angebot">Angebot</option>
                      <option value="followUp">Follow-up</option>
                      <option value="amsAdvisor">AMS-Berater</option>
                      <option value="note">Notiz</option>
                      <option value="gender">Geschlecht</option>
                      <option value="svNumber">SV-Nummer</option>
                      <option value="zip">PLZ</option>
                      <option value="city">Ort</option>
                      <option value="countryCode">Landesvorwahl</option>
                      <option value="areaCode">Vorwahl</option>
                      <option value="phoneNumber">Telefon-Nr</option>
                      <option value="amsAgentTitle">Titel Betreuer</option>
                      <option value="amsAgentFirstName">Vorname Betreuer</option>
                      <option value="amsAgentLastName">Nachname Betreuer</option>
                      <option value="measureNumber">Maßnahmennummer</option>
                      <option value="eventNumber">Veranstaltungsnummer</option>
                      <option value="internalCode">Interner Code</option>
                    </select>
                    <div className="w-24 text-xs text-gray-500">
                      {importData.rows.length > 0 && importData.rows[0][index] && (
                        <div className="truncate" title={String(importData.rows[0][index])}>
                          {String(importData.rows[0][index])}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {importData?.duplicates && importData.duplicates.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Duplikate gefunden</span>
                </div>
                <div className="text-sm text-yellow-700">
                  {importData.duplicates.length} Duplikat-Gruppen gefunden. 
                  Diese werden beim Import übersprungen.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Import-Vorschau
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mode === 'sync' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Sync-Optionen</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={onlyEmptyFields}
                      onChange={(e) => setOnlyEmptyFields(e.target.checked)}
                    />
                    <span className="text-sm">Nur leere Felder füllen</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={respectProtected}
                      onChange={(e) => setRespectProtected(e.target.checked)}
                    />
                    <span className="text-sm">Geschützte Felder respektieren</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={archiveRemoved}
                      onChange={(e) => setArchiveRemoved(e.target.checked)}
                    />
                    <span className="text-sm">Entfallene archivieren (statt löschen)</span>
                  </label>
                  {!archiveRemoved && (
                    <label className="flex items-center gap-2 ml-4">
                      <input
                        type="checkbox"
                        checked={deleteOnlyInactive}
                        onChange={(e) => setDeleteOnlyInactive(e.target.checked)}
                      />
                      <span className="text-sm">Löschen nur, wenn keine Aktivität</span>
                    </label>
                  )}
                </div>
                
                {syncPreview && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-success-500">
                          <Plus className="w-4 h-4 inline mr-2" />
                          Neu ({syncPreview.new.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          {syncPreview.new.length} neue Datensätze werden erstellt
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-warning-500">
                          <RefreshCw className="w-4 h-4 inline mr-2" />
                          Aktualisiert ({syncPreview.updated.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          {syncPreview.updated.length} bestehende Datensätze werden aktualisiert
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-error-500">
                          Entfallen ({syncPreview.removed.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-gray-600">
                          {syncPreview.removed.length} Datensätze sind nicht mehr in der Quelle
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
            
            <div className="text-sm text-gray-600">
              <strong>Datei:</strong> {importData?.fileName}<br />
              <strong>Zeilen:</strong> {importData?.mappedRows.length}<br />
              <strong>Modus:</strong> {mode === 'append' ? 'Anhängen' : 'Synchronisieren'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderResultStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            {result?.success ? (
              <CheckCircle className="w-5 h-5 text-success-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-error-500" />
            )}
            Import-Ergebnis
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result?.success ? (
          <div className="space-y-4">
            <div className="text-success-500 font-medium">
              Import erfolgreich abgeschlossen!
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success-500">
                  {result.stats.created}
                </div>
                <div className="text-sm text-gray-600">Erstellt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning-500">
                  {result.stats.updated}
                </div>
                <div className="text-sm text-gray-600">Aktualisiert</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500">
                  {result.stats.archived}
                </div>
                <div className="text-sm text-gray-600">Archiviert</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-error-500">
                  {result.stats.deleted}
                </div>
                <div className="text-sm text-gray-600">Gelöscht</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-error-500 font-medium">
              Import fehlgeschlagen
            </div>
            <div className="text-sm text-gray-600">
              {result?.error}
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <Button onClick={() => {
            setStep('file');
            setImportData(null);
            setMapping({});
            setSourceId('');
            setSyncPreview(null);
            setResult(null);
            setUploadError(null);
          }}>
            Neuen Import starten
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Navigation
  const canGoNext = () => {
    switch (step) {
      case 'file': return !!importData && !uploadError;
      case 'mapping': return !!sourceId;
      case 'preview': return (mode === 'append') || (mode === 'sync' && !!syncPreview);
      default: return false;
    }
  };

  const handleNext = () => {
    setUploadError(null);
    switch (step) {
      case 'file': setStep('mapping'); break;
      case 'mapping': handleMappingNext(); break;
      case 'preview': executeImport(); break;
    }
  };

  const handleBack = () => {
    setUploadError(null);
    switch (step) {
      case 'mapping': setStep('file'); break;
      case 'preview': setStep('mapping'); break;
      case 'result': setStep('preview'); break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Excel/CSV Import</h2>
        <div className="flex items-center gap-2">
          {['file', 'mapping', 'preview', 'result'].map((s, index) => (
            <Badge 
              key={s} 
              variant={s === step ? 'success' : index < ['file', 'mapping', 'preview', 'result'].indexOf(step) ? 'default' : 'default'}
            >
              {index + 1}
            </Badge>
          ))}
        </div>
      </div>

      {step === 'file' && renderFileStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'result' && renderResultStep()}

      {step !== 'result' && (
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 'file' || isProcessing}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canGoNext() || isProcessing}
          >
            {isProcessing ? 'Verarbeite...' : (
              step === 'preview' ? 'Import starten' : (
                <>
                  Weiter
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )
            )}
          </Button>
        </div>
      )}
    </div>
  );
}