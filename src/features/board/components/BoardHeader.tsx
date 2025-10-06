import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, RefreshCw, ArrowUpDown, Search, X } from 'lucide-react';
import { Button } from '../../../components/Button';
import ColumnPicker from './ColumnPicker';
import { getAllColumns, getDefaultVisibleColumns } from '../columns/registry';
import { ExportCsvDialog } from './index';

function BoardHeader({
  selectedCount,
  getSelectedRows,
  onPinSelected,
  onUnpinSelected,
  onRefresh,
  allColumns,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
  hasSorting,
  onResetSort,
  onMoveColumnUp,
  onMoveColumnDown,
  onResetColumnOrder,
  searchQuery,
  onSearchChange
}: {
  selectedCount: number;
  getSelectedRows: () => any[];
  onPinSelected: () => void;
  onUnpinSelected: () => void;
  onRefresh?: () => void;
  allColumns: any[];
  visibleColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
  hasSorting?: boolean;
  onResetSort?: () => void;
  onMoveColumnUp?: (key: string) => void;
  onMoveColumnDown?: (key: string) => void;
  onResetColumnOrder?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}) {
  const [openCsv, setOpenCsv] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);

    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      onSearchChange?.(value);
    }, 150);
  }, [onSearchChange]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mb-3 space-y-3">
      {/* Search bar */}
      {onSearchChange && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Suchen nach Name, Email, Telefon, AMS-ID, Notizen..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {localSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Board</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowColumnPicker(true)}
          title="Spalten ein-/ausblenden"
        >
          <Settings className="w-4 h-4 mr-2" />
          Spalten
        </Button>
        {hasSorting && onResetSort && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetSort}
            title="Sortierung zurücksetzen"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Sortierung zurücksetzen
          </Button>
        )}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            title="Board aktualisieren"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={() => setOpenCsv(true)}>
          CSV Export
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <button
          className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          onClick={onPinSelected}
          disabled={selectedCount === 0}
          title="Ausgewählte pinnen"
        >
          Pinnen
        </button>
        <button
          className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          onClick={onUnpinSelected}
          disabled={selectedCount === 0}
          title="Ausgewählte entpinnen"
        >
          Entpinnen
        </button>
      </div>
      </div>

      <ExportCsvDialog open={openCsv} onClose={() => setOpenCsv(false)} rows={getSelectedRows()} />
      
      <ColumnPicker
        columns={allColumns}
        visibleKeys={visibleColumns}
        onToggle={onToggleColumn}
        onReset={onResetColumns}
        isOpen={showColumnPicker}
        onClose={() => setShowColumnPicker(false)}
        onMoveUp={onMoveColumnUp}
        onMoveDown={onMoveColumnDown}
        onResetOrder={onResetColumnOrder}
      />
    </div>
  );
}

export default BoardHeader;
