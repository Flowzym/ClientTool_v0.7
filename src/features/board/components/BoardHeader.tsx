import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '../../../components/Button';
import ColumnPicker from './ColumnPicker';
import { getAllColumns } from '../columns/registry';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { ExportCsvDialog } from './index';

function BoardHeader({
  selectedCount,
  getSelectedRows,
  onPinSelected,
  onUnpinSelected,
}: {
  selectedCount: number;
  getSelectedRows: () => any[];
  onPinSelected: () => void;
  onUnpinSelected: () => void;
}) {
  const [openCsv, setOpenCsv] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  
  const allColumns = getAllColumns();
  const { visible, toggle, reset } = useColumnVisibility(allColumns, 'board-main');

  return (
    <div className="mb-3 flex items-center justify-between">
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

      <ExportCsvDialog open={openCsv} onClose={() => setOpenCsv(false)} rows={getSelectedRows()} />
      
      <ColumnPicker
        columns={allColumns}
        visibleKeys={visible}
        onToggle={toggle}
        onReset={reset}
        isOpen={showColumnPicker}
        onClose={() => setShowColumnPicker(false)}
      />
    </div>
  );
}

export default BoardHeader;
