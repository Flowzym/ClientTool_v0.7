/**
 * Main mapping wizard component for Importer V2
 * Guides users through the import mapping process
 */

import React, { useState, useCallback, useRef } from 'react';
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
  Wand2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { normalizeHeader, displayHeader } from '../core/normalize';
import { findBestMappings } from '../core/score';
import { validateBatch } from '../core/validate';
import { templateStore } from '../templates/store';
import { MappingTable } from './MappingTable';
import { TemplateBar } from './TemplateBar';
import { PreviewPane } from './PreviewPane';
import { CustomFieldEditor } from './CustomFieldEditor';
import type { InternalField, ValidationResult } from '../core/types';
import type { ImportTemplate } from '../templates/types';

type WizardStep = 'file' | 'mapping' | 'options' | 'validation';

interface WizardState {
  // File data
  fileName: string;
  headersRaw: string[];
  headersFixed: string[];
  sampleRows: string[][];
  
  // Mapping state
  autoMapEnabled: boolean;
  mapping: Record<string, InternalField>;
  customFields: Array<{
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required: boolean;
  }>;
  
  // Template state
  currentTemplate?: ImportTemplate;
  
  // Validation state
  validationResult?: ValidationResult;
  
  // Options
  dateFormat: 'auto' | 'dd.mm.yyyy' | 'yyyy-mm-dd';
  genderMapping: Record<string, 'M' | 'F' | 'D'>;
  phoneFormat: 'split' | 'combined';
}

interface MappingWizardProps {
  onComplete?: (result: {
    mapping: Record<string, InternalField>;
    data: any[];
    validation: ValidationResult;
  }) => void;
  onCancel?: () => void;
  initialFile?: File;
}

export function MappingWizard({ onComplete, onCancel, initialFile }: MappingWizardProps) {
  const [step, setStep] = useState<WizardStep>('file');
  const [state, setState] = useState<WizardState>({
    fileName: '',
    headersRaw: [],
    headersFixed: [],
    sampleRows: [],
    autoMapEnabled: true,
    mapping: {},
    customFields: [],
    dateFormat: 'auto',
    genderMapping: {
      'm': 'M', 'w': 'F', 'd': 'D',
      'männlich': 'M', 'weiblich': 'F', 'divers': 'D'
    },
    phoneFormat: 'combined'
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomFieldEditor, setShowCustomFieldEditor] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<ImportTemplate[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates on mount
  React.useEffect(() => {
    templateStore.listTemplates().then(setAvailableTemplates);
  }, []);

  // File upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Keine Arbeitsblätter gefunden');
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      
      if (rawData.length < 2) {
        throw new Error('Keine Datenzeilen gefunden');
      }

      const headersRaw = rawData[0];
      const headersFixed = headersRaw.map(h => displayHeader(h));
      const sampleRows = rawData.slice(1, 21); // First 20 rows

      setState(prev => ({
        ...prev,
        fileName: file.name,
        headersRaw,
        headersFixed,
        sampleRows
      }));
      
      // Auto-detect template
      const detectedTemplate = await templateStore.autoDetectTemplate(
        file.name,
        headersRaw,
        sampleRows
      );
      
      if (detectedTemplate) {
        setState(prev => ({ ...prev, currentTemplate: detectedTemplate.template }));
      }
      
      setStep('mapping');
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Verarbeiten der Datei');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Auto-mapping handler
  const handleAutoMap = useCallback(() => {
    if (!state.autoMapEnabled) return;
    
    const fields: InternalField[] = [
      'amsId', 'firstName', 'lastName', 'title', 'gender', 'birthDate',
      'svNumber', 'phone', 'email', 'address', 'zip', 'city',
      'status', 'priority', 'angebot', 'amsAdvisor'
    ];
    
    const mappings = findBestMappings(fields, state.headersRaw, state.sampleRows);
    const mapping: Record<string, InternalField> = {};
    
    Object.entries(mappings).forEach(([columnIndex, guess]) => {
      if (guess.confidence > 0.5) {
        mapping[columnIndex] = guess.field;
      }
    });
    
    setState(prev => ({ ...prev, mapping }));
  }, [state.autoMapEnabled, state.headersRaw, state.sampleRows]);

  // Template application
  const handleApplyTemplate = useCallback(async (templateId: string) => {
    const template = await templateStore.getTemplate(templateId);
    if (!template) return;
    
    setState(prev => ({
      ...prev,
      currentTemplate: template,
      mapping: { ...template.columnMappings },
      customFields: [...template.customFields || []]
    }));
  }, []);

  // Validation handler
  const handleValidation = useCallback(() => {
    const mappedData = state.sampleRows.map(row => {
      const mapped: Record<InternalField, any> = {} as any;
      Object.entries(state.mapping).forEach(([columnIndex, field]) => {
        mapped[field] = row[parseInt(columnIndex)];
      });
      return mapped;
    });
    
    const validationResult = validateBatch(mappedData);
    setState(prev => ({ ...prev, validationResult }));
    setStep('validation');
  }, [state.mapping, state.sampleRows]);

  // Step navigation
  const canGoNext = () => {
    switch (step) {
      case 'file': return state.headersRaw.length > 0;
      case 'mapping': return Object.keys(state.mapping).length > 0;
      case 'options': return true;
      case 'validation': return state.validationResult?.valid || false;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'file': setStep('mapping'); break;
      case 'mapping': setStep('options'); break;
      case 'options': handleValidation(); break;
      case 'validation': 
        if (onComplete && state.validationResult) {
          onComplete({
            mapping: state.mapping,
            data: [], // TODO: Transform data
            validation: state.validationResult
          });
        }
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'mapping': setStep('file'); break;
      case 'options': setStep('mapping'); break;
      case 'validation': setStep('options'); break;
    }
  };

  // Render step content
  const renderFileStep = () => (
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
              <p className="text-gray-500">Intelligente Spalten-Erkennung mit Encoding-Reparatur</p>
            </div>
            
            <div className="mt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={isProcessing}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100"
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}
          
          {state.headersRaw.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">Datei verarbeitet: {state.fileName}</div>
                <div className="space-y-1">
                  <div>📊 {state.headersRaw.length} Spalten, {state.sampleRows.length} Beispielzeilen</div>
                  {state.headersRaw.some((h, i) => h !== state.headersFixed[i]) && (
                    <div>🔧 Encoding-Reparaturen erkannt (Stra�e → Straße)</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <TemplateBar
        currentTemplate={state.currentTemplate}
        availableTemplates={availableTemplates}
        onTemplateSelect={handleApplyTemplate}
        onSaveAsTemplate={async () => {
          // TODO: Implement save as template
          console.log('Save as template');
        }}
        onManageTemplates={() => {
          // TODO: Implement template management
          console.log('Manage templates');
        }}
        autoDetectedTemplate={state.currentTemplate}
        isLoading={false}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Spalten-Zuordnung
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.autoMapEnabled}
                    onChange={(e) => {
                      setState(prev => ({ ...prev, autoMapEnabled: e.target.checked }));
                      if (e.target.checked) {
                        handleAutoMap();
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <Wand2 className="w-4 h-4" />
                  Automatisch zuordnen
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomFieldEditor(true)}
                >
                  + Eigenes Feld
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MappingTable
            headers={state.headersRaw}
            headersFixed={state.headersFixed}
            sampleData={state.sampleRows}
            mappings={state.mapping}
            onMappingChange={(column, field) => {
              setState(prev => ({
                ...prev,
                mapping: { ...prev.mapping, [column]: field as InternalField }
              }));
            }}
            autoMapEnabled={state.autoMapEnabled}
            onAutoMap={handleAutoMap}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderOptionsStep = () => (
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
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Datumsformat</label>
            <div className="space-y-2">
              {[
                { key: 'auto', label: 'Automatisch erkennen' },
                { key: 'dd.mm.yyyy', label: 'DD.MM.YYYY (Deutsch)' },
                { key: 'yyyy-mm-dd', label: 'YYYY-MM-DD (ISO)' }
              ].map(option => (
                <label key={option.key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={option.key}
                    checked={state.dateFormat === option.key}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      dateFormat: e.target.value as any 
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Telefon-Format</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="combined"
                  checked={state.phoneFormat === 'combined'}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    phoneFormat: e.target.value as any 
                  }))}
                  className="rounded border-gray-300"
                />
                <span>Kombiniert (+43 1 234 5678)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="split"
                  checked={state.phoneFormat === 'split'}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    phoneFormat: e.target.value as any 
                  }))}
                  className="rounded border-gray-300"
                />
                <span>Aufgeteilt (Ländercode + Vorwahl + Nummer)</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Gender-Mapping</label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(state.genderMapping).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>"{key}"</span>
                  <span>→ {value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              {state.validationResult?.valid ? (
                <CheckCircle className="w-5 h-5 text-success-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-error-500" />
              )}
              Validierung
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-500">
                    {state.validationResult.stats.validRows}
                  </div>
                  <div className="text-sm text-gray-600">Gültig</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning-500">
                    {state.validationResult.stats.warningRows}
                  </div>
                  <div className="text-sm text-gray-600">Warnungen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-error-500">
                    {state.validationResult.stats.errorRows}
                  </div>
                  <div className="text-sm text-gray-600">Fehler</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500">
                    {state.validationResult.stats.totalRows}
                  </div>
                  <div className="text-sm text-gray-600">Gesamt</div>
                </div>
              </div>
              
              {state.validationResult.issues.length > 0 && (
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {state.validationResult.issues.slice(0, 10).map((issue, index) => (
                      <div key={index} className={`p-3 rounded border ${
                        issue.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="text-sm">
                          <span className="font-medium">Zeile {issue.row}:</span> {issue.message}
                          {issue.suggestion && (
                            <div className="text-xs text-gray-600 mt-1">💡 {issue.suggestion}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {state.validationResult.issues.length > 10 && (
                      <div className="text-sm text-gray-500 text-center">
                        ... und {state.validationResult.issues.length - 10} weitere Probleme
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <PreviewPane
        data={{
          headers: state.headersFixed,
          rows: state.sampleRows,
          mappings: state.mapping,
          validationIssues: state.validationResult?.issues || []
        }}
        maxRows={20}
        showValidation={true}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Import Mapping Wizard</h2>
        <div className="flex items-center gap-2">
          <Badge variant="warning" size="md">Experimental</Badge>
          {['file', 'mapping', 'options', 'validation'].map((s, index) => (
            <Badge 
              key={s} 
              variant={s === step ? 'success' : index < ['file', 'mapping', 'options', 'validation'].indexOf(step) ? 'default' : 'default'}
              size="sm"
            >
              {index + 1}
            </Badge>
          ))}
        </div>
      </div>

      {step === 'file' && renderFileStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'options' && renderOptionsStep()}
      {step === 'validation' && renderValidationStep()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={step === 'file' ? onCancel : handleBack}
          disabled={isProcessing}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 'file' ? 'Abbrechen' : 'Zurück'}
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

      {/* Custom Field Editor Modal */}
      <CustomFieldEditor
        isOpen={showCustomFieldEditor}
        onSave={(field) => {
          setState(prev => ({
            ...prev,
            customFields: [...prev.customFields, field]
          }));
          setShowCustomFieldEditor(false);
        }}
        onCancel={() => setShowCustomFieldEditor(false)}
      />
    </div>
  );
}