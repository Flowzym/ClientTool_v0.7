/**
 * Custom field editor component
 * Allows users to create and configure custom fields
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { X, Plus, Trash2 } from 'lucide-react';

interface CustomField {
  id: string;
  name: string;
  label: string;
  description?: string;
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  required: boolean;
  defaultValue?: any;
  validationRules: Array<{
    type: 'minLength' | 'maxLength' | 'pattern' | 'range';
    parameters: Record<string, any>;
    message: string;
  }>;
}

interface CustomFieldEditorProps {
  field?: CustomField;
  onSave: (field: CustomField) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function CustomFieldEditor({
  field,
  onSave,
  onCancel,
  isOpen
}: CustomFieldEditorProps) {
  const [formData, setFormData] = useState<CustomField>({
    id: '',
    name: '',
    label: '',
    description: '',
    dataType: 'text',
    required: false,
    defaultValue: '',
    validationRules: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when field prop changes
  useEffect(() => {
    if (field) {
      setFormData(field);
    } else {
      setFormData({
        id: crypto.randomUUID(),
        name: '',
        label: '',
        description: '',
        dataType: 'text',
        required: false,
        defaultValue: '',
        validationRules: []
      });
    }
    setErrors({});
  }, [field, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Feldname ist erforderlich';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Feldname muss mit Buchstabe beginnen und darf nur Buchstaben, Zahlen und _ enthalten';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Anzeigename ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onSave({
      ...formData,
      name: formData.name.trim(),
      label: formData.label.trim(),
      description: formData.description?.trim() || undefined
    });
  };

  const addValidationRule = () => {
    setFormData(prev => ({
      ...prev,
      validationRules: [
        ...prev.validationRules,
        {
          type: 'minLength',
          parameters: { min: 1 },
          message: 'Wert ist zu kurz'
        }
      ]
    }));
  };

  const removeValidationRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules.filter((_, i) => i !== index)
    }));
  };

  const updateValidationRule = (index: number, updates: Partial<CustomField['validationRules'][0]>) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules.map((rule, i) => 
        i === index ? { ...rule, ...updates } : rule
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {field ? 'Eigenes Feld bearbeiten' : 'Neues eigenes Feld erstellen'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Basic field info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Feldname (technisch) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. customNote"
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <div className="text-xs text-red-600 mt-1">{errors.name}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Wird für interne Speicherung verwendet
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Anzeigename *
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="z.B. Eigene Notiz"
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.label ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.label && (
                <div className="text-xs text-red-600 mt-1">{errors.label}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Wird in der Benutzeroberfläche angezeigt
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optionale Beschreibung des Feldes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Datentyp</label>
              <select
                value={formData.dataType}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  dataType: e.target.value as CustomField['dataType']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="text">Text</option>
                <option value="number">Zahl</option>
                <option value="date">Datum</option>
                <option value="boolean">Ja/Nein</option>
                <option value="email">E-Mail</option>
                <option value="phone">Telefon</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Standardwert</label>
              <input
                type="text"
                value={formData.defaultValue}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                placeholder="Optionaler Standardwert..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.required}
                onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Pflichtfeld</span>
            </label>
          </div>

          {/* Validation rules section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Validierungsregeln</h4>
              <Button variant="ghost" size="sm" onClick={addValidationRule}>
                <Plus className="w-4 h-4 mr-2" />
                Regel hinzufügen
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.validationRules.map((rule, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <select
                      value={rule.type}
                      onChange={(e) => updateValidationRule(index, { 
                        type: e.target.value as any 
                      })}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="minLength">Mindestlänge</option>
                      <option value="maxLength">Maximallänge</option>
                      <option value="pattern">Muster (Regex)</option>
                      <option value="range">Zahlenbereich</option>
                    </select>
                    
                    <button
                      onClick={() => removeValidationRule(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Parameter (z.B. 5)"
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    />
                    <input
                      type="text"
                      value={rule.message}
                      onChange={(e) => updateValidationRule(index, { message: e.target.value })}
                      placeholder="Fehlermeldung"
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    />
                  </div>
                </div>
              ))}
              
              {formData.validationRules.length === 0 && (
                <div className="text-sm text-gray-500 italic text-center py-4">
                  Keine Validierungsregeln definiert
                </div>
              )}
            </div>
          </div>

          {/* Field preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Vorschau</h4>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                {formData.label || 'Feldname'}
                {formData.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type={formData.dataType === 'email' ? 'email' : 
                     formData.dataType === 'number' ? 'number' :
                     formData.dataType === 'date' ? 'date' : 'text'}
                placeholder={formData.defaultValue || `${formData.dataType} eingeben...`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
              {formData.description && (
                <div className="text-xs text-gray-500">{formData.description}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={handleSave}>
            {field ? 'Feld aktualisieren' : 'Feld erstellen'}
          </Button>
        </div>
      </div>
    </div>
  );
}