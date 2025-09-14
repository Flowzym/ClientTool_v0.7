import React, { useState } from 'react';
import type { Patch } from '../../../types/patch';
import { ExportCsvDialog } from './ExportCsvDialog';

type Props = {
  selectedCount: number;
  users: any[];
  onClear: () => void;
  onSetStatus: (status?: string) => void;
  onSetResult: (result?: string) => void;
  onSetAssign: (userId?: string) => void;
  onSetFollowup: (date?: string) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  selectedRowsProvider?: () => any[];
};

export default function BatchActionsBar({
  selectedCount, users, onClear, onSetStatus, onSetResult, onSetAssign, onSetFollowup, onArchive, onUnarchive, onPin, onUnpin, selectedRowsProvider
}: Props) {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [assign, setAssign] = useState<string>('');
  const [followup, setFollowup] = useState<string>('');
  const [openCsv, setOpenCsv] = useState(false);

  return (
    <div className="mb-3 p-2 border rounded bg-white shadow-sm flex items-center gap-2 text-sm">
      <div className="font-medium">{selectedCount} ausgewählt</div>

      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">Status</label>
        <select className="border rounded px-2 py-1" value={status} onChange={(e)=>setStatus(e.target.value)}>
          <option value="">—</option>
          {['offen','inBearbeitung','terminVereinbart','wartetRueckmeldung','dokumenteOffen','foerderAbklaerung','zugewiesenExtern','ruht','erledigt','nichtErreichbar','abgebrochen'].map(s=>(
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={()=>onSetStatus(status || undefined)}>Setzen</button>
      </div>

      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">Ergebnis</label>
        <select className="border rounded px-2 py-1" value={result} onChange={(e)=>setResult(e.target.value)}>
          {['','gebucht','abgesagt','abgeschlossen','bearbeitung'].map(r=>(
            <option key={r || 'empty'} value={r}>{r || '—'}</option>
          ))}
        </select>
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={()=>onSetResult(result || undefined)}>Setzen</button>
      </div>

      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">Zuständigkeit</label>
        <select className="border rounded px-2 py-1" value={assign} onChange={(e)=>setAssign(e.target.value)}>
          <option value="">—</option>
          {users.map((u:any)=>(<option key={(u as any).id} value={(u as any).id}>{(u as any).name ?? (u as any).id}</option>))}
        </select>
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={()=>onSetAssign(assign || undefined)}>Setzen</button>
      </div>

      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">Follow-up</label>
        <input className="border rounded px-2 py-1" type="date" value={followup} onChange={(e)=>setFollowup(e.target.value)} />
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={()=>onSetFollowup(followup || undefined)}>Setzen</button>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={onArchive}>Archivieren</button>
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={onUnarchive}>Entarchivieren</button>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={onPin}>Pinnen</button>
        <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={onUnpin}>Entpinnen</button>
      </div>

      <div className="flex-1" />

      <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={()=>setOpenCsv(true)}>CSV exportieren…</button>
      <button className="px-2 py-1 border rounded hover:bg-gray-50" onClick={onClear}>Auswahl aufheben</button>

      <ExportCsvDialog open={openCsv} onClose={()=>setOpenCsv(false)} rows={selectedRowsProvider ? selectedRowsProvider() : []} />
    </div>
  );
}
