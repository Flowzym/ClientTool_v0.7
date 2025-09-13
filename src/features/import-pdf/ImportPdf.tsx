/**
 * PDF-Import-Wizard mit Text-Extraktion und Regex-Mapping
 */
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { 
  FileText, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Eye,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FolderOpen,
} from 'lucide-react';
import { loadPdfDocument, extractTextFromPages, type PDFDocumentProxy } from './pdfWorker';
import { analyzeTextWithRegex, getBestMatches, splitFullName, parseAddress, fieldPatterns, type RegexMatch } from './regexPresets';
import { buildRowKey, hashRow } from '../import-excel/dedupe';
import { nowISO, parseToISO } from '../../utils/date';
import { db } from '../../data/db';
import { cryptoManager } from '../../data/crypto';
import { supportsFSAccess, isEmbedded, isBoltHost } from '../../utils/env';
import type { Client, ImportSession } from '../../domain/models';



const PROTECTED_FIELDS: string[] = [
  'assignedTo',
  'priority',
  'status',
  'result',
  'contactLog',
  'contactCount',
  'followUp'
];
type WizardStep = 'file' | 'pages' | 'extract' | 'mapping' | 'preview' | 'result';

interface PdfData {
  fileName: string;
  pdf: PDFDocumentProxy;
  totalPages: number;
  selectedPages: number[];
  pageTexts: Array<{ pageNum: number; text: string; hasText: boolean }>;
  combinedText: string;
  regexResults: RegexMatch[];
}

interface MappedData {
  amsId?: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  priority: 'normal';
  status: 'offen';
}

interface SyncPreview {
  new: any[];
  updated: Array<{ existing: Client; updates: any; diff: string[] }>;
  removed: Client[];
}

export function ImportPdf() {
  const [step, setStep] = useState<WizardStep>('file');
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [mappedData, setMappedData] = useState<MappedData | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [mode, setMode] = useState<'append' | 'sync'>('append');
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Sync-Optionen
  const [archiveRemoved, setArchiveRemoved] = useState(true);
  const [deleteOnlyInactive, setDeleteOnlyInactive] = useState(true);

  // Datei-Upload-Handler
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUploadError(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Nur PDF-Dateien sind erlaubt');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    try {
      console.log(`📂 Reading PDF: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await loadPdfDocument(arrayBuffer);
      
      setPdfData({
        fileName: file.name,
        pdf,
        totalPages: pdf.numPages,
        selectedPages: Array.from({ length: pdf.numPages }, (_, i) => i + 1),
        pageTexts: [],
        combinedText: '',
        regexResults: []
      });
      
      setStep('pages');
      console.log(`✅ PDF loaded: ${pdf.numPages} pages`);
      
    } catch (error) {
      console.error('❌ PDF upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Unbekannter Fehler beim Lesen der PDF-Datei');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  }, []);

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
          description: 'PDF-Dateien',
          accept: {
            'application/pdf': ['.pdf']
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

  // Seiten-Auswahl ändern
  const handlePageSelection = useCallback((pageNum: number, selected: boolean) => {
    if (!pdfData) return;
    
    const newSelection = selected 
      ? [...pdfData.selectedPages, pageNum].sort((a, b) => a - b)
      : pdfData.selectedPages.filter(p => p !== pageNum);
    
    setPdfData(prev => prev ? { ...prev, selectedPages: newSelection } : null);
  }, [pdfData]);

  // Text extrahieren
  const handleTextExtraction = useCallback(async () => {
    if (!pdfData) return;
    
    setIsProcessing(true);
    
    try {
      const { pageTexts, combinedText } = await extractTextFromPages(
        pdfData.pdf, 
        pdfData.selectedPages
      );
      
      if (combinedText.length === 0) {
        setUploadError('Keine extrahierbaren Textinhalte gefunden. Dieses PDF enthält möglicherweise nur Bilder (Scan). OCR folgt in Phase 3.5.');
        return;
      }
      
      const regexResults = analyzeTextWithRegex(combinedText);
      
      setPdfData(prev => prev ? {
        ...prev,
        pageTexts,
        combinedText,
        regexResults
      } : null);
      
      setStep('extract');
      console.log(`✅ Text extracted: ${combinedText.length} characters, ${regexResults.length} field matches`);
      
    } catch (error) {
      console.error('❌ Text extraction failed:', error);
      setUploadError('Fehler beim Extrahieren des Textes');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData]);

  // Mapping erstellen
  const handleMapping = useCallback(() => {
    if (!pdfData) return;
    
    const bestMatches = getBestMatches(pdfData.regexResults);
    
    // Namen aufteilen
    let firstName = '';
    let lastName = '';
    
    if (bestMatches.fullName) {
      const { firstName: fn, lastName: ln } = splitFullName(bestMatches.fullName);
      firstName = fn;
      lastName = ln;
    }
    
    // Geburtsdatum formatieren
    let birthDate = '';
    if (bestMatches.birthDate) {
      birthDate = parseToISO(bestMatches.birthDate) || bestMatches.birthDate;
    }
    
    // Adresse zusammenfassen
    let address = '';
    if (bestMatches.address) {
      const parsed = parseAddress(bestMatches.address);
      address = `${parsed.street} ${parsed.houseNumber}, ${parsed.postalCode} ${parsed.city}`.trim();
    }
    
    const mapped: MappedData = {
      amsId: bestMatches.amsId || '',
      firstName: firstName || 'Unbekannt',
      lastName: lastName || 'Unbekannt',
      birthDate: birthDate || undefined,
      phone: bestMatches.phone || undefined,
      email: bestMatches.email || undefined,
      address: address || undefined,
      priority: 'normal',
      status: 'offen'
    };
    
    setMappedData(mapped);
    setStep('mapping');
  }, [pdfData]);

  // Sync-Vorschau erstellen
  const createSyncPreview = useCallback(async () => {
    if (!mappedData || mode !== 'sync') return;
    
    setIsProcessing(true);
    
    try {
      await cryptoManager.getActiveKey();
      
      const existingClients = (await Promise.all((await db.clients.toArray()) as any));
      const existingByRowKey = new Map<string, Client>();
      
      existingClients.forEach(client => {
        if (client.rowKey) {
          existingByRowKey.set(client.rowKey, client);
        }
      });
      
      const rowKey = buildRowKey(mappedData);
      const rowHash = hashRow(mappedData);
      const existing = existingByRowKey.get(rowKey);
      
      const newItems: any[] = [];
      const updatedItems: SyncPreview['updated'] = [];
      
      if (!existing) {
        newItems.push({
          ...mappedData,
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
        Object.keys(mappedData).forEach(key => {
          const newVal = (mappedData as any)[key];
          const oldVal = (existing as any)[key];
          if (oldVal !== newVal) {
            const isProtected = /* respectProtected */ true && PROTECTED_FIELDS.includes(key);
            const onlyEmpty = /* onlyEmptyFields */ false;
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
      
      // Entfallene finden (vereinfacht für Single-Record-Import)
      const removedItems = existingClients.filter(client => 
        client.sourceId === sourceId && 
        client.rowKey !== rowKey &&
        !client.isArchived
      );
      
      setSyncPreview({
        new: newItems,
        updated: updatedItems,
        removed: removedItems
      });
      
    } catch (error) {
      console.error('Sync preview error:', error);
      setUploadError('Fehler beim Erstellen der Vorschau');
    } finally {
      setIsProcessing(false);
    }
  }, [mappedData, mode, sourceId]);

  // Import ausführen
  const executeImport = useCallback(async () => {
    if (!mappedData) return;
    
    setIsProcessing(true);
    
    try {
      await cryptoManager.getActiveKey();
      
      let stats = { created: 0, updated: 0, archived: 0, deleted: 0 };
      
      if (mode === 'append') {
        const client: Client = {
          ...mappedData,
          id: crypto.randomUUID(),
          rowKey: buildRowKey(mappedData),
          sourceRowHash: hashRow(mappedData),
          sourceId,
          contactCount: 0,
          contactLog: [],
          isArchived: false,
          lastImportedAt: nowISO(),
          lastSeenInSourceAt: nowISO(),
          source: {
            fileName: pdfData?.fileName || 'unknown.pdf',
            importedAt: nowISO()
          }
        };
        
        stats.created = await db.bulkCreate([client]);
        
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
  }, [mappedData, mode, sourceId, syncPreview, archiveRemoved, deleteOnlyInactive, pdfData]);

  // Render-Funktionen
  const renderFileStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF-Datei auswählen
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">PDF-Datei hochladen</p>
                <p className="text-gray-500">Text wird automatisch extrahiert und analysiert</p>
              </div>
              
              <div className="mt-6 space-y-3">
                <div>
                  <input
                    type="file"
                    accept=".pdf"
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
              <div className="font-medium mb-1">Beispiel-PDF testen</div>
              <div>
                Eine Beispiel-PDF finden Sie unter <code>public/sample/clients.pdf</code> 
                (enthält Testdaten für AMS-ID, Namen, Kontaktdaten).
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPagesStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Seiten auswählen
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              PDF: {pdfData?.fileName} ({pdfData?.totalPages} Seiten)
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!pdfData) return;
                  const allSelected = pdfData.selectedPages.length === pdfData.totalPages;
                  const newSelection = allSelected 
                    ? [] 
                    : Array.from({ length: pdfData.totalPages }, (_, i) => i + 1);
                  setPdfData(prev => prev ? { ...prev, selectedPages: newSelection } : null);
                }}
              >
                {pdfData?.selectedPages.length === pdfData?.totalPages ? 'Alle abwählen' : 'Alle auswählen'}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {Array.from({ length: pdfData?.totalPages || 0 }, (_, i) => i + 1).map(pageNum => (
              <div key={pageNum} className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdfData?.selectedPages.includes(pageNum) || false}
                    onChange={(e) => handlePageSelection(pageNum, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="font-medium">Seite {pageNum}</span>
                </label>
              </div>
            ))}
          </div>
          
          <div className="text-sm text-gray-500">
            {pdfData?.selectedPages.length || 0} von {pdfData?.totalPages || 0} Seiten ausgewählt
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderExtractStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Text-Extraktion & Analyse
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Extrahierter Text</h4>
                <textarea
                  value={pdfData?.combinedText.slice(0, 1000) + (pdfData?.combinedText.length > 1000 ? '...' : '')}
                  readOnly
                  className="w-full h-32 p-3 border border-gray-300 rounded-md text-sm font-mono"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {pdfData?.combinedText.length} Zeichen extrahiert
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Gefundene Felder</h4>
                <div className="space-y-2">
                  {pdfData?.regexResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {fieldPatterns[result.field as keyof typeof fieldPatterns]?.description || result.field}
                        </span>
                        <Badge variant="default" size="sm">
                          {result.matches.length}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {result.matches.slice(0, 3).map(match => match.value).join(', ')}
                        {result.matches.length > 3 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
                
                {pdfData?.regexResults.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    Keine strukturierten Daten gefunden
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMappingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Daten-Mapping
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">AMS-ID</label>
              <input
                type="text"
                value={mappedData?.amsId || ''}
                onChange={(e) => setMappedData(prev => prev ? { ...prev, amsId: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Optional"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Vorname *</label>
              <input
                type="text"
                value={mappedData?.firstName || ''}
                onChange={(e) => setMappedData(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Nachname *</label>
              <input
                type="text"
                value={mappedData?.lastName || ''}
                onChange={(e) => setMappedData(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Geburtsdatum</label>
              <input
                type="text"
                value={mappedData?.birthDate || ''}
                onChange={(e) => setMappedData(prev => prev ? { ...prev, birthDate: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="YYYY-MM-DD"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Telefon</label>
              <input
                type="text"
                value={mappedData?.phone || ''}
                onChange={(e) => setMappedData(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">E-Mail</label>
              <input
                type="email"
                value={mappedData?.email || ''}
                onChange={(e) => setMappedData(prev => prev ? { ...prev, email: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Adresse</label>
              <input
                type="text"
                value={mappedData?.address || ''}
                onChange={(e) => setMappedData(prev => prev ? { ...prev, address: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            Die Felder wurden automatisch aus dem PDF-Text extrahiert. 
            Bitte prüfen und korrigieren Sie die Werte bei Bedarf.
          </div>
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
                placeholder="z.B. PDF-Stapel-KW36"
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
                  <span>Anhängen - Datensatz hinzufügen</span>
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
              PDF-Import erfolgreich abgeschlossen!
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
              PDF-Import fehlgeschlagen
            </div>
            <div className="text-sm text-gray-600">
              {result?.error}
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <Button onClick={() => {
            setStep('file');
            setPdfData(null);
            setMappedData(null);
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
      case 'file': return !!pdfData && !uploadError;
      case 'pages': return pdfData && pdfData.selectedPages.length > 0;
      case 'extract': return pdfData && pdfData.combinedText.length > 0;
      case 'mapping': return mappedData && mappedData.firstName && mappedData.lastName;
      case 'preview': return (mode === 'append' && sourceId) || (mode === 'sync' && syncPreview && sourceId);
      default: return false;
    }
  };

  const handleNext = () => {
    setUploadError(null);
    switch (step) {
      case 'file': setStep('pages'); break;
      case 'pages': handleTextExtraction(); break;
      case 'extract': handleMapping(); break;
      case 'mapping': setStep('preview'); break;
      case 'preview': executeImport(); break;
    }
  };

  const handleBack = () => {
    setUploadError(null);
    switch (step) {
      case 'pages': setStep('file'); break;
      case 'extract': setStep('pages'); break;
      case 'mapping': setStep('extract'); break;
      case 'preview': setStep('mapping'); break;
      case 'result': setStep('preview'); break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">PDF Import</h2>
        <div className="flex items-center gap-2">
          {['file', 'pages', 'extract', 'mapping', 'preview', 'result'].map((s, index) => (
            <Badge 
              key={s} 
              variant={s === step ? 'success' : index < ['file', 'pages', 'extract', 'mapping', 'preview', 'result'].indexOf(step) ? 'default' : 'default'}
            >
              {index + 1}
            </Badge>
          ))}
        </div>
      </div>

      {step === 'file' && renderFileStep()}
      {step === 'pages' && renderPagesStep()}
      {step === 'extract' && renderExtractStep()}
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