import React from 'react';

export default function ResultCell({ id, value, onChange }: { id: string; value?: string; onChange?: (v?: string)=>void }) {
  const opts = ['','gebucht','abgesagt','abgeschlossen','bearbeitung'] as const;
  const isBlue = value?.toLowerCase?.() === 'gebucht' || value?.toLowerCase?.() === 'bearbeitung';
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${isBlue ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
        {value || '—'}
      </span>
      <select
        className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
        value={value ?? ''}
        onChange={(e)=>onChange?.(e.target.value || undefined)}
      >
        {opts.map(o=>(<option key={o} value={o}>{o || '—'}</option>))}
      </select>
    </div>
  );
}
