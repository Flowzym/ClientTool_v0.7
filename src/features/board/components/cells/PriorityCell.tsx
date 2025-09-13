import React from 'react';

export default function PriorityCell({ value, onCycle }: {
  value?: string | null;
  onCycle: () => void;
}) {
  const dot = (active: boolean, color: string) => (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${active ? color : 'bg-gray-300'}`} />
  );

  const v = value ?? null;
  return (
    <button className="flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50" onClick={onCycle} title="Priorität wechseln">
      {dot(v === 'niedrig', 'bg-green-500')}
      {dot(v === 'mittel', 'bg-yellow-400')}
      {dot(v === 'hoch', 'bg-red-500')}
    </button>
  );
}
