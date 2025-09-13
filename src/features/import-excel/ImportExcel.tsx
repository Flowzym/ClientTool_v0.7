/**
 * Excel-Import-Wizard mit Delta-Sync
 */
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { 
  CheckCircle, 
  FolderOpen, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Plus, 
  Download, 
  X, 
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { sniffBuffer, firstBytesHex } from '../../utils/fileSniff';
import { extractTablesFromHtml } from '../../utils/htmlTable';
import { PreviewGrid } from './previewGrid';
import { validateRow, dedupeImport } from './validators';
import { buildRowKey, hashRow } from './dedupe';
import { savePreset, loadPreset } from './mappingPresets';
import { nowISO, parseToISO } from '../../utils/date';
import { db } from '../../data/db';
import { cryptoManager } from '../../data/crypto';
import { supportsFSAccess, isEmbedded, isBoltHost } from '../../utils/env';
import type { Client, ImportSession } from '../../domain/models';
import { syncManager } from '../sync/SyncManager';
import { importService } from '../../services/ImportService';

type WizardStep = 'file' | 'mapping' | 'validation' | 'preview' | 'result';

interface ImportData {
  fileName: string;
  sheets: string[];
  selectedSheet: string;
  headers: string[];
  rows: any[][];
  mappedData: any[];
}

interface MappingConfig {
  [sourceColumn: string]: string; // Ziel-Feld
}

interface SyncPreview {
  new: any[];
  updated: Array<{ existing: Client; updates: any; diff: string[] }>;
  removed: Client[];
}

const TARGET_FIELDS = [
  { key: 'amsId', label: 'AMS-ID', required: false },
  { key: 'title', label: 'Titel', required: false },
  { key: 'firstName', label: 'Vorname', required: true },
  { key: 'lastName', label: 'Nachname', required: true },
  { key: 'gender', label: 'Geschlecht', required: false },
  { key: 'svNumber', label: 'SV-Nummer', required: false },
  { key: 'birthDate', label: 'Geburtsdatum', required: false },
  { key: 'zip', label: 'PLZ', required: false },
  { key: 'city', label: 'Ort', required: false },
  { key: 'address', label: 'Adresse', required: false },
  { key: 'countryCode', label: 'Landesvorwahl', required: false },
  { key: 'areaCode', label: 'Vorwahl', required: false },
  { key: 'phoneNumber', label: 'Telefonnummer', required: false },
  { key: 'phone', label: 'Telefon (kombiniert)', required: false },
  { key: 'email', label: 'E-Mail', required: false },
  { key: 'note', label: 'Anmerkung', required: false },
  { key: 'amsBookingDate', label: 'Zubuchungsdatum (AMS)', required: false },
  { key: 'entryDate', label: 'Eintritt (gebucht)', required: false },
  { key: 'exitDate', label: 'Austritt (abgebucht)', required: false },
  { key: 'amsAgentLastName', label: 'Nachname AMS Betreuer', required: false },
  { key: 'amsAgentFirstName', label: 'Vorname AMS Betreuer', required: false },
  { key: 'priority', label: 'Priorität', required: true },
  { key: 'status', label: 'Status', required: true },
  { key: 'result', label: 'Ergebnis', required: false },
  { key: 'followUp', label: 'Termin/Wiedervorlage', required: false }
];

const PROTECTED_FIELDS: string[] = [
  'assignedTo',
  'priority',
  'status',
  'result',
  'contactLog',
  'contactCount',
];


export function ImportExcel() {
  const [step, setStep] = useState<WizardStep>('file');
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [mapping, setMapping] = useState<MappingConfig>({});
  const [sourceId, setSourceId] = useState('');
  const [mode, setMode] = useState<'append' | 'sync'>('append');
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    skipped: number;
    warnings: string[];
  } | null>(null);
  
  // Optionen
  const [onlyEmptyFields, setOnlyEmptyFields] = useState(false);
  const [respectProtected, setRespectProtected] = useState(true);
  const [archiveRemoved, setArchiveRemoved] = useState(true);
  const [deleteOnlyInactive, setDeleteOnlyInactive] = useState(true);

  // Datei-Upload-Handler (robust für alle Umgebungen)
  const readSelectedFile = useCallback(async (file: File): Promise<XLSX.WorkBook> => {
    const fileName = file.name || 'upload';
    
    // Format-Validierung basierend auf Dateiendung
    const validExt = /\.(xlsx|xls|csv)$/i.test(fileName);
    if (!validExt) {
      throw new Error('Nicht unterstütztes Format. Erlaubt: .xlsx, .xls, .csv');
    }

    // Größen-Check (Soft-Limit)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      console.warn(`Large file detected: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    }

    try {
      console.log(`📂 Reading file: ${fileName} (${(file.size / 1024).toFixed(1)}KB, type: ${file.type})`);
      
      // 1) Immer zuerst ArrayBuffer für Magic-Number-Sniffing
      const arrayBuffer = await file.arrayBuffer();
      const fileType = sniffBuffer(arrayBuffer, fileName, file.type);
      
      console.log(`🔍 Detected file type: ${fileType}, magic bytes: ${firstBytesHex(arrayBuffer)}`);
      
      // 2) HTML abfangen (häufig bei falsch gelieferten Files)
      if (fileType === 'html') {
        const text = await file.text();
        const tables = extractTablesFromHtml(text);
        
        if (tables.length === 0) {
          throw new Error('Die Datei ist HTML ohne Tabellen (vermutlich Download-/Login-Seite). Bitte im Quellsystem als .xlsx/.csv exportieren oder die Original-Datei in Excel/LibreOffice öffnen und als .xlsx speichern.');
        }
        
        console.log(`📊 HTML tables found: ${tables.length}`);
        
        // Für jetzt: erste Tabelle verwenden (TODO: Multi-Tabellen-Auswahl)
        const selectedTable = tables[0];
        const aoa = [selectedTable.headers, ...selectedTable.rows];
        
        // Prüfe ob genug Daten vorhanden sind
        if (aoa.length < 2 || aoa[0].length === 0) {
          throw new Error('HTML-Tabelle enthält keine verwertbaren Daten. Bitte prüfen Sie die Quelldatei.');
        }
        
        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, selectedTable.name || 'Tabelle');
        
        // Kennzeichnen als HTML-Fallback für UI-Hinweis
        (workbook as any).__htmlFallback = true;
        (workbook as any).__htmlTableCount = tables.length;
        
        console.log('✅ HTML table converted to workbook successfully');
        return workbook;
      }
      
      // 3) CSV separat behandeln - IMMER als String
      if (fileType === 'csv') {
        const text = await file.text();
        const workbook = XLSX.read(text, { 
          type: 'string',
          codepage: 65001 // UTF-8
        });
        return workbook;
      }
      
      // 4) XLSX/XLS strikt als ArrayBuffer (Uint8Array) parsen
      if (fileType === 'xlsx' || fileType === 'xls') {
        try {
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), { 
            type: 'array',
            cellDates: true,
            cellNF: false
          });
          return workbook;
        } catch (parseError) {
          console.warn('❌ Array parsing failed for Excel file:', parseError);
          throw new Error(`Excel-Datei konnte nicht gelesen werden. Magic-Bytes: ${firstBytesHex(arrayBuffer)}. Hinweis: Öffnen Sie die Datei in Excel/LibreOffice und speichern Sie sie erneut als .xlsx.`);
        }
      }
      
      // 5) Unknown → heuristisch versuchen: erst Array, dann String
      try {
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { 
          type: 'array',
          cellDates: true,
          cellNF: false
        });
        return workbook;
      } catch (arrayError) {
        console.warn('🔄 Array parsing failed, trying string fallback...');
        try {
          const text = await file.text();
          const workbook = XLSX.read(text, { 
            type: 'string',
            raw: true,
            codepage: 65001
          });
          console.log('✅ String fallback successful');
          return workbook;
        } catch (stringError) {
          console.error('❌ Both parsing methods failed:', { arrayError, stringError });
          throw new Error(`Datei konnte nicht gelesen werden. Magic-Bytes: ${firstBytesHex(arrayBuffer)}. Versuchen Sie eine andere Datei oder einen lokalen Build.`);
        }
      }
      
    } catch (error) {
      console.error('❌ File reading failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('credentialless') || error.message.includes('cross-origin')) {
          throw new Error('Datei-Upload in dieser Umgebung eingeschränkt. Versuchen Sie eine kleinere Datei oder nutzen Sie einen lokalen Build.');
        }
        throw error; // Re-throw mit ursprünglicher Nachricht
      }
      
      throw new Error('Unbekannter Fehler beim Lesen der Datei');
    }
  }, []);

  // Schritt 1: Datei-Upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUploadError(null);
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    readSelectedFile(file)
      .then(workbook => {
        const sheets = workbook.SheetNames;
        const firstSheet = sheets[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const headers = jsonData[0] || [];
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        
        if (headers.length === 0) {
          throw new Error('Keine Spalten-Header gefunden');
        }
        
        if (rows.length === 0) {
          throw new Error('Keine Datenzeilen gefunden');
        }
        
        // Prüfe auf HTML-Fallback und zeige Hinweis
        const isHtmlFallback = (workbook as any).__htmlFallback;
        const htmlTableCount = (workbook as any).__htmlTableCount || 1;
        
        setImportData({
          fileName: file.name,
          sheets,
          selectedSheet: firstSheet,
          headers,
          rows,
          mappedData: [],
          isHtmlFallback,
          htmlTableCount
        });
        
        setStep('mapping');
        console.log(`✅ File parsed: ${rows.length} rows, ${headers.length} columns${isHtmlFallback ? ' (HTML fallback)' : ''}`);
      })
      .catch(error => {
        console.error('❌ File upload failed:', error);
        setUploadError(error instanceof Error ? error.message : 'Unbekannter Fehler beim Lesen der Datei');
      })
      .finally(() => {
        setIsProcessing(false);
        // Input zurücksetzen für erneuten Upload
        event.target.value = '';
      });
  }, [readSelectedFile]);

  // System File Picker (nur außerhalb Embed)
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
          description: 'Excel/CSV Dateien',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
          }
        }],
        multiple: false
      });
      
      const file = await handle.getFile();
      await readSelectedFile(file);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled - nicht als Fehler behandeln
        console.log('📂 File picker cancelled by user');
        return;
      }
      
      console.error('❌ System picker failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Fehler beim System-Dateidialog');
    } finally {
      setIsProcessing(false);
    }
  }, [readSelectedFile]);

  // Auto-Mapping basierend auf Header-Namen
  const autoGuessMapping = useCallback(() => {
    if (!importData) return;
    
    const guessed: MappingConfig = {};
    const headerLower = importData.headers.map(h => h.toLowerCase());
    
    const mappingHints: Record<string, string[]> = {
      amsId: ['ams', 'kundennummer', 'id'],
      title: ['titel', 'anrede'],
      firstName: ['vorname'],
      lastName: ['nachname'],
      gender: ['geschlecht', 'm/w', 'mw'],
      svNumber: ['sv-nummer', 'svnr', 'sozialversicherungsnummer'],
      birthDate: ['geburtsdatum', 'gebdat', 'geb.,'],
      zip: ['plz', 'postleitzahl'],
      city: ['ort', 'stadt'],
      address: ['adresse', 'strasse', 'straße'],
      countryCode: ['landesvorwahl', 'country code'],
      areaCode: ['vorwahl', 'area code'],
      phoneNumber: ['telefonnummer', 'telefon', 'tel.', 'telefon-nr', 'telefon-nr.'],
      phone: ['telefon (kombiniert)', 'telefon', 'tel'],
      email: ['mailadresse', 'e-mail', 'email'],
      note: ['anmerkung', 'notiz', 'bemerkung'],
      amsBookingDate: ['zubuchungsdatum', 'zubuchung (ams)', 'zubuchungsdatum (ams)', 'zubuchung'],
      entryDate: ['eintritt', 'eintritt (gebucht)'],
      exitDate: ['austritt', 'austritt (abgebucht)'],
      amsAgentLastName: ['nachname ams betreuer', 'ams betreuer nachname', 'familien-/nachname betreuer', 'nachname betreuer'],
      amsAgentFirstName: ['vorname ams betreuer', 'ams betreuer vorname', 'vorname betreuer'],
      priority: ['prio', 'priorität'],
      status: ['status', 'buchungsstatus'],
      result: ['ergebnis'],
      followUp: ['termin', 'termin vereinbart für', 'wiedervorlage', 'geplant']
    };
    
    Object.entries(mappingHints).forEach(([targetField, hints]) => {
      const matchIndex = headerLower.findIndex(header => 
        hints.some(hint => header.includes(hint))
      );
      
      if (matchIndex >= 0) {
        guessed[importData.headers[matchIndex]] = targetField;
      }
    });
    
    setMapping(guessed);
  }, [importData]);

  // Schritt 2: Mapping konfigurieren
  const handleMappingNext = useCallback(async () => {
    if (!importData) return;
    
    setIsProcessing(true);
    
    try {
      // Sync-Vorschau erstellen falls Sync-Modus
      if (mode === 'sync') {
        // Sicherstellen, dass Crypto-Key verfügbar ist
        await cryptoManager.getActiveKey();
        
        // Bestehende Clients laden
        const existingClients = (await Promise.all((await db.clients.toArray()) as any));
        const existingByRowKey = new Map<string, Client>();
        
        existingClients.forEach(client => {
          if (client.rowKey) {
            existingByRowKey.set(client.rowKey, client);
          }
        });
        
        const newItems: any[] = [];
        const updatedItems: SyncPreview['updated'] = [];
        const seenRowKeys = new Set<string>();
        
        // Import-Daten verarbeiten
        importData.rows.map(row => {
          const mapped: any = {};
          Object.entries(mapping).forEach(([sourceCol, targetField]) => {
            const colIndex = importData.headers.indexOf(sourceCol);
            if (colIndex >= 0) {
              let value = row[colIndex];
              // Datum-Parsing
              if (['birthDate', 'followUp', 'amsBookingDate', 'entryDate', 'exitDate'].includes(targetField) && value) {
                value = parseToISO(String(value)) || value;
              }
              mapped[targetField] = value;
            }
          });
          return mapped;
        }).forEach(row => {
          const rowKey = buildRowKey(row);
          const rowHash = hashRow(row);
          seenRowKeys.add(rowKey);
          
          const existing = existingByRowKey.get(rowKey);
          
          if (!existing) {
            // Neu
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
            // Aktualisiert mit Merge-Regeln
            const diff: string[] = [];
            const updates: any = {};
            Object.keys(row).forEach(key => {
              const newVal = (row as any)[key];
              const oldVal = (existing as any)[key];
              if (oldVal !== newVal) {
                const isProtected = respectProtected && PROTECTED_FIELDS.includes(key);
                const onlyEmpty = onlyEmptyFields && (oldVal !== null && oldVal !== undefined && String(oldVal).trim() !== '');
                if (isProtected) {
                  diff.push(`${key}: "${oldVal}" → "${newVal}" (geschützt, nicht überschrieben)`);
                } else if (onlyEmpty) {
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
        const removedItems = existingClients.filter(client => 
          client.sourceId === sourceId && 
          client.rowKey && 
          !seenRowKeys.has(client.rowKey) &&
          !client.isArchived
        );
        
        setSyncPreview({
          new: newItems,
          updated: updatedItems,
          removed: removedItems
        });
      }
    } catch (error) {
      console.error('Sync preview error:', error);
      if (importSummary) {
        importSummary.warnings.push({
          type: 'sync-preview',
          row: 0,
          column: '',
          value: '',
          message: 'Fehler beim Erstellen der Sync-Vorschau'
        });
      }
      return;
    } finally {
      setIsProcessing(false);
    }
    
    // Daten mappen
    const mappedData = importData.rows.map(row => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([sourceCol, targetField]) => {
        const colIndex = importData.headers.indexOf(sourceCol);
        if (colIndex >= 0) {
          let value = row[colIndex];
          // Datum-Parsing
          if (['birthDate', 'followUp', 'amsBookingDate', 'entryDate', 'exitDate'].includes(targetField) && value) {
            value = parseToISO(String(value)) || value;
          }
          mapped[targetField] = value;
        }
      });
      // CSV-Originalwert für Anzeige merken
      try {
        const idxStatus = importData.headers.indexOf('Buchungsstatus');
        if (idxStatus >= 0) {
          const raw = row[idxStatus];
          const label = (raw == null) ? '' : String(raw).trim();
          if (label) (mapped as any).statusLabel = label;
        }
      } catch {}

      // Telefon zusammenbauen, falls Teile vorhanden
      if (!mapped.phone) {
        const parts = [mapped.countryCode, mapped.areaCode, mapped.phoneNumber]
          .map((p: any) => (p ?? '').toString().trim())
          .filter(Boolean);
        if (parts.length > 0) mapped.phone = parts.join(' ');
      }
      
      // CSV-Werte an App-Modell anpassen
      const toISO = (val: any) => {
        if (val == null) return val;
        const s = String(val).trim();
        if (!s) return undefined;
        // dd.mm.yyyy -> yyyy-mm-dd
        const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (m) {
          const d = m[1].padStart(2,'0'), mo = m[2].padStart(2,'0'), y = m[3];
          return `${y}-${mo}-${d}`;
        }
        // already ISO-like
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
        return undefined;
      };
      if (mapped.followUp) mapped.followUp = toISO(mapped.followUp) ?? mapped.followUp;
      if (mapped.amsBookingDate) mapped.amsBookingDate = toISO(mapped.amsBookingDate) ?? mapped.amsBookingDate;
      if (mapped.entryDate) mapped.entryDate = toISO(mapped.entryDate) ?? mapped.entryDate;
      if (mapped.exitDate) mapped.exitDate = toISO(mapped.exitDate) ?? mapped.exitDate;

      if (mapped.status) {
        const v = String(mapped.status).toLowerCase();
        if (v.includes('bewilligt')) mapped.status = 'inBearbeitung';
        else if (v.includes('absolviert')) mapped.status = 'erledigt';
        else if (v.includes('eingetreten')) mapped.status = 'inBearbeitung';
        else if (v.includes('interessiert')) mapped.status = 'offen';
      }

      // Betreuer → assignedTo (falls leer)
      if (!mapped.assignedTo) {
        const fn = (mapped as any).amsAgentFirstName || (mapped as any)['Vorname Betreuer'];
        const ln = (mapped as any).amsAgentLastName || (mapped as any)['Familien-/Nachname Betreuer'];
        const ready = [fn, ln].filter(Boolean).join(' ').trim();
        if (ready) mapped.assignedTo = ready;
      }
      return mapped;
    });
    setImportData(prev => prev ? { ...prev, mappedData } : null);
    
    // Preset speichern wenn sourceId vorhanden
    if (sourceId) {
      await savePreset(sourceId, mapping);
    }
    
    setStep('validation');
  }, [importData, mapping, sourceId, mode, respectProtected, onlyEmptyFields]);

  // Schritt 3: Validierung
  const handleValidation = useCallback(() => {
    if (!importData) return;
    
    const results = importData.mappedData.map(validateRow);
    setValidationResults(results);
    
    const dedupeResult = dedupeImport(importData.mappedData);
    console.log('Duplicates found:', dedupeResult.duplicates);
    
    setStep('preview');
  }, [importData]);

  // Schritt 4: Sync-Vorschau erstellen
  const createSyncPreview = useCallback(async () => {
    if (!importData || mode !== 'sync') return;
    
    setIsProcessing(true);
    
    try {
      // Sicherstellen, dass Crypto-Key verfügbar ist
      await cryptoManager.getActiveKey();
      
      // Bestehende Clients laden
      const existingClients = (await Promise.all((await db.clients.toArray()) as any));
      const existingByRowKey = new Map<string, Client>();
      
      existingClients.forEach(client => {
        if (client.rowKey) {
          existingByRowKey.set(client.rowKey, client);
        }
      });
      
      const newItems: any[] = [];
      const updatedItems: SyncPreview['updated'] = [];
      const seenRowKeys = new Set<string>();
      
      // Import-Daten verarbeiten
      importData.mappedData.forEach(row => {
        const rowKey = buildRowKey(row);
        const rowHash = hashRow(row);
        seenRowKeys.add(rowKey);
        
        const existing = existingByRowKey.get(rowKey);
        
        if (!existing) {
          // Neu
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
          // Aktualisiert mit Merge-Regeln
          const diff: string[] = [];
          const updates: any = {};
          Object.keys(row).forEach(key => {
            const newVal = (row as any)[key];
            const oldVal = (existing as any)[key];
            if (oldVal !== newVal) {
              const isProtected = respectProtected && PROTECTED_FIELDS.includes(key);
              const onlyEmpty = onlyEmptyFields && (oldVal !== null && oldVal !== undefined && String(oldVal).trim() !== '');
              if (isProtected) {
                diff.push(`${key}: "${oldVal}" → "${newVal}" (geschützt, nicht überschrieben)`);
              } else if (onlyEmpty) {
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
      const removedItems = existingClients.filter(client => 
        client.sourceId === sourceId && 
        client.rowKey && 
        !seenRowKeys.has(client.rowKey) &&
        !client.isArchived
      );
      
      setSyncPreview({
        new: newItems,
        updated: updatedItems,
        removed: removedItems
      });
    } catch (error) {
      console.error('Sync preview error:', error);
      setImportSummary(prev => prev ? {
        ...prev,
        warnings: [...(prev.warnings || []), {
          type: 'sync-preview',
          message: `Sync-Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
        }]
      } : null);
    } finally {
      setIsProcessing(false);
    }
  }, [importData, mode, sourceId, respectProtected, onlyEmptyFields]);

  // Schritt 5: Import ausführen
  const executeImport = useCallback(async () => {
    if (!importData) return;
    
    setIsProcessing(true);
    
    try {
      // Sicherstellen, dass Crypto-Key verfügbar ist
      await cryptoManager.getActiveKey();
      
      let stats = { created: 0, updated: 0, archived: 0, deleted: 0 };
      
      if (mode === 'append') {
        // Anhängen-Modus
        const clients: Client[] = importData.mappedData.map(row => ({
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
        // Synchronisieren-Modus
        
        // Neue erstellen
        if (syncPreview.new.length > 0) {
          stats.created = await db.bulkCreate(syncPreview.new);
        }
        
        // Aktualisierte patchen
        if (syncPreview.updated.length > 0) {
          const patches = syncPreview.updated.map(item => ({
            id: item.existing.id,
            ...item.updates
          }));
          stats.updated = await db.bulkPatch(patches);
        }
        
        // Entfallene behandeln
        if (syncPreview.removed.length > 0) {
          const removedIds = syncPreview.removed.map(c => c.id);
          
          if (archiveRemoved) {
            stats.archived = await db.bulkArchive(removedIds, nowISO());
          } else {
            // Nur löschen wenn keine Aktivität
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
      
      // Import-Session speichern
      const session: ImportSession = {
        id: crypto.randomUUID(),
        sourceId,
        createdAt: nowISO(),
        stats
      };
      
      await db.putImportSession(session);
      
      // Auto-Snapshot für Team-Sync (falls Coordinator)
      try {
        const isCoordinator = await db.getKV('sync:isCoordinator');
        if (isCoordinator && stats.created + stats.updated > 0) {
          await syncManager.createSnapshot();
          console.log('✅ Sync: Team-Snapshot nach Import erstellt');
        }
      } catch (syncError) {
        console.warn('⚠️ Sync: Snapshot-Erstellung fehlgeschlagen:', syncError);
        // Sync-Fehler sollen Import nicht blockieren
      }
      
      setResult({
        success: true,
        stats,
        session
      });
      
      setStep('result');
      
    } catch (error) {
      console.error('Import error:', error);
      setImportSummary({
        imported: 0,
        skipped: 0,
        warnings: [error instanceof Error ? error.message : 'Unbekannter Fehler']
      });
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
  const handleLoadPreset = useCallback(async () => {
    if (!sourceId) return;
    
    const preset = await loadPreset(sourceId);
    if (preset) {
      setMapping(preset);
    }
  }, [sourceId]);

  // Render-Funktionen für jeden Schritt
  const renderFileStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Datei auswählen
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Excel- oder CSV-Datei hochladen</p>
                <p className="text-gray-500">Unterstützte Formate: .xlsx, .xls, .csv</p>
              </div>
              
              <div className="mt-6 space-y-3">
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
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
            
            {importData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Datei-Info</h4>
                <div className="text-sm space-y-1">
                  <div>Datei: {importData.fileName}</div>
                  <div>Sheets: {importData.sheets.join(', ')}</div>
                  <div>Zeilen: {importData.rows.length}</div>
                  <div>Spalten: {importData.headers.length}</div>
                  {importData.isHtmlFallback && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <div className="flex items-center gap-1 text-yellow-700">
                        <AlertCircle className="w-3 h-3" />
                        <span className="font-medium">HTML-Tabellen-Import (Fallback)</span>
                      </div>
                      <div className="text-yellow-600 mt-1">
                        {importData.htmlTableCount > 1 
                          ? `${importData.htmlTableCount} Tabellen gefunden, erste wird verwendet. `
                          : 'HTML-Tabelle wurde konvertiert. '
                        }
                        Für verlässliche Ergebnisse bitte im Quellsystem als .xlsx/.csv exportieren.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Import-Summary */}
        {importSummary && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Import-Zusammenfassung</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Importiert</div>
                <div className="font-semibold text-success-500">{importSummary.imported}</div>
              </div>
              <div>
                <div className="text-gray-500">Übersprungen</div>
                <div className="font-semibold text-warning-500">{importSummary.skipped}</div>
              </div>
              <div>
                <div className="text-gray-500">Warnungen</div>
                <div className="font-semibold text-error-500">{importSummary.warnings.length}</div>
              </div>
            </div>
            {importSummary.warnings.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                <details>
                  <summary className="cursor-pointer">Warnungen anzeigen</summary>
                  <ul className="mt-1 list-disc ml-4">
                    {importSummary.warnings.slice(0, 10).map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                    {importSummary.warnings.length > 10 && (
                      <li>... und {importSummary.warnings.length - 10} weitere</li>
                    )}
                  </ul>
                </details>
              </div>
            )}
          </div>
        )}
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
            {/* Source-ID und Aktionen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Source-ID (für Presets)
                </label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  placeholder="z.B. AMS-Export-KW36"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="ghost" onClick={autoGuessMapping}>
                  Auto-Mapping
                </Button>
                <Button variant="ghost" onClick={handleLoadPreset} disabled={!sourceId}>
                  Preset laden
                </Button>
              </div>
            </div>
            
            {/* Mapping-Tabelle */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">Spalten-Zuordnung</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Ordnen Sie die Excel-Spalten den Zielfeldern zu
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/3">
                        Zielfeld
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/3">
                        Excel-Spalte
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/3">
                        Vorschau
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {TARGET_FIELDS.map(field => {
                      const mappedColumn = Object.entries(mapping).find(([_, target]) => target === field.key)?.[0];
                      const columnIndex = mappedColumn ? importData?.headers.indexOf(mappedColumn) : -1;
                      const previewValue = columnIndex >= 0 && importData?.rows[0] 
                        ? importData.rows[0][columnIndex] 
                        : null;
                      
                      return (
                        <tr key={field.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {field.label}
                              </span>
                              {field.required && (
                                <span className="text-red-500 text-xs">*</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={mappedColumn || ''}
                              onChange={(e) => {
                                const newMapping = { ...mapping };
                                
                                // Entferne alte Zuordnung
                                Object.keys(newMapping).forEach(key => {
                                  if (newMapping[key] === field.key) {
                                    delete newMapping[key];
                                  }
                                });
                                
                                // Setze neue Zuordnung
                                if (e.target.value) {
                                  newMapping[e.target.value] = field.key;
                                }
                                
                                setMapping(newMapping);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="">-- Nicht zuordnen --</option>
                              {importData?.headers.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600 font-mono max-w-xs truncate">
                              {previewValue ? String(previewValue) : '—'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Mapping-Statistik */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {Object.keys(mapping).length} von {TARGET_FIELDS.length} Feldern zugeordnet
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {TARGET_FIELDS.filter(f => f.required).length} Pflichtfelder
                    </span>
                    <Badge variant={
                      TARGET_FIELDS.filter(f => f.required).every(f => 
                        Object.values(mapping).includes(f.key)
                      ) ? 'success' : 'warning'
                    } size="sm">
                      {TARGET_FIELDS.filter(f => f.required && Object.values(mapping).includes(f.key)).length}/
                      {TARGET_FIELDS.filter(f => f.required).length}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {importData && (
        <Card>
          <CardHeader>
            <CardTitle>Daten-Vorschau</CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewGrid data={importData.rows.slice(0, 10).map(row => {
              const mapped: any = {};
              importData.headers.forEach((header, index) => {
                mapped[header] = row[index];
              });
              return mapped;
            })} />
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderValidationStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Validierung & Dubletten-Check
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Badge variant={validationResults.filter(r => !r.ok).length === 0 ? 'success' : 'error'}>
              {validationResults.filter(r => !r.ok).length} Fehler
            </Badge>
            <Badge variant="warning">
              {validationResults.reduce((sum, r) => sum + r.warnings.length, 0)} Warnungen
            </Badge>
          </div>
          
          {importData && (
            <PreviewGrid 
              data={importData.mappedData} 
              validationResults={validationResults}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Import-Modus & Vorschau
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Source-ID</label>
              <input
                type="text"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="z.B. AMS-Export-KW36"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Import-Modus</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="append"
                    checked={mode === 'append'}
                    onChange={(e) => setMode(e.target.value as 'append')}
                  />
                  <span>Anhängen - Alle Datensätze hinzufügen</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="sync"
                    checked={mode === 'sync'}
                    onChange={(e) => setMode(e.target.value as 'sync')}
                  />
                  <span>Synchronisieren - Delta-Sync mit bestehenden Daten</span>
                </label>
              </div>
            </div>
            
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
                
                <Button 
                  onClick={createSyncPreview} 
                  disabled={!sourceId || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Erstelle Vorschau...' : 'Vorschau erstellen'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
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
      case 'mapping': return Object.keys(mapping).length > 0 && sourceId;
      case 'validation': return validationResults.filter(r => !r.ok).length === 0;
      case 'preview': return (mode === 'append') || (mode === 'sync' && syncPreview);
      default: return false;
    }
  };

  const handleNext = () => {
    setUploadError(null); // Clear errors when proceeding
    switch (step) {
      case 'file': setStep('mapping'); break;
      case 'mapping': handleMappingNext(); break;
      case 'validation': handleValidation(); break;
      case 'preview': executeImport(); break;
    }
  };

  const handleBack = () => {
    setUploadError(null); // Clear errors when going back
    switch (step) {
      case 'mapping': setStep('file'); break;
      case 'validation': setStep('mapping'); break;
      case 'preview': setStep('validation'); break;
      case 'result': setStep('preview'); break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Excel Import</h2>
        <div className="flex items-center gap-2">
          {['file', 'mapping', 'validation', 'preview', 'result'].map((s, index) => (
            <Badge 
              key={s} 
              variant={s === step ? 'success' : index < ['file', 'mapping', 'validation', 'preview', 'result'].indexOf(step) ? 'default' : 'default'}
            >
              {index + 1}
            </Badge>
          ))}
        </div>
      </div>

      {step === 'file' && renderFileStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'validation' && renderValidationStep()}
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
              step === 'preview' ? 'Anwenden' : (
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