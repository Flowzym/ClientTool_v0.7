import React from 'react';

export default function NoteTextCell({ id, text }: { id: string; text?: string }) {
  return (
    <div className="text-sm text-gray-700 truncate max-w-full" title={text || ''}>
      {text || '—'}
    </div>
  );
}
