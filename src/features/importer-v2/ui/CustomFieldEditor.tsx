/**
 * Custom field editor modal
 * Allows users to define additional fields beyond standard schema
 */

import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { X, Plus } from 'lucide-react';
import type { CustomField } from '../core/types';

interface CustomFieldEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: CustomField) => void;
  existingFields: CustomField[];
}

export function CustomFieldEditor({ isOpen, onClose, onSave, existingFields }: CustomFieldEditorProps) {
  const [fieldData, setFieldData] = useState<Partial<CustomField>>({
    label: '',
    type: 'text',
    required: false,
    description: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    
    if (!fieldData.label?.trim()) {
      setError('Feldname ist erforderlich');
      return;
    }
    
    // Check for duplicate labels
    const existingLabels = existingFields.map(f => f.label.toLowerCase());
    if (existingLabels.includes(fieldData.label.toLowerCase())) {
      setError('Ein Feld mit diesem Namen existiert bereits');
      return;
    }
    
    const customField: CustomField = {
      id: `custom_${Date.now()}`,
      label: fieldData.label.trim(),
      type: fieldData.type || 'text',
      required: fieldData.required || false,
      description: fieldData.description?.trim() || undefined,
      validation: fieldData.validation
    };
    
    onSave(customField);
    
    // Reset form
    setFieldData({
      label: '',
      type: 'text',
      required: false,
      description: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Eigenes Feld hinzufügen</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Feldname *</label>
            <input
              type="text"
              value={fieldData.label || ''}
              onChange={(e) => setFieldData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="z.B. Abteilung, Kostenstelle, ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Feldtyp</label>
            <select
              value={fieldData.type || 'text'}
              onChange={(e) => setFieldData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="text">Text</option>
              <option value="number">Zahl</option>
              <option value="date">Datum</option>
              <option value="email">E-Mail</option>
              <option value="phone">Telefon</option>
              <option value="boolean">Ja/Nein</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Beschreibung</label>
            <textarea
              value={fieldData.description || ''}
              onChange={(e) => setFieldData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optionale Beschreibung für dieses Feld..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={fieldData.required || false}
                onChange={(e) => setFieldData(prev => ({ ...prev, required: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Pflichtfeld</span>
            </label>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSave}>
            <Plus className="w-4 h-4 mr-2" />
            Feld hinzufügen
          </Button>
        </div>
      </div>
    </div>
  );
}