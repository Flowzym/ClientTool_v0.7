import React, { useEffect, useMemo, useState } from 'react';
import { toCsv, CSV_LABELS, CSV_TRANSFORMS } from '../utils/csv';
import { createZip } from '../utils/zip';

type Props = { open: boolean; onClose: () => void; rows: any[]; };

const DEFAULT_FIELDS = [
  'id','firstName','lastName','title','email','phone','status','result','angebot','followUp',
  'assignedTo','amsBookingDate','priority','lastActivity','note','isPinned','isArchived'
];

const STORAGE_KEY = 'board.csv.preset.v2';

export function ExportCsvDialog({ open, onClose, rows }: Props) {
  const [fields, setFields] = useState<string[]>([]);
  const [filename, setFilename] = useState('export.csv');
  const [sep, setSep] = useState<',' | ';'>(',');
  const [withBOM, setWithBOM] = useState<boolean>(true);
  const [zipEach, setZipEach] = useState<boolean>(false);
  const [nameField, setNameField] = useState<string>('lastName');

  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        setFields(obj.fields ?? DEFAULT_FIELDS);
        setSep(obj.sep ?? ',');
        setWithBOM(!!obj.withBOM);
        setZipEach(!!obj.zipEach);
        setNameField(obj.nameField ?? 'lastName');
        setFilename(obj.filename ?? 'export.csv');
        return;
      } catch {}
    }
    setFields(DEFAULT_FIELDS);
  }, [open]);

  const allFields = useMemo(() => {
    const s = new Set<string>();
    rows.slice(0,50).forEach(r => Object.keys(r||{}).forEach(k=>s.add(k)));
    DEFAULT_FIELDS.forEach(f=>s.add(f));
    return Array.from(s);
  }, [rows]);

  const toggle = (f: string) => {
    setFields(prev => prev.includes(f) ? prev.filter(x=>x!==f) : [...prev, f]);
  };

  const savePreset = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fields, sep, withBOM, zipEach, nameField, filename }));
  };

  const startDownload = () => {
    savePreset();
    if (!zipEach) {
      const csv = toCsv(rows, fields, { labels: CSV_LABELS, transforms: CSV_TRANSFORMS, sep, withBOM });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || 'export.csv';
      document.body.appendChild(a); a.click(); a.remove();
      onClose(); return;
    }
    // ZIP: jede Row als eigene CSV
    const files = rows.map((r) => {
      const display = r[nameField] ?? r['id'];
      const safe = String(display || 'kunde').replace(/[^a-z0-9-_]+/gi, '_');
      const csv = toCsv([r], fields, { labels: CSV_LABELS, transforms: CSV_TRANSFORMS, sep, withBOM });
      return { name: `${safe}.csv`, data: csv };
    });
    const zipBlob = createZip(files);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = (filename && filename.toLowerCase().endsWith('.zip')) ? filename : 'export.zip';
    document.body.appendChild(a); a.click(); a.remove();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[760px] max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b font-medium">CSV-Export</div>
        <div className="p-4 overflow-auto">
          <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-auto border rounded p-2 mb-3">
            {allFields.map(f => (
              <label key={f} className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={fields.includes(f)} onChange={()=>toggle(f)} />
                <span><span className="font-medium">{CSV_LABELS[f] ?? f}</span> <span className="text-gray-400 text-xs">({f})</span></span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Dateiname</span>
              <input className="border rounded px-2 py-1 flex-1" value={filename} onChange={(e)=>setFilename(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Trenner</span>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" checked={sep === ','} onChange={()=>setSep(',')} /> Komma
              </label>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" checked={sep === ';'} onChange={()=>setSep(';')} /> Semikolon
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={withBOM} onChange={(e)=>setWithBOM(e.target.checked)} />
                Excel-Kompatibilität (BOM)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={zipEach} onChange={(e)=>setZipEach(e.target.checked)} />
                Einzel-CSV je Kunde (ZIP)
              </label>
              {zipEach && (
                <>
                  <span className="text-sm text-gray-600">Dateiname aus Feld</span>
                  <select className="border rounded px-2 py-1" value={nameField} onChange={(e)=>setNameField(e.target.value)}>
                    {allFields.map(f => <option key={f} value={f}>{CSV_LABELS[f] ?? f}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button className="px-3 py-1.5 text-sm border rounded" onClick={onClose}>Abbrechen</button>
          <button className="px-3 py-1.5 text-sm border rounded bg-blue-600 text-white" onClick={startDownload}>Exportieren</button>
        </div>
      </div>
    </div>
  );
}
