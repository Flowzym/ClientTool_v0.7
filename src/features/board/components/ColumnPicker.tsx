import React, { useMemo, useState } from 'react';
import { X, RotateCcw, Eye, EyeOff } from 'lucide-react';
import type { ColumnDef, ColumnKey } from '../columns/types';

interface ColumnPickerProps {
  columns: ColumnDef[];
  visibleKeys: Set<ColumnKey>;
  onToggle: (key: ColumnKey) => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ColumnPicker({ 
  columns, 
  visibleKeys, 
  onToggle, 
  onReset, 
  isOpen, 
  onClose 
}: ColumnPickerProps) {
  const [filter, setFilter] = useState('');

  const groupedColumns = useMemo(() => {
    const filtered = columns.filter(col => 
      !filter || col.label.toLowerCase().includes(filter.toLowerCase())
    );
    
    const groups: Record<string, ColumnDef[]> = {};
    
    filtered.forEach(col => {
      const category = col.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(col);
    });
    
    // Sortiere Spalten innerhalb jeder Kategorie
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => a.label.localeCompare(b.label, 'de'));
    });
    
    return groups;
  }, [columns, filter]);

  const categoryLabels: Record<string, string> = {
    core: 'Kern-Spalten',
    contact: 'Kontakt-Daten',
    ams: 'AMS-Daten',
    computed: 'Zusammengesetzte Felder',
    internal: 'Interne Felder'
  };

  const visibleCount = visibleKeys.size;
  const totalCount = columns.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Spalten anzeigen
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Filter und Statistik */}
          <div className="flex items-center justify-between">
            <input
              type="text"
              placeholder="Spalten filtern..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 mr-4"
            />
            <div className="text-sm text-gray-600">
              {visibleCount} von {totalCount} sichtbar
            </div>
          </div>
          
          {/* Spalten-Gruppen */}
          <div className="max-h-96 overflow-y-auto space-y-4">
            {Object.entries(groupedColumns).map(([category, cols]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">
                    {categoryLabels[category] || category}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const allVisible = cols.every(col => visibleKeys.has(col.key));
                        cols.forEach(col => {
                          if (allVisible && visibleKeys.has(col.key)) {
                            // Nur entfernen wenn mindestens eine andere Spalte sichtbar bleibt
                            const remaining = new Set(visibleKeys);
                            remaining.delete(col.key);
                            if (remaining.size > 0) {
                              onToggle(col.key);
                            }
                          } else if (!allVisible && !visibleKeys.has(col.key)) {
                            onToggle(col.key);
                          }
                        });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {cols.every(col => visibleKeys.has(col.key)) ? (
                        <><EyeOff className="w-3 h-3 inline mr-1" />Alle ausblenden</>
                      ) : (
                        <><Eye className="w-3 h-3 inline mr-1" />Alle anzeigen</>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {cols.map(col => (
                    <label 
                      key={col.key} 
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={visibleKeys.has(col.key)}
                        onChange={() => onToggle(col.key)}
                        className="rounded border-gray-300"
                      />
                      <span className={col.visibleDefault ? 'font-medium' : ''}>
                        {col.label}
                      </span>
                      {col.computed && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                          berechnet
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <RotateCcw className="w-4 h-4" />
            Standard wiederherstellen
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}