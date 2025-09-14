import React from 'react';

export default function PinCell({ 
  pinned, 
  onToggle 
}: { 
  pinned?: boolean; 
  onToggle?: (event?: React.MouseEvent) => void; 
}) {
  const handleClick = (event: React.MouseEvent) => {
    onToggle?.(event);
  };

  return (
    <button
      className={`px-2 py-1 text-xs border rounded ${pinned ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-300'}`}
      onClick={handleClick}
      title={pinned ? 'Gepinnt' : 'Anpinnen'}
      aria-pressed={pinned}
    >
      {pinned ? '📌' : '📍'}
    </button>
  );
}