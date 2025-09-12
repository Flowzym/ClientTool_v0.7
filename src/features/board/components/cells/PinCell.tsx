import React from 'react';

export default function PinCell({ id, pinned, onToggle }: { id: string; pinned?: boolean; onToggle?: () => void }) {
  return (
    <button
      className={`px-2 py-1 text-xs border rounded ${pinned ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-300'}`}
      onClick={onToggle}
      title={pinned ? 'Gepinnt' : 'Anpinnen'}
    >
      {pinned ? '📌' : '📍'}
    </button>
  );
}
