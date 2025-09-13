import React from 'react';

export default function NoteTextCell({ text }: { text?: string }) {
  return (
    <div className="text-sm text-gray-700 truncate max-w-full" title={text || ''}>
      {text || '—'}
    </div>
  );
}
