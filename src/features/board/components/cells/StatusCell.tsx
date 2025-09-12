import React from 'react';

export default function StatusCell({ id, value }: { id: string; value?: string }) {
  const color = value === 'inBearbeitung' || value === 'terminVereinbart' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${color}`} title={value || '—'}>
      {value || '—'}
    </div>
  );
}
