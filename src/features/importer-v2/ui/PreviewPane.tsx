/**
 * Data preview pane with validation results
 * Shows transformed data and validation issues
 */

import React, { useState } from 'react';
import { Badge } from '../../../components/Badge';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import type { InternalField, MappingResult, CustomField, ValidationResult } from '../core/types';

interface PreviewPaneProps {
  data: Array<Record<InternalField, any>>;
  validation: ValidationResult;
  mapping: Record<string, MappingResult>;
  customFields: CustomField[];
  maxRows?: number;
}

export function PreviewPane({ 
  data, 
  validation, 
  mapping, 
  customFields, 
  maxRows = 10 
}: PreviewPaneProps) {
  const [showAllRows, setShowAllRows] = useState(false);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const displayData = showAllRows ? data : data.slice(0, maxRows);
  const mappedFields = Object.values(mapping).map(m => m.field);
  const customFieldIds = customFields.map(f => f.id);
  const allFields = [...mappedFields, ...customFieldIds];

  const getFieldLabel = (field: string): string => {
    // Check if it's a custom field
    const customField = customFields.find(f => f.id === field);
    if (customField) return customField.label;
    
    // TODO: Use field labels from core/types
    return field;
  };

  const getRowIssues = (rowIndex: number) => {
    return validation.issues.filter(issue => issue.row === rowIndex + 1);
  };

  const getIssueIcon = (type: 'error' | 'warning') => {
    return type === 'error' ? (
      <AlertCircle className="w-4 h-4 text-error-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-warning-500" />
    );
  };

  const filteredData = showOnlyErrors 
    ? displayData.filter((_, index) => getRowIssues(index).some(issue => issue.type === 'error'))
    : displayData;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="font-medium">Datenvorschau</h4>
          <Badge variant={validation.valid ? 'success' : 'error'} size="sm">
            {validation.valid ? 'Gültig' : 'Fehler gefunden'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyErrors}
              onChange={(e) => setShowOnlyErrors(e.target.checked)}
              className="rounded border-gray-300"
            />
            Nur Fehler anzeigen
          </label>
          
          {data.length > maxRows && (
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700"
            >
              {showAllRows ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Weniger anzeigen
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Alle {data.length} Zeilen
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Data table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex gap-4 text-xs font-medium text-gray-600">
            <div className="w-12">#</div>
            {allFields.map(field => (
              <div key={field} className="min-w-[120px] truncate">
                {getFieldLabel(field)}
              </div>
            ))}
            <div className="w-20">Status</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredData.map((row, index) => {
            const issues = getRowIssues(index);
            const hasErrors = issues.some(issue => issue.type === 'error');
            const hasWarnings = issues.some(issue => issue.type === 'warning');
            
            return (
              <div 
                key={index} 
                className={`px-4 py-2 text-sm ${hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-yellow-50' : ''}`}
              >
                <div className="flex gap-4 items-center">
                  <div className="w-12 text-gray-500">{index + 1}</div>
                  
                  {allFields.map(field => (
                    <div key={field} className="min-w-[120px] truncate">
                      {(row as any)[field] || '—'}
                    </div>
                  ))}
                  
                  <div className="w-20">
                    {hasErrors ? (
                      <Badge variant="error" size="sm">Fehler</Badge>
                    ) : hasWarnings ? (
                      <Badge variant="warning" size="sm">Warnung</Badge>
                    ) : (
                      <Badge variant="success" size="sm">OK</Badge>
                    )}
                  </div>
                </div>
                
                {/* Issue details */}
                {issues.length > 0 && (
                  <div className="mt-2 ml-16 space-y-1">
                    {issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {getIssueIcon(issue.type)}
                        <span className="font-medium">{issue.field}:</span>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {filteredData.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            {showOnlyErrors ? 'Keine Fehler gefunden' : 'Keine Daten zum Anzeigen'}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>Zeilen: {data.length}</div>
          <div>Zugeordnet: {Object.keys(mapping).length} Spalten</div>
          <div>Eigene Felder: {customFields.length}</div>
          <div>Gültigkeitsrate: {data.length > 0 ? Math.round((validation.stats.validRows / data.length) * 100) : 0}%</div>
        </div>
      </div>
    </div>
  );
}