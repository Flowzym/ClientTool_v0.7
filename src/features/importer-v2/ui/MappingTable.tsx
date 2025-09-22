/**
 * Column mapping table component
 * Interactive table for mapping source columns to target fields
 */

import React, { useState } from 'react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { 
  ArrowRight, 
  Wand2, 
  X, 
  Search,
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { normalizeHeader } from '../core/normalize';
import { guessColumn } from '../core/score';
import { ColumnSelect } from './ColumnSelect';
import type { InternalField } from '../core/types';

interface MappingTableProps {
  headers: string[];
  headersFixed: string[];
  sampleData: string[][];
  mappings: Record<string, InternalField>;
  onMappingChange: (column: string, field: InternalField | '') => void;
  autoMapEnabled: boolean;
  onAutoMap: () => void;
  validationIssues?: Array<{
    column: string;
    type: 'error' | 'warning';
    message: string;
  }>;
}

export function MappingTable({
  headers,
  headersFixed,
  sampleData,
  mappings,
  onMappingChange,
  autoMapEnabled,
  onAutoMap,
  validationIssues = []
}: MappingTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMapped, setShowOnlyMapped] = useState(false);

  const filteredHeaders = headers.filter((header, index) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return header.toLowerCase().includes(searchLower) || 
             headersFixed[index].toLowerCase().includes(searchLower);
    }
    
    if (showOnlyMapped) {
      return mappings[index.toString()];
    }
    
    return true;
  });

  const getColumnSamples = (columnIndex: number): string[] => {
    return sampleData
      .map(row => row[columnIndex])
      .filter(Boolean)
      .slice(0, 3);
  };

  const getColumnIssues = (columnIndex: number) => {
    const header = headers[columnIndex];
    return validationIssues.filter(issue => issue.column === header);
  };

  const getSuggestions = (columnIndex: number) => {
    const header = headers[columnIndex];
    const samples = getColumnSamples(columnIndex);
    
    // Get suggestions for this column
    const fields: InternalField[] = [
      'amsId', 'firstName', 'lastName', 'title', 'gender', 'birthDate',
      'svNumber', 'phone', 'email', 'address', 'zip', 'city',
      'status', 'priority', 'angebot', 'amsAdvisor'
    ];
    
    const suggestions = fields.map(field => 
      guessColumn(field, [header], [samples])
    ).filter(guess => guess.confidence > 0.3)
     .sort((a, b) => b.confidence - a.confidence)
     .slice(0, 3);
    
    return suggestions;
  };

  return (
    <div className="space-y-4">
      {/* Table controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Spalten durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyMapped}
              onChange={(e) => setShowOnlyMapped(e.target.checked)}
              className="rounded border-gray-300"
            />
            Nur zugeordnete
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAutoMap}
            disabled={!autoMapEnabled}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Alle auto-zuordnen
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              Object.keys(mappings).forEach(column => {
                onMappingChange(column, '');
              });
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Alle löschen
          </Button>
        </div>
      </div>

      {/* Mapping table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-48">
                  Quell-Spalte
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-64">
                  Beispieldaten
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-48">
                  Ziel-Feld
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-24">
                  Qualität
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-20">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHeaders.map((header, filteredIndex) => {
                const originalIndex = headers.indexOf(header);
                const headerFixed = headersFixed[originalIndex];
                const mapping = mappings[originalIndex.toString()];
                const samples = getColumnSamples(originalIndex);
                const issues = getColumnIssues(originalIndex);
                const suggestions = getSuggestions(originalIndex);
                const bestSuggestion = suggestions[0];
                
                const hasRepairs = header !== headerFixed;
                
                return (
                  <tr key={originalIndex} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-medium">{header}</div>
                        {hasRepairs && (
                          <div className="text-xs text-green-600">
                            🔧 {headerFixed}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Spalte {originalIndex + 1}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {samples.map((sample, i) => (
                          <div key={i} className="text-xs text-gray-600 truncate max-w-48">
                            {sample}
                          </div>
                        ))}
                        {samples.length === 0 && (
                          <div className="text-xs text-gray-400 italic">Keine Daten</div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <ColumnSelect
                        value={mapping}
                        onChange={(field) => onMappingChange(originalIndex.toString(), field)}
                        suggestions={suggestions.map(s => ({
                          field: s.field,
                          confidence: s.confidence,
                          reason: s.reasons[0] || 'Automatisch erkannt'
                        }))}
                        placeholder="Feld auswählen..."
                        showConfidence={true}
                      />
                    </td>
                    
                    <td className="px-4 py-3">
                      {bestSuggestion && (
                        <div className="text-center">
                          <div className={`text-xs font-medium ${
                            bestSuggestion.confidence > 0.8 ? 'text-success-500' :
                            bestSuggestion.confidence > 0.5 ? 'text-warning-500' : 'text-error-500'
                          }`}>
                            {Math.round(bestSuggestion.confidence * 100)}%
                          </div>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-4 py-3 text-center">
                      {issues.length > 0 ? (
                        <AlertCircle className="w-4 h-4 text-error-500" />
                      ) : mapping ? (
                        <CheckCircle className="w-4 h-4 text-success-500" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mapping summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="font-medium">Zugeordnet:</span> {Object.keys(mappings).length}/{headers.length}
            </div>
            <div>
              <span className="font-medium">Auto-Mapping:</span> {autoMapEnabled ? 'Aktiv' : 'Deaktiviert'}
            </div>
            <div>
              <span className="font-medium">Reparaturen:</span> {headers.filter((h, i) => h !== headersFixed[i]).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}