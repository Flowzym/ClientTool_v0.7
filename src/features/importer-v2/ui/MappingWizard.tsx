/**
 * Mapping Wizard - Main component for enhanced import pipeline
 * Behind feature flag, not yet integrated into main navigation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  Settings, 
  Eye, 
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Wand2,
  Plus
} from 'lucide-react';
import { MappingTable } from './MappingTable';
import { TemplateBar } from './TemplateBar';
import { PreviewPane } from './PreviewPane';
import { CustomFieldEditor } from './CustomFieldEditor';
import { normalizeHeader, displayHeader } from '../core/normalize';
import { findBestMappings, validateMappingQuality } from '../core/score';
import { validateBatch } from '../core/validate';
import { detectFileFormat } from '../core/detect';
import type { 
  InternalField, 
  MappingResult, 
  ValidationResult, 
  CustomField,
  ImportTemplate 
} from '../core/types';
import type { TemplateMetadata } from '../templates/types';

type WizardStep = 'upload' | 'mapping' | 'options' | 'validation' | 'result';

interface WizardState {
  // File data
  fileName: string;
  headersRaw: string[];
  headersFixed: string[];
  sampleRows: string[][];
  
  // Mapping state
  autoMapEnabled: boolean;
  mapping: Record<string, MappingResult>;
  customFields: CustomField[];
  
  // Options
  dateFormat: 'auto' | 'dd.mm.yyyy' | 'yyyy-mm-dd';
  genderMapping: Record<string, 'M' | 'F'>;
  phoneHandling: 'split' | 'combined';
  
  // Validation
  preview: Array<Record<InternalField, any>>;
  validation: ValidationResult;
  
  // Template
  selectedTemplate?: TemplateMetadata;
}

interface MappingWizardProps {
  onImport?: (data: any[], mapping: Record<string, MappingResult>) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function MappingWizard({ onImport, onCancel, className }: MappingWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [state, setState] = useState<WizardState>({
    fileName: '',
    headersRaw: [],
    headersFixed: [],
    sampleRows: [],
    autoMapEnabled: true,
    mapping: {},
    customFields: [],
    dateFormat: 'auto',
    genderMapping: { 'M': 'M', 'W': 'F', 'F': 'F', 'm': 'M', 'w': 'F', 'f': 'F' },
    phoneHandling: 'combined',
    preview: [],
    validation: { valid: false, issues: [], stats: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 } }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomFieldEditor, setShowCustomFieldEditor] = useState(false);

  // File upload handler
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const format = detectFileFormat(arrayBuffer, file.name, file.type);
      
      if (format.type === 'unknown') {
        throw new Error(`Nicht unterstütztes Dateiformat: ${format.reason}`);
      }

      // TODO: Parse file based on format (XLSX/CSV/HTML)
      // For now, mock data
      const mockHeaders = ['Nachname', 'Vorname', 'Stra�e', 'Ma�nahme', 'E-Mail'];
      const mockRows = [
        ['Mustermann', 'Max', 'Hauptstra�e 1', 'BAM', 'max@example.com'],
        ['Schmidt', 'Anna', 'Nebenstra�e 2', 'LL/B+', 'anna@test.at'],
        ['Weber', 'Thomas', 'Kirchenstra�e 3', 'BwB', 'thomas@example.com']
      ];

      // Normalize headers
      const headersFixed = mockHeaders.map(h => displayHeader(h));
      
      setState(prev => ({
        ...prev,
        fileName: file.name,
        headersRaw: mockHeaders,
        headersFixed,
        sampleRows: mockRows
      }));

      setStep('mapping');
      console.log(`✅ File processed: ${file.name}, ${mockHeaders.length} columns, ${mockRows.length} rows`);

    } catch (error) {
      console.error('❌ File processing failed:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  }, []);

  // Auto-mapping toggle
  const handleAutoMapToggle = useCallback(() => {
    setState(prev => {
      const newAutoMapEnabled = !prev.autoMapEnabled;
      
      if (newAutoMapEnabled && prev.headersRaw.length > 0) {
        // Apply auto-mapping
        const fields: InternalField[] = [
          'firstName', 'lastName', 'title', 'birthDate', 'phone', 'email', 
          'address', 'zip', 'city', 'amsId', 'status', 'priority', 'angebot'
        ];
        
        const autoMapping = findBestMappings(fields, prev.headersRaw, prev.sampleRows);
        
        return {
          ...prev,
          autoMapEnabled: newAutoMapEnabled,
          mapping: autoMapping
        };
      }
      
      return {
        ...prev,
        autoMapEnabled: newAutoMapEnabled,
        mapping: newAutoMapEnabled ? prev.mapping : {}
      };
    });
  }, []);

  // Custom field management
  const handleAddCustomField = useCallback((customField: CustomField) => {
    setState(prev => ({
      ...prev,
      customFields: [...prev.customFields, customField]
    }));
    setShowCustomFieldEditor(false);
  }, []);

  const handleRemoveCustomField = useCallback((fieldId: string) => {
    setState(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.id !== fieldId)
    }));
  }, []);

  // Template management
  const handleApplyTemplate = useCallback((template: ImportTemplate) => {
    setState(prev => ({
      ...prev,
      mapping: template.mapping,
      customFields: template.customFields || [],
      dateFormat: template.options?.dateFormat || 'auto',
      genderMapping: template.options?.genderMapping || prev.genderMapping,
      phoneHandling: template.options?.phoneHandling || 'combined',
      selectedTemplate: template.metadata
    }));
  }, []);

  // Validation and preview
  const handleValidateAndPreview = useCallback(() => {
    setIsProcessing(true);
    
    try {
      // TODO: Transform sample rows using mapping and options
      const transformedRows = state.sampleRows.map(row => {
        const transformed: Record<InternalField, any> = {} as any;
        
        Object.entries(state.mapping).forEach(([columnIndex, mapping]) => {
          const value = row[parseInt(columnIndex)];
          if (value && mapping) {
            (transformed as any)[mapping.field] = value;
          }
        });
        
        return transformed;
      });
      
      // Validate transformed data
      const validation = validateBatch(transformedRows);
      
      setState(prev => ({
        ...prev,
        preview: transformedRows,
        validation
      }));
      
      setStep('validation');
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Validierung fehlgeschlagen');
    } finally {
      setIsProcessing(false);
    }
  }, [state.mapping, state.sampleRows]);

  // Import execution
  const handleExecuteImport = useCallback(async () => {
    if (!onImport) return;
    
    setIsProcessing(true);
    
    try {
      await onImport(state.preview, state.mapping);
      setStep('result');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import fehlgeschlagen');
    } finally {
      setIsProcessing(false);
    }
  }, [onImport, state.preview, state.mapping]);

  // Navigation
  const canGoNext = () => {
    switch (step) {
      case 'upload': return state.headersRaw.length > 0;
      case 'mapping': return Object.keys(state.mapping).length > 0;
      case 'options': return true;
      case 'validation': return state.validation.valid;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'upload': setStep('mapping'); break;
      case 'mapping': setStep('options'); break;
      case 'options': handleValidateAndPreview(); break;
      case 'validation': handleExecuteImport(); break;
    }
  };

  const handleBack = () => {
    setError(null);
    switch (step) {
      case 'mapping': setStep('upload'); break;
      case 'options': setStep('mapping'); break;
      case 'validation': setStep('options'); break;
      case 'result': setStep('validation'); break;
    }
  };

  // Render step content
  const renderUploadStep = () => (
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
              <p className="text-lg font-medium">Excel/CSV-Datei hochladen</p>
              <p className="text-gray-500">Enhanced Import mit intelligentem Mapping</p>
            </div>
            
            <div className="mt-6">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 disabled:opacity-50"
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}
          
          {state.headersRaw.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Datei erfolgreich gelesen</span>
              </div>
              <div className="text-sm text-green-600">
                <div>Datei: {state.fileName}</div>
                <div>Spalten: {state.headersRaw.length}</div>
                <div>Beispielzeilen: {state.sampleRows.length}</div>
              </div>
              
              {/* Encoding fixes preview */}
              <div className="mt-3 space-y-1">
                {state.headersRaw.map((raw, index) => {
                  const fixed = state.headersFixed[index];
                  if (raw !== fixed) {
                    return (
                      <div key={index} className="text-xs text-green-600">
                        ✓ {raw} → {fixed} [fixiert]
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      {/* Auto-mapping toggle */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Spalten-Zuordnung
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.autoMapEnabled}
                  onChange={handleAutoMapToggle}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Automatisch zuordnen</span>
              </label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            {state.autoMapEnabled 
              ? 'Intelligente Zuordnung basierend auf Spaltennamen und Inhalten'
              : 'Manuelle Zuordnung - wählen Sie für jede Spalte das passende Feld'
            }
          </div>
          
          <MappingTable
            headersRaw={state.headersRaw}
            headersFixed={state.headersFixed}
            sampleRows={state.sampleRows}
            mapping={state.mapping}
            customFields={state.customFields}
            onMappingChange={(newMapping) => setState(prev => ({ ...prev, mapping: newMapping }))}
          />
          
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomFieldEditor(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Eigenes Feld hinzufügen
            </Button>
            
            <div className="text-xs text-gray-500">
              {Object.keys(state.mapping).length} von {state.headersRaw.length} Spalten zugeordnet
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template bar */}
      <TemplateBar
        currentMapping={state.mapping}
        customFields={state.customFields}
        onApplyTemplate={handleApplyTemplate}
        onSaveTemplate={(name, description) => {
          // TODO: Save current state as template
          console.log('Save template:', name, description);
        }}
      />
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Transform-Optionen
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date format */}
            <div>
              <label className="block text-sm font-medium mb-2">Datumsformat</label>
              <select
                value={state.dateFormat}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  dateFormat: e.target.value as any 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="auto">Automatisch erkennen</option>
                <option value="dd.mm.yyyy">DD.MM.YYYY (Deutsch)</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD (ISO)</option>
              </select>
            </div>

            {/* Phone handling */}
            <div>
              <label className="block text-sm font-medium mb-2">Telefonnummer-Behandlung</label>
              <select
                value={state.phoneHandling}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  phoneHandling: e.target.value as any 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="combined">Kombiniert (ein Feld)</option>
                <option value="split">Aufteilen (Vorwahl/Nummer)</option>
              </select>
            </div>

            {/* Gender mapping */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Geschlecht-Mapping</label>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {Object.entries(state.genderMapping).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-8">{key}</span>
                    <span>→</span>
                    <select
                      value={value}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        genderMapping: {
                          ...prev.genderMapping,
                          [key]: e.target.value as 'M' | 'F'
                        }
                      }))}
                      className="px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Validierung & Vorschau
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {state.validation.stats.totalRows}
              </div>
              <div className="text-sm text-gray-600">Gesamt</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-500">
                {state.validation.stats.validRows}
              </div>
              <div className="text-sm text-gray-600">Gültig</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-500">
                {state.validation.stats.warningRows}
              </div>
              <div className="text-sm text-gray-600">Warnungen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-error-500">
                {state.validation.stats.errorRows}
              </div>
              <div className="text-sm text-gray-600">Fehler</div>
            </div>
          </div>

          <PreviewPane
            data={state.preview}
            validation={state.validation}
            mapping={state.mapping}
            customFields={state.customFields}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderResultStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success-500" />
            Import abgeschlossen
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <div className="text-lg font-medium text-success-500 mb-2">
            Import erfolgreich!
          </div>
          <div className="text-gray-600">
            {state.validation.stats.validRows} Datensätze wurden importiert.
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={() => {
            setStep('upload');
            setState(prev => ({
              ...prev,
              fileName: '',
              headersRaw: [],
              headersFixed: [],
              sampleRows: [],
              mapping: {},
              preview: [],
              validation: { valid: false, issues: [], stats: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 } }
            }));
          }}>
            Neuen Import starten
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with step indicators */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Enhanced Import (V2)</h2>
        <div className="flex items-center gap-2">
          {['upload', 'mapping', 'options', 'validation', 'result'].map((s, index) => (
            <Badge 
              key={s} 
              variant={s === step ? 'success' : index < ['upload', 'mapping', 'options', 'validation', 'result'].indexOf(step) ? 'default' : 'default'}
              size="sm"
            >
              {index + 1}
            </Badge>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Step content */}
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'options' && renderOptionsStep()}
      {step === 'validation' && renderValidationStep()}
      {step === 'result' && renderResultStep()}

      {/* Navigation */}
      {step !== 'result' && (
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={step === 'upload' ? onCancel : handleBack}
            disabled={isProcessing}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 'upload' ? 'Abbrechen' : 'Zurück'}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canGoNext() || isProcessing}
          >
            {isProcessing ? 'Verarbeite...' : (
              step === 'validation' ? 'Import starten' : (
                <>
                  Weiter
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )
            )}
          </Button>
        </div>
      )}

      {/* Custom field editor modal */}
      {showCustomFieldEditor && (
        <CustomFieldEditor
          isOpen={showCustomFieldEditor}
          onClose={() => setShowCustomFieldEditor(false)}
          onSave={handleAddCustomField}
          existingFields={state.customFields}
        />
      )}
    </div>
  );
}