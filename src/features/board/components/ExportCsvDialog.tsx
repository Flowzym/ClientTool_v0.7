import React, { useEffect, useMemo, useState } from 'react';
import { toCsv } from '../utils/csv';

type Props = {
  open: boolean;
  onClose: () => void;
  rows: any[];
};

const DEFAULT_FIELDS = [
  'id','firstName','lastName','title','email','phone','status','result','angebot','followUp',
  'assignedTo','amsBookingDate','priority','lastActivity','note','isPinned','isArchived'
];

const STORAGE_KEY = 'board.csv.fields';

export function ExportCsvDialog({ open, onClose, rows }: Props) {
  const [fields, setFields] = useState<string[]>([]);
  const [filename, setFilename] = useState('export.csv');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setFields(saved ? JSON.parse(saved) : DEFAULT_FIELDS);
  }, [open]);

  const toggle = (f: string) => {
    setFields(prev => prev.includes(f) ? prev.filter(x=>x!==f) : [...prev, f]);
  };

  const allFields = useMemo(() => {
    const s = new Set<string>();
    rows.slice(0,50).forEach(r => Object.keys(r||{}).forEach(k=>s.add(k)));
    DEFAULT_FIELDS.forEach(f=>s.add(f));
    return Array.from(s);
  }, [rows]);

  const onExport = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    const csv = toCsv(rows, fields);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[680px] max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b font-medium">CSV-Export</div>
        <div className="p-4 overflow-auto">
          <div className="mb-2 text-sm text-gray-600">Felder auswählen:</div>
          <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-auto border rounded p-2">
            {allFields.map(f => (
              <label key={f} className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={fields.includes(f)} onChange={()=>toggle(f)} />
                <span>{f}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Dateiname</span>
            <input className="border rounded px-2 py-1 flex-1" value={filename} onChange={(e)=>setFilename(e.target.value)} />
          </div>
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button className="px-3 py-1.5 text-sm border rounded" onClick={onClose}>Abbrechen</button>
          <button className="px-3 py-1.5 text-sm border rounded bg-blue-600 text-white" onClick={onExport}>Exportieren</button>
        </div>
      </div>
    </div>
  );
}
