/**
 * Data preview pane for Importer V2
 * Real-time preview of mapped and transformed data
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Eye, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// TODO: Implement data preview functionality
// - Real-time mapping preview
// - Validation issue highlighting
// - Data quality indicators
// - Sample data display
// - Export preview

interface PreviewPaneProps {
  mappedData: any[];
  validationResults: any[];
  maxRows?: number;
  showIssuesOnly?: boolean;
}

export function PreviewPane({
  mappedData,
  validationResults,
  maxRows = 50,
  showIssuesOnly = false
}: PreviewPaneProps) {
  // TODO: Implement preview pane logic
  // - Filter data based on showIssuesOnly
  // - Highlight validation issues
  // - Show data quality metrics
  // - Provide drill-down capabilities
  // - Support export of preview data

  const displayData = mappedData.slice(0, maxRows);
  const issueCount = validationResults.filter(r => !r.valid).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Daten-Vorschau
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="default" size="sm">
                  {displayData.length} von {mappedData.length} Zeilen
                </Badge>
                {issueCount > 0 && (
                  <Badge variant="error" size="sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {issueCount} Probleme
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showIssuesOnly}
                    onChange={() => {}}
                    className="rounded border-gray-300"
                  />
                  Nur Probleme zeigen
                </label>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b">
                <div className="text-sm font-medium">
                  TODO: Interaktive Daten-Tabelle mit Validierungs-Highlighting
                </div>
              </div>
              
              <div className="max-h-96 overflow-auto">
                {displayData.length > 0 ? (
                  <div className="divide-y">
                    {displayData.map((row, index) => (
                      <div key={index} className="px-3 py-2 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-8">
                            {index + 1}
                          </span>
                          <div className="flex-1 text-sm">
                            {Object.entries(row).slice(0, 3).map(([key, value]) => (
                              <span key={key} className="mr-4">
                                <span className="font-medium">{key}:</span>{' '}
                                <span>{String(value || '—')}</span>
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            {validationResults[index]?.valid ? (
                              <CheckCircle className="w-4 h-4 text-success-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-error-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-8 text-center text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">Keine Daten für Vorschau verfügbar</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              💡 TODO: Echtzeit-Vorschau mit Validierung, Highlighting und Export-Optionen
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}