import React from 'react';
import { Pin } from 'lucide-react';

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
      className={`p-1 rounded hover:bg-gray-50 ${pinned ? 'text-blue-600' : 'text-gray-400'}`}
      onClick={handleClick}
      title={pinned ? 'Gepinnt' : 'Anpinnen'}
      aria-pressed={pinned}
    >
      <Pin size={14} />
    </button>
  );
}