import React, { useState } from 'react';
import { ExportCsvDialog } from './ExportCsvDialog';

export function BoardHeader({
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

  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-base font-semibold flex-1">Board</h2>
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

      <ExportCsvDialog open={openCsv} onClose={() => setOpenCsv(false)} rows={getSelectedRows()} />
    </div>
  );
}
