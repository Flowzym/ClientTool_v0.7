/**
 * Template management bar component
 * Quick access to templates and template actions
 */

import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { 
  Save, 
  FolderOpen, 
  Settings, 
  Wand2,
  X
} from 'lucide-react';
import type { ImportTemplate } from '../templates/types';

interface TemplateBarProps {
  currentTemplate?: ImportTemplate;
  availableTemplates: ImportTemplate[];
  onTemplateSelect: (templateId: string) => void;
  onSaveAsTemplate: () => void;
  onManageTemplates: () => void;
  autoDetectedTemplate?: ImportTemplate;
  isLoading?: boolean;
}

export function TemplateBar({
  currentTemplate,
  availableTemplates,
  onTemplateSelect,
  onSaveAsTemplate,
  onManageTemplates,
  autoDetectedTemplate
}: TemplateBarProps) {
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    
    // TODO: Implement actual template saving
    console.log('Save template:', { name: templateName, description: templateDescription });
    onSaveAsTemplate();
    setShowSaveDialog(false);
    setTemplateName('');
    setTemplateDescription('');
  };

  return (
    <div className="space-y-4">
      {/* Auto-detection notification */}
      {autoDetectedTemplate && !currentTemplate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-800">
                  Vorlage automatisch erkannt
                </div>
                <div className="text-xs text-blue-600">
                  "{autoDetectedTemplate.metadata.name}" passt zu Ihrer Datei
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTemplateSelect(autoDetectedTemplate.metadata.id)}
              >
                Anwenden
              </Button>
              <button
                onClick={() => {
                  // TODO: Dismiss auto-detection
                }}
                className="text-blue-400 hover:text-blue-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Vorlage:</span>
            </div>
            
            {currentTemplate ? (
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  {currentTemplate.metadata.name}
                </Badge>
                <button
                  onClick={() => onTemplateSelect('')}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Vorlage entfernen"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTemplateSelect(true)}
                className="text-sm text-accent-600 hover:text-accent-700"
              >
                Vorlage auswählen...
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="w-4 h-4 mr-2" />
              Als Vorlage speichern
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTemplates}
            >
              <Settings className="w-4 h-4 mr-2" />
              Verwalten
            </Button>
          </div>
        </div>
        
        {/* Current template info */}
        {currentTemplate && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Erstellt:</span> {' '}
                  {new Date(currentTemplate.metadata.createdAt).toLocaleDateString('de-DE')}
                </div>
                <div>
                  <span className="font-medium">Verwendet:</span> {' '}
                  {currentTemplate.metadata.usageCount || 0}x
                </div>
              </div>
              {currentTemplate.metadata.description && (
                <div className="mt-2">
                  <span className="font-medium">Beschreibung:</span> {currentTemplate.metadata.description}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template selection modal */}
      {showTemplateSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Vorlage auswählen</h3>
              <button
                onClick={() => setShowTemplateSelect(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableTemplates.map(template => (
                <button
                  key={template.metadata.id}
                  onClick={() => {
                    onTemplateSelect(template.metadata.id);
                    setShowTemplateSelect(false);
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="font-medium">{template.metadata.name}</div>
                  {template.metadata.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {template.metadata.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Verwendet: {template.metadata.usageCount || 0}x
                  </div>
                </button>
              ))}
              
              {availableTemplates.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-sm">Keine Vorlagen verfügbar</div>
                  <div className="text-xs mt-1">Erstellen Sie eine Vorlage aus Ihrem aktuellen Mapping</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save template modal */}
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
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="z.B. AMS-Export Standard"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Beschreibung</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Optionale Beschreibung der Vorlage..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}