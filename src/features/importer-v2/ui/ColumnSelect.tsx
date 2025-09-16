/**
 * Column selection component for Importer V2
 * Smart field selection with search and filtering
 */

import React from 'react';
import { Search, Filter } from 'lucide-react';

// TODO: Implement smart column selection
// - Searchable field list
// - Category-based filtering
// - Confidence-based sorting
// - Custom field creation
// - Field usage statistics

interface ColumnSelectProps {
  availableFields: string[];
  selectedField?: string;
  onFieldSelect: (field: string) => void;
  onFieldClear: () => void;
  suggestions?: Array<{
    field: string;
    confidence: number;
    reason: string;
  }>;
}

export function ColumnSelect({
  availableFields,
  selectedField,
  onFieldSelect,
  onFieldClear,
  suggestions = []
}: ColumnSelectProps) {
  // TODO: Implement column selection logic
  // - Search functionality
  // - Category filtering
  // - Suggestion ranking
  // - Custom field creation
  // - Field description tooltips

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        TODO: Intelligente Feld-Auswahl mit Suche und Vorschlägen
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Feld suchen..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Kategorien:</span>
          <div className="flex gap-1">
            {['Basis', 'Kontakt', 'AMS', 'Intern'].map(category => (
              <button
                key={category}
                className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="max-h-48 overflow-y-auto border rounded">
        {availableFields.map(field => (
          <button
            key={field}
            onClick={() => onFieldSelect(field)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
              selectedField === field ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            {field}
          </button>
        ))}
      </div>
      
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Vorschläge:</div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onFieldSelect(suggestion.field)}
              className="w-full flex items-center justify-between p-2 border rounded hover:bg-gray-50"
            >
              <span className="text-sm">{suggestion.field}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{suggestion.reason}</span>
                <span className="text-xs font-medium">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}