/**
 * Main mapping wizard component for Importer V2
 * Guides users through the import mapping process
 */

import React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, Settings, CheckCircle, AlertTriangle, X, Download, Play, Pause } from 'lucide-react';
import { 
  batchTransform, 
  createTransformSummary,
  importRecordsViaService,
  type TransformOptions,
  type BatchTransformResult
} from '../core/transform';
import { findBestMappings, validateMappingQuality } from '../core/score';
import { normalizeHeader } from '../core/normalize';
import type { InternalField } from '../core/types';

// TODO: Implement mapping wizard component
// - Step-by-step import process
// - File upload and parsing
// - Column mapping interface
// - Validation and preview
// - Template management integration

interface MappingWizardProps {
  onComplete?: (mappings: Record<string, string>) => void;
  onCancel?: () => void;
}

interface WizardState {
  currentStep: number;
  file: File | null;
  headersRaw: string[];
  headersNormalized: string[];
  mapping: Map<string, InternalField>;
  customFields: CustomField[];
  preview: string[][];
  validation: any | null;
  importing: boolean;
  importProgress: { processed: number; total: number } | null;
  importResult: BatchTransformResult | null;
  transformResult: BatchTransformResult | null;
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
}

export const MappingWizard: React.FC<MappingWizardProps> = ({
  onComplete,
  onCancel
}) => {
  // TODO: Implement wizard state management
  // - Current step tracking
  // - File parsing state
  // - Mapping state
  // - Validation state
  // - Template state

  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    file: null,
    headersRaw: [],
    headersNormalized: [],
    mapping: new Map(),
    customFields: [],
    preview: [],
    validation: null,
    importing: false,
    importProgress: null,
    importResult: null,
    transformResult: null
  });

  // Parse CSV file (simplified for demo)
  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const data = lines.map(line => line.split(',').map(cell => cell.trim()));
      
      if (data.length > 0) {
        const headers = data[0];
        const normalized = headers.map(h => normalizeHeader(h));
        
        setState(prev => ({
          ...prev,
          file,
          headersRaw: headers,
          headersNormalized: normalized.map(n => n.fixed),
          preview: data,
          mapping: new Map() // Reset mapping when new file is loaded
        }));
      }
    };
    reader.readAsText(file);
  }, []);

  // Auto-suggest mappings based on header names
  const autoSuggestMappings = useCallback(() => {
    const targetFields: InternalField[] = ['firstName', 'lastName', 'email', 'phone', 'amsId'];
    const suggestions = findBestMappings(targetFields, state.headersRaw);
    
    const newMapping = new Map<string, InternalField>();
    
    Object.entries(suggestions).forEach(([columnIndex, guess]) => {
      if (guess.confidence > 0.5) {
        const header = state.headersRaw[parseInt(columnIndex)];
        newMapping.set(header, guess.field);
      }
    });
    
    setState(prev => ({ ...prev, mapping: newMapping }));
  }, [state.headersRaw, state.headersNormalized]);

  // Validate current mapping
  const validateCurrentMapping = useCallback(() => {
    const mappingRecord: Record<string, any> = {};
    state.mapping.forEach((field, header) => {
      const columnIndex = state.headersRaw.indexOf(header);
      if (columnIndex >= 0) {
        mappingRecord[columnIndex.toString()] = { field, confidence: 1.0, reasons: [] };
      }
    });
    
    const result = validateMappingQuality(mappingRecord, ['firstName', 'lastName']);
    setState(prev => ({ ...prev, validation: result }));
  }, [state.headersRaw, state.mapping, state.customFields]);

  // Transform options
  const transformOptions: TransformOptions = useMemo(() => ({
    dateFormat: 'auto',
    phoneFormat: 'international',
    genderMapping: { m: 'M', f: 'F', w: 'F', d: 'D' },
    customFields: state.customFields
  }), [state.customFields]);

  // Transform data step
  const handleTransformData = useCallback(async () => {
    if (state.preview.length === 0) return;

    setState(prev => ({ 
      ...prev, 
      importing: true,
      importProgress: { processed: 0, total: state.preview.length - 1 }
    }));

    try {
      // Skip header row for processing
      const dataRows = state.preview.slice(1);
      
      // Transform data in batches
      const result = await batchTransform(
        dataRows,
        state.headersRaw,
        state.mapping,
        transformOptions,
        ['firstName', 'lastName'], // Required fields
        (progress) => {
          setState(prev => ({ 
            ...prev, 
            importProgress: { processed: progress.processed, total: progress.total }
          }));
        }
      );

      setState(prev => ({ 
        ...prev, 
        importing: false,
        importProgress: null,
        transformResult: result,
        currentStep: 4
      }));

    } catch (error) {
      console.error('Transform failed:', error);
      setState(prev => ({ 
        ...prev, 
        importing: false,
        importProgress: null,
        transformResult: {
          successful: [],
          failed: [{ rowIndex: 0, data: [], errors: ['Transform failed: ' + (error as Error).message] }],
          stats: { total: 0, successful: 0, failed: 1, processingTime: 0 }
        }
      }));
    }
  }, [state.preview, state.headersRaw, state.mapping, transformOptions]);

  // Start import process
  const handleStartImport = useCallback(async () => {
    if (!state.transformResult || state.transformResult.successful.length === 0) {
      return;
    }

    setState(prev => ({ 
      ...prev, 
      importing: true, 
      importProgress: { processed: 0, total: state.transformResult.successful.length },
      importResult: null 
    }));

    try {
      // Import via existing service layer (simulated for now)
      const result = await importRecordsViaService(
        state.transformResult.successful,
        (progress) => {
          setState(prev => ({ 
            ...prev, 
            importProgress: { processed: progress.processed, total: progress.total }
          }));
        }
      );

      setState(prev => ({ 
        ...prev, 
        importing: false,
        importProgress: null,
        importResult: {
          successful: state.transformResult.successful,
          failed: result.errors.map((error, index) => ({ 
            rowIndex: index, 
            data: [], 
            errors: [error] 
          })),
          stats: { total: state.transformResult.successful.length, successful: result.imported, failed: result.errors.length, processingTime: 0 }
        }
      }));

    } catch (error) {
      console.error('Import failed:', error);
      setState(prev => ({ 
        ...prev, 
        importing: false,
        importProgress: null,
        importResult: {
          successful: [],
          failed: [{ rowIndex: 0, data: [], errors: ['Import failed: ' + (error as Error).message] }],
          stats: { total: 0, successful: 0, failed: 1, processingTime: 0 }
        }
      }));
    }
  }, [state.transformResult]);

  // Render current step
  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                CSV-Datei hochladen
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Wählen Sie eine CSV-Datei zum Importieren aus
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parseFile(file);
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Datei auswählen
              </label>
            </div>
            
            {state.file && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    {state.file.name}
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {state.preview.length} Zeilen erkannt
                </p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Spalten zuordnen
              </h3>
              <p className="text-sm text-gray-600">
                Ordnen Sie die CSV-Spalten den entsprechenden Feldern zu
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={autoSuggestMappings}
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                Automatische Zuordnung vorschlagen
              </button>

              {/* Mapping interface */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Spalten-Zuordnung</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {state.headersRaw.map((header, index) => {
                    const normalizedHeader = normalizeHeader(header);
                    const mappedField = state.mapping.get(header);
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 border border-gray-200 rounded">
                        <div className="w-32 text-sm">
                          <div className="font-medium truncate" title={header}>{header}</div>
                          {normalizedHeader.repairs.length > 0 && (
                            <div className="text-xs text-green-600">
                              ✓ {normalizedHeader.repairs.length} Encoding-Fix(es)
                            </div>
                          )}
                        </div>
                        <div className="text-gray-400">→</div>
                        <select
                          value={mappedField || ''}
                          onChange={(e) => {
                            const newMapping = new Map(state.mapping);
                            if (e.target.value) {
                              newMapping.set(header, e.target.value as InternalField);
                            } else {
                              newMapping.delete(header);
                            }
                            setState(prev => ({ ...prev, mapping: newMapping }));
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Ignorieren</option>
                          <option value="amsId">AMS-ID</option>
                          <option value="firstName">Vorname</option>
                          <option value="lastName">Nachname</option>
                          <option value="title">Titel</option>
                          <option value="gender">Geschlecht</option>
                          <option value="birthDate">Geburtsdatum</option>
                          <option value="phone">Telefon</option>
                          <option value="email">E-Mail</option>
                          <option value="address">Adresse</option>
                          <option value="zip">PLZ</option>
                          <option value="city">Ort</option>
                          <option value="status">Status</option>
                          <option value="priority">Priorität</option>
                          <option value="angebot">Angebot</option>
                          <option value="note">Notiz</option>
                        </select>
                        <div className="w-24 text-xs text-gray-500">
                          {state.preview.length > 1 && state.preview[1][index] && (
                            <div className="truncate" title={state.preview[1][index]}>
                              {state.preview[1][index]}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Transform-Optionen
              </h3>
              <p className="text-sm text-gray-600">
                Konfigurieren Sie die Datenverarbeitung
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Datumsformat</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="auto">Automatisch erkennen</option>
                    <option value="dd.mm.yyyy">DD.MM.YYYY (Deutsch)</option>
                    <option value="yyyy-mm-dd">YYYY-MM-DD (ISO)</option>
                    <option value="mm/dd/yyyy">MM/DD/YYYY (US)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Telefon-Format</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="international">International (+43 1 234 5678)</option>
                    <option value="national">National (01 234 5678)</option>
                    <option value="local">Lokal (234 5678)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Geschlecht-Mapping</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>m, männlich →</span>
                    <span className="font-medium">M</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>f, w, weiblich →</span>
                    <span className="font-medium">F</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>d, diverse →</span>
                    <span className="font-medium">D</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Andere →</span>
                    <span className="font-medium">null</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleTransformData}
                disabled={state.mapping.size === 0}
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Daten transformieren</span>
              </button>
            </div>
          </div>
        );

      case 4:
        if (state.importing) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {state.transformResult ? 'Import läuft...' : 'Transformiere Daten...'}
                </h3>
                {state.importProgress && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {state.importProgress.processed} von {state.importProgress.total} Datensätzen verarbeitet
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(state.importProgress.processed / state.importProgress.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (state.transformResult && !state.importResult) {
          const { stats, failed } = state.transformResult;
          return (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Transformation abgeschlossen
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                    <div className="text-sm text-gray-600">Erfolgreich</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                    <div className="text-sm text-gray-600">Fehler</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">{stats.processingTime}ms</div>
                    <div className="text-sm text-gray-600">Verarbeitungszeit</div>
                  </div>
                </div>
              </div>

              {failed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Fehlerhafte Datensätze:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {failed.slice(0, 5).map((error, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                        <div className="text-sm text-red-800">
                          Zeile {error.rowIndex + 2}: {error.errors.join(', ')}
                        </div>
                      </div>
                    ))}
                    {failed.length > 5 && (
                      <div className="text-sm text-gray-600 text-center py-2">
                        ... und {failed.length - 5} weitere Fehler
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    currentStep: 2,
                    transformResult: null 
                  }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Mapping ändern
                </button>
                {stats.successful > 0 && (
                  <button
                    onClick={handleStartImport}
                    className="px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Import starten ({stats.successful} Datensätze)</span>
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (state.importResult) {
          const { stats, failed } = state.importResult;
          return (
            <div className="space-y-6">
              <div className="text-center">
                {stats.failed === 0 ? (
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                )}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import {stats.failed === 0 ? 'erfolgreich' : 'teilweise erfolgreich'}
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {createTransformSummary(state.importResult)}
                </pre>
              </div>

              {failed.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Fehlerhafte Datensätze:</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {failed.slice(0, 10).map((error, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800">
                          Zeile {error.rowIndex + 2} {/* +2 because we skip header and 0-indexed */}
                        </p>
                        <p className="text-sm text-red-600 mt-1">
                          {error.errors.join(', ')}
                        </p>
                        <p className="text-xs text-red-500 mt-1">
                          Daten: {error.data.slice(0, 3).join(', ')}
                          {error.data.length > 3 && '...'}
                        </p>
                      </div>
                    ))}
                    {failed.length > 10 && (
                      <p className="text-sm text-gray-600 text-center py-2">
                        ... und {failed.length - 10} weitere Fehler
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    currentStep: 1,
                    importResult: null 
                  }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Neuer Import
                </button>
                {stats.successful > 0 && (
                  <button
                    onClick={() => {
                      // TODO: Navigate to imported data or show success page
                      console.log('Navigate to imported data');
                      onComplete?.(Object.fromEntries(state.mapping));
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Importierte Daten anzeigen
                  </button>
                )}
              </div>
            </div>
          );
        }

        // Fallback case
        return (
          <div className="text-center py-8">
            <div className="text-gray-500">Unbekannter Zustand</div>
          </div>
        );
    }
  };

  return (
    <div className="mapping-wizard">
      {/* TODO: Implement wizard UI */}
      <div className="wizard-header">
        <h2>Import Mapping Wizard</h2>
        <p>Configure column mappings for your import file</p>
      </div>
      
      <div className="wizard-content">
        {/* TODO: Step indicators */}
        {/* TODO: File upload step */}
        {/* TODO: Template selection step */}
        {/* TODO: Column mapping step */}
        {/* TODO: Validation step */}
        {/* TODO: Preview step */}
        
        <div className="placeholder-content">
          <p>Mapping wizard implementation pending...</p>
          <p>Features to implement:</p>
          <ul>
            <li>File upload and parsing</li>
            <li>Template auto-detection</li>
            <li>Interactive column mapping</li>
            <li>Real-time validation</li>
            <li>Data preview</li>
            <li>Template saving</li>
          </ul>
        </div>

        {renderStep()}
      </div>
      
      <div className="wizard-actions">
        {/* TODO: Navigation buttons */}
        <button onClick={onCancel}>Cancel</button>
        {state.currentStep > 1 && (
          <button
            onClick={() => setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Zurück
          </button>
        )}
        {state.currentStep < 4 && (
          <button
            onClick={() => setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))}
            disabled={
              (state.currentStep === 1 && !state.file) ||
              (state.currentStep === 2 && state.mapping.size === 0) ||
              (state.currentStep === 4 && state.importing)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.currentStep === 3 ? 'Transformieren' : 'Weiter'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MappingWizard;