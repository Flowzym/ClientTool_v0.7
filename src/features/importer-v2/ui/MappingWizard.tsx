/**
 * Main mapping wizard component for Importer V2
 * Guides users through the import mapping process
 */

import React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, Settings, CheckCircle, AlertTriangle, X, Download } from 'lucide-react';
import Papa from 'papaparse';
import { 
  applyMapping, 
  batchTransform, 
  validateTransformedRecord,
  createTransformSummary,
  type TransformOptions,
  type BatchTransformResult 
} from '../core/transform';
import { guessColumn } from '../core/score';
import { validateMapping } from '../core/validate';
import { normalizeHeader, displayHeader } from '../core/normalize';

// TODO: Implement mapping wizard component
// - Step-by-step import process
// - File upload and parsing
// - Column mapping interface
// - Validation and preview
// - Template management integration

interface MappingWizardProps {
  onComplete?: (mappings: Record<string, string>) => void;
  onCancel?: () => void;
  initialFile?: File;
  suggestedTemplate?: string;
}

interface WizardState {
  currentStep: number;
  file: File | null;
  headersRaw: string[];
  headersNormalized: string[];
  mapping: Record<string, string>;
  customFields: CustomField[];
  preview: string[][];
  validation: ValidationResult | null;
  importing: boolean;
  importProgress: { processed: number; total: number } | null;
  importResult: BatchTransformResult | null;
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  mappedFields: string[];
  unmappedFields: string[];
}

export const MappingWizard: React.FC<MappingWizardProps> = ({
  onComplete,
  onCancel,
  initialFile,
  suggestedTemplate
}) => {
  // TODO: Implement wizard state management
  // - Current step tracking
  // - File parsing state
  // - Mapping state
  // - Validation state
  // - Template state

  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    file: initialFile || null,
    headersRaw: [],
    headersNormalized: [],
    mapping: {},
    customFields: [],
    preview: [],
    validation: null,
    importing: false,
    importProgress: null,
    importResult: null
  });

  // Parse CSV file
  const parseFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: false,
      preview: 100, // Only parse first 100 rows for preview
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length > 0) {
          const headers = data[0];
          const normalized = headers.map(normalizeHeader);
          
          setState(prev => ({
            ...prev,
            file,
            headersRaw: headers,
            headersNormalized: normalized,
            preview: data,
            mapping: {} // Reset mapping when new file is loaded
          }));
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
      }
    });
  }, []);

  // Auto-suggest mappings based on header names
  const autoSuggestMappings = useCallback(() => {
    const targetFields = ['firstName', 'lastName', 'email', 'phone', 'company'];
    const suggestions: Record<string, string> = {};
    
    targetFields.forEach(field => {
      const bestMatch = guessColumn(field, state.headersNormalized);
      if (bestMatch.score > 0.7) {
        suggestions[field] = state.headersRaw[bestMatch.index];
      }
    });
    
    setState(prev => ({ ...prev, mapping: { ...prev.mapping, ...suggestions } }));
  }, [state.headersRaw, state.headersNormalized]);

  // Validate current mapping
  const validateCurrentMapping = useCallback(() => {
    const result = validateMapping(state.headersRaw, state.mapping, state.customFields);
    setState(prev => ({ ...prev, validation: result }));
  }, [state.headersRaw, state.mapping, state.customFields]);

  // Transform options
  const transformOptions: TransformOptions = useMemo(() => ({
    dateFormat: 'auto',
    phoneFormat: 'international',
    genderMapping: { m: 'M', f: 'F', w: 'F', d: 'D' },
    customFields: state.customFields
  }), [state.customFields]);

  // Start import process
  const handleStartImport = useCallback(async () => {
    if (!state.validation?.isValid || state.preview.length === 0) {
      return;
    }

    setState(prev => ({ 
      ...prev, 
      importing: true, 
      importProgress: { processed: 0, total: state.preview.length },
      importResult: null 
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
        ['firstName', 'lastName'], // Required fields - could be configurable
        (progress) => {
          setState(prev => ({ 
            ...prev, 
            importProgress: { processed: progress.processed, total: progress.total }
          }));
        }
      );

      // TODO: Here we would call the existing service layer
      // For now, we just simulate the import
      console.log('Import simulation:', {
        successful: result.successful.length,
        failed: result.failed.length,
        data: result.successful.slice(0, 3) // Log first 3 records
      });

      // In a real implementation, this would be:
      // await importClients(result.successful);
      // or similar service call

      setState(prev => ({ 
        ...prev, 
        importing: false,
        importProgress: null,
        importResult: result
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
  }, [state.validation, state.preview, state.headersRaw, state.mapping, transformOptions]);

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

              {/* Mapping interface would go here */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Mapping-Interface wird hier implementiert...
                </p>
                <pre className="text-xs text-gray-500 mt-2">
                  Headers: {JSON.stringify(state.headersRaw, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Validierung
              </h3>
              <p className="text-sm text-gray-600">
                Überprüfung der Zuordnungen und Datenvorschau
              </p>
            </div>

            <button
              onClick={validateCurrentMapping}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Zuordnungen validieren
            </button>

            {state.validation && (
              <div className={`rounded-lg p-4 ${
                state.validation.isValid 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  {state.validation.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={`text-sm font-medium ${
                    state.validation.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {state.validation.isValid ? 'Validierung erfolgreich' : 'Validierungsfehler'}
                  </span>
                </div>
                
                {state.validation.errors.length > 0 && (
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {state.validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
                
                {state.validation.warnings.length > 0 && (
                  <ul className="text-sm text-yellow-600 list-disc list-inside mt-2">
                    {state.validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        if (state.importing) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Import läuft...</h3>
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

        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Bereit zum Import
              </h3>
              <p className="text-sm text-gray-600">
                Alle Validierungen erfolgreich. Import kann gestartet werden.
              </p>
            </div>

            {state.validation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    {state.validation.mappedFields.length} Felder zugeordnet
                  </span>
                </div>
                <p className="text-sm text-green-600">
                  {state.preview.length - 1} Datensätze bereit zum Import
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleStartImport}
                disabled={!state.validation?.isValid}
                className="px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Import starten</span>
              </button>
            </div>
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
              (state.currentStep === 3 && !state.validation?.isValid) ||
              (state.currentStep === 4 && state.importing)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.currentStep === 4 ? 'Abschließen' : 'Weiter'}
          </button>
        )}
        <button onClick={() => onComplete?.({})}>Complete</button>
      </div>
    </div>
  );
};

export default MappingWizard;