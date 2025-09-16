/**
 * Custom field editor for Importer V2
 * Create and edit custom field mappings and transformations
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Plus, Edit, Trash2, Code } from 'lucide-react';

// TODO: Implement custom field editor
// - Create custom field definitions
// - Define transformation rules
// - Set validation parameters
// - Preview transformations
// - Save custom fields for reuse

interface CustomFieldEditorProps {
  onFieldCreate: (field: any) => void;
  onFieldUpdate: (id: string, field: any) => void;
  onFieldDelete: (id: string) => void;
  existingFields: any[];
}

export function CustomFieldEditor({
  onFieldCreate,
  onFieldUpdate,
  onFieldDelete,
  existingFields
}: CustomFieldEditorProps) {
  // TODO: Implement custom field editor logic
  // - Field definition form
  // - Transformation rule builder
  // - Validation rule editor
  // - Preview functionality
  // - Field management (CRUD)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Benutzerdefinierte Felder
        </h3>
        <Button variant="secondary" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Neues Feld
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Feld-Editor
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              TODO: Implementiere benutzerdefinierten Feld-Editor
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Feld-Name
                </label>
                <input
                  type="text"
                  placeholder="z.B. customStatus"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Feld-Typ
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="text">Text</option>
                  <option value="number">Zahl</option>
                  <option value="date">Datum</option>
                  <option value="boolean">Ja/Nein</option>
                  <option value="enum">Auswahlliste</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Transformations-Regel
                </label>
                <textarea
                  placeholder="z.B. value.toLowerCase().trim()"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Vorschau
              </Button>
              <Button size="sm">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {existingFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vorhandene Felder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingFields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{field.name || `Feld ${index + 1}`}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({field.type || 'text'})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}