import React from 'react';

function chipClass(value?: string) {
  const v = (value || '').toLowerCase();
  const blue = 'bg-blue-100 text-blue-800 border border-blue-200';
  if (['inbearbeitung','terminvereinbart','gebucht'].includes(v)) return blue;
  // default neutral
  return 'bg-gray-100 text-gray-800 border border-gray-200';
}

export default function StatusCell({ value }: { value?: string; }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-0.5 rounded text-xs ${chipClass(value)}`}>{value || '—'}</span>
    </div>
  );
}