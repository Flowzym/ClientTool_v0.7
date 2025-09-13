/**
 * Preview-Grid für Import-Daten
 */
import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { ImportMappedRow } from './types';

interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

interface PreviewGridProps {
  data: ImportMappedRow[];
  validationResults?: ValidationResult[];
  maxRows?: number;
}

export function PreviewGrid({ data, validationResults, maxRows = 50 }: PreviewGridProps) {
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  
  const displayData = useMemo(() => {
    const limited = data.slice(0, maxRows);
    
    if (showErrorsOnly && validationResults) {
      return limited.filter((_, index) => !validationResults[index]?.ok);
    }
    
    return limited;
  }, [data, maxRows, showErrorsOnly, validationResults]);

  const columns = useMemo(() => {
    if (!data.length) return [];
    
    const columnHelper = createColumnHelper<any>();
    const columnHelper = createColumnHelper<ImportMappedRow>();
    const cols: ColumnDef<ImportMappedRow, unknown>[] = [];
    
    // Status-Spalte
    if (validationResults) {
      cols.push(
        columnHelper.display({
          id: 'status',
          header: 'Status',
          size: 80,
          cell: ({ row }) => {
            const result = validationResults[row.index];
            if (!result) return null;
            
            return (
              <div className="flex items-center gap-1">
                {result.ok ? (
                  <CheckCircle className="w-4 h-4 text-success-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-error-500" />
                )}
                {result.warnings.length > 0 && (
                  <Badge variant="warning" size="sm">
                    {result.warnings.length}
                  </Badge>
                )}
              </div>
            );
          }
        })
      );
    }
    
    // Daten-Spalten
    Object.keys(sampleRow).forEach(key => {
      cols.push(
        columnHelper.accessor(key as keyof ImportMappedRow, {
          header: key,
          size: 120,
          cell: ({ getValue }) => {
            const value = getValue();
            return (
              <div className="truncate text-sm" title={String(value || '')}>
                {String(value || '')}
              </div>
            );
          }
        })
      );
    });
    
    return cols;
  }, [data, validationResults]);

  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  if (!data.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        Keine Daten zum Anzeigen
      </div>
    );
  }

  const errorCount = validationResults?.filter(r => !r.ok).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Zeige {displayData.length} von {data.length} Zeilen
          {validationResults && (
            <span className="ml-2">
              ({errorCount} Fehler)
            </span>
          )}
        </div>
        
        {validationResults && errorCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowErrorsOnly(!showErrorsOnly)}
          >
            {showErrorsOnly ? 'Alle zeigen' : 'Nur Fehler zeigen'}
          </Button>
        )}
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left font-medium text-gray-700"
                      style={{ width: header.getSize() }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}