/**
 * Data preview pane component
 * Shows preview of imported data with validation highlights
 */

import React, { useState } from 'react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { 
  Eye, 
  EyeOff, 
  Download, 
  AlertCircle, 
  Info,
  X
} from 'lucide-react';

interface PreviewData {
  headers: string[];
  rows: string[][];
  mappings: Record<string, string>;
  validationIssues: Array<{
    row: number;
    column?: string;
    type: 'error' | 'warning' | 'info';
    message: string;
  }>;
}

interface PreviewPaneProps {
  data?: PreviewData;
  isLoading?: boolean;
  maxRows?: number;
  showValidation?: boolean;
  onRowClick?: (rowIndex: number) => void;
}

export function PreviewPane({
  data,
  isLoading = false,
  maxRows = 50,
  showValidation = true,
  onRowClick
}: PreviewPaneProps) {
  const [showValidationToggle, setShowValidationToggle] = useState(showValidation);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-8 text-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gray-300 rounded mx-auto mb-4"></div>
          <div className="text-gray-500">Lade Vorschau...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-500">
          <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-4 flex items-center justify-center">
            📄
          </div>
          <h3 className="font-medium mb-2">Keine Daten verfügbar</h3>
          <p className="text-sm">Laden Sie eine Datei hoch und konfigurieren Sie die Zuordnungen</p>
        </div>
      </div>
    );
  }

  const getRowIssues = (rowIndex: number) => {
    return data.validationIssues.filter(issue => issue.row === rowIndex + 1);
  };

  const getCellIssues = (rowIndex: number, columnIndex: number) => {
    const header = data.headers[columnIndex];
    return data.validationIssues.filter(issue => 
      issue.row === rowIndex + 1 && issue.column === header
    );
  };

  const getIssueIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'warning': return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'info': return <Info className="w-3 h-3 text-blue-500" />;
    }
  };

  const exportPreview = () => {
    // TODO: Implement preview export
    console.log('Export preview data');
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Preview header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h4 className="font-medium">Daten-Vorschau</h4>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span><strong>{data.rows.length}</strong> Zeilen</span>
              <span><strong>{data.headers.length}</strong> Spalten</span>
              <span><strong>{Object.keys(data.mappings).length}</strong> zugeordnet</span>
              {showValidationToggle && (
                <span><strong>{data.validationIssues.length}</strong> Probleme</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowValidationToggle(!showValidationToggle)}
            >
              {showValidationToggle ? (
                <><EyeOff className="w-4 h-4 mr-2" />Probleme ausblenden</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" />Probleme anzeigen</>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={exportPreview}
            >
              <Download className="w-4 h-4 mr-2" />
              Vorschau exportieren
            </Button>
          </div>
        </div>
      </div>

      {/* Preview table */}
      <div className="overflow-auto max-h-96">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700 w-12">#</th>
              {data.headers.map((header, index) => {
                const mapping = data.mappings[index.toString()];
                return (
                  <th key={index} className="px-3 py-2 text-left font-medium text-gray-700 min-w-32">
                    <div className="space-y-1">
                      <div className="truncate" title={header}>{header}</div>
                      {mapping && (
                        <div className="text-xs text-accent-600 font-normal">
                          → {mapping}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, maxRows).map((row, rowIndex) => {
              const rowIssues = getRowIssues(rowIndex);
              const hasErrors = rowIssues.some(issue => issue.type === 'error');
              const hasWarnings = rowIssues.some(issue => issue.type === 'warning');
              const isSelected = selectedRow === rowIndex;
              
              return (
                <tr
                  key={rowIndex}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-yellow-50' : ''}`}
                  onClick={() => {
                    setSelectedRow(isSelected ? null : rowIndex);
                    onRowClick?.(rowIndex);
                  }}
                >
                  <td className="px-3 py-2 text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>{rowIndex + 1}</span>
                      {showValidationToggle && rowIssues.length > 0 && (
                        <div className="flex items-center gap-1">
                          {rowIssues.slice(0, 2).map((issue, i) => (
                            <div key={i} title={issue.message}>
                              {getIssueIcon(issue.type)}
                            </div>
                          ))}
                          {rowIssues.length > 2 && (
                            <Badge variant="warning" size="sm">
                              +{rowIssues.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {row.map((cell, cellIndex) => {
                    const cellIssues = getCellIssues(rowIndex, cellIndex);
                    const hasCellIssues = cellIssues.length > 0;
                    
                    return (
                      <td
                        key={cellIndex}
                        className={`px-3 py-2 ${hasCellIssues && showValidationToggle ? 'bg-red-100' : ''}`}
                        title={cellIssues.map(issue => issue.message).join('\n')}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-32">{cell || '—'}</span>
                          {hasCellIssues && showValidationToggle && (
                            <div className="flex-shrink-0">
                              {getIssueIcon(cellIssues[0].type)}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Row details */}
      {selectedRow !== null && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium">Zeile {selectedRow + 1} Details</h5>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {data.headers.map((header, index) => {
                const value = data.rows[selectedRow][index];
                const mapping = data.mappings[index.toString()];
                const cellIssues = getCellIssues(selectedRow, index);
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="font-medium">{header}</div>
                    {mapping && (
                      <div className="text-xs text-accent-600">→ {mapping}</div>
                    )}
                    <div className="text-gray-600">{value || '—'}</div>
                    {cellIssues.length > 0 && (
                      <div className="space-y-1">
                        {cellIssues.map((issue, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            {getIssueIcon(issue.type)}
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pagination for large datasets */}
      {data.rows.length > maxRows && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Zeige erste {maxRows} von {data.rows.length} Zeilen</span>
            <Button variant="ghost" size="sm">
              Alle laden
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}