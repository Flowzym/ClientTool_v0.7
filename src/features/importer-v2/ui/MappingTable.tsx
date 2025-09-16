/**
 * Interactive mapping table component
 * Shows CSV headers with smart field suggestions and manual overrides
 */

import React from 'react';
import { Badge } from '../../../components/Badge';
import { AlertCircle, CheckCircle, ArrowRight, X } from 'lucide-react';
import { ColumnSelect } from './ColumnSelect';
import { displayHeader } from '../core/normalize';
import type { InternalField, MappingResult, CustomField } from '../core/types';

interface MappingTableProps {
  headersRaw: string[];
  headersFixed: string[];
  sampleRows: string[][];
  mapping: Record<string, MappingResult>;
  customFields: CustomField[];
  onMappingChange: (mapping: Record<string, MappingResult>) => void;
}

export function MappingTable({
  headersRaw,
  headersFixed,
  sampleRows,
  mapping,
  customFields,
  onMappingChange
}: MappingTableProps) {
  const handleColumnMapping = (columnIndex: string, mappingResult: MappingResult | null) => {
    const newMapping = { ...mapping };
    
    if (mappingResult) {
      newMapping[columnIndex] = mappingResult;
    } else {
      delete newMapping[columnIndex];
    }
    
    onMappingChange(newMapping);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="success" size="sm">Hoch</Badge>;
    if (confidence >= 0.5) return <Badge variant="warning" size="sm">Mittel</Badge>;
    return <Badge variant="error" size="sm">Niedrig</Badge>;
  };

  const getSampleValues = (columnIndex: number): string[] => {
    return sampleRows
      .slice(0, 3)
      .map(row => row[columnIndex] || '')
      .filter(val => val.trim().length > 0);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div className="grid grid-cols-[200px_1fr_150px_120px_100px] gap-4 text-xs font-medium text-gray-600">
          <div>CSV-Spalte</div>
          <div>Zuordnung</div>
          <div>Beispielwerte</div>
          <div>Vertrauen</div>
          <div>Aktion</div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {headersRaw.map((rawHeader, index) => {
          const fixedHeader = headersFixed[index];
          const columnMapping = mapping[index.toString()];
          const sampleValues = getSampleValues(index);
          const hasRepairs = rawHeader !== fixedHeader;

          return (
            <div key={index} className="px-4 py-3 hover:bg-gray-50">
              <div className="grid grid-cols-[200px_1fr_150px_120px_100px] gap-4 items-center">
                {/* CSV Column */}
                <div className="space-y-1">
                  <div className="font-medium text-sm truncate" title={fixedHeader}>
                    {fixedHeader}
                  </div>
                  {hasRepairs && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Repariert</span>
                    </div>
                  )}
                  {hasRepairs && (
                    <div className="text-xs text-gray-500 font-mono">
                      {rawHeader}
                    </div>
                  )}
                </div>

                {/* Field Mapping */}
                <div className="flex items-center gap-2">
                  <ColumnSelect
                    value={columnMapping?.field}
                    customFields={customFields}
                    onChange={(field) => {
                      if (field) {
                        handleColumnMapping(index.toString(), {
                          field,
                          confidence: columnMapping?.confidence || 0.5,
                          reasons: ['manual_selection'],
                          hints: {}
                        });
                      } else {
                        handleColumnMapping(index.toString(), null);
                      }
                    }}
                  />
                  {columnMapping && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                {/* Sample Values */}
                <div className="space-y-1">
                  {sampleValues.slice(0, 2).map((value, i) => (
                    <div key={i} className="text-xs text-gray-600 truncate" title={value}>
                      {value}
                    </div>
                  ))}
                  {sampleValues.length > 2 && (
                    <div className="text-xs text-gray-400">
                      +{sampleValues.length - 2} weitere
                    </div>
                  )}
                </div>

                {/* Confidence */}
                <div>
                  {columnMapping && getConfidenceBadge(columnMapping.confidence)}
                </div>

                {/* Actions */}
                <div>
                  {columnMapping && (
                    <button
                      onClick={() => handleColumnMapping(index.toString(), null)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Zuordnung entfernen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mapping details */}
              {columnMapping && columnMapping.reasons.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Grund: {columnMapping.reasons.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {headersRaw.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          Keine Spalten zum Zuordnen
        </div>
      )}
    </div>
  );
}