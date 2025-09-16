/**
 * Template management bar
 * Save, load, and manage mapping templates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { 
  Save, 
  FolderOpen, 
  Download, 
  Upload,
  Trash2,
  Star,
  Clock
} from 'lucide-react';
import { saveTemplate, listTemplates, deleteTemplate } from '../templates/store';
import type { MappingResult, CustomField } from '../core/types';
import type { TemplateMetadata } from '../templates/types';

interface TemplateBarProps {
  currentMapping: Record<string, MappingResult>;
  customFields: CustomField[];
  onApplyTemplate: (template: any) => void;
  onSaveTemplate: (name: string, description?: string) => void;
}

export function TemplateBar({ 
  currentMapping, 
  customFields, 
  onApplyTemplate, 
  onSaveTemplate 
}: TemplateBarProps) {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  // Load templates on mount
  useEffect(() => {
    loadTemplateList();
  }, []);

  const loadTemplateList = async () => {
    try {
      const templateList = await listTemplates();
      setTemplates(templateList);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!saveName.trim()) return;
    
    try {
      await saveTemplate({
        metadata: {
          id: `template_${Date.now()}`,
          name: saveName.trim(),
          description: saveDescription.trim() || undefined,
          createdAt: new Date().toISOString(),
          fieldCount: Object.keys(currentMapping).length,
          customFieldCount: customFields.length
        },
        mapping: currentMapping,
        customFields,
        options: {
          dateFormat: 'auto',
          phoneHandling: 'combined',
          genderMapping: {}
        }
      });
      
      await loadTemplateList();
      onSaveTemplate(saveName, saveDescription);
      
      setShowSaveDialog(false);
      setSaveName('');
      setSaveDescription('');
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return;
    
    try {
      await deleteTemplate(templateId);
      await loadTemplateList();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleExportTemplate = (template: TemplateMetadata) => {
    // TODO: Export template as JSON file
    console.log('Export template:', template.name);
  };

  const handleImportTemplate = () => {
    // TODO: Import template from JSON file
    console.log('Import template from file');
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Vorlagen:</span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={Object.keys(currentMapping).length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Speichern
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLoadDialog(true)}
              disabled={templates.length === 0}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Laden
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImportTemplate}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importieren
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            {templates.length} Vorlagen verfügbar
          </div>
        </div>

        {/* Save template dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Vorlage speichern</h3>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="z.B. AMS-Export Standard"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Beschreibung</label>
                  <textarea
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Optionale Beschreibung..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                  />
                </div>
                
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Speichert: {Object.keys(currentMapping).length} Spalten-Zuordnungen
                  {customFields.length > 0 && `, ${customFields.length} eigene Felder`}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSaveTemplate} disabled={!saveName.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Load template dialog */}
        {showLoadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Vorlage laden</h3>
                <button
                  onClick={() => setShowLoadDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {template.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="default" size="sm">
                            {template.fieldCount} Felder
                          </Badge>
                          {template.customFieldCount > 0 && (
                            <Badge variant="warning" size="sm">
                              {template.customFieldCount} eigene
                            </Badge>
                          )}
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(template.createdAt).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportTemplate(template)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-error-500 hover:text-error-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // TODO: Load full template and apply
                            console.log('Apply template:', template.id);
                            setShowLoadDialog(false);
                          }}
                        >
                          Anwenden
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div>Noch keine Vorlagen gespeichert</div>
                    <div className="text-xs mt-1">
                      Speichern Sie Ihre erste Vorlage für zukünftige Importe
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <Button variant="ghost" onClick={() => setShowLoadDialog(false)}>
                  Schließen
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}