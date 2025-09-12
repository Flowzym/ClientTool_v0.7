import React from 'react';

const ORDER = ['niedrig','normal','hoch','dringend'] as const;

export default function PriorityCell({ id, value, onCycle }: { id: string; value?: string; onCycle?: ()=>void }) {
  const color = value === 'dringend' ? 'bg-red-500' : value === 'hoch' ? 'bg-orange-500' : value === 'normal' ? 'bg-yellow-500' : 'bg-gray-300';
  return (
    <button className="inline-flex items-center gap-2 text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={onCycle} title="Priorität wechseln">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
      <span>{value || '—'}</span>
    </button>
  );
}
