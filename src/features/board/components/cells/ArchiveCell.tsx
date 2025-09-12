import React from 'react';

export default function ArchiveCell({ id, isArchived, onArchive, onUnarchive }: { id: string; isArchived: boolean; onArchive?: ()=>void; onUnarchive?: ()=>void }) {
  return isArchived ? (
    <button className="px-2 py-1 text-xs border rounded hover:bg-gray-50" onClick={onUnarchive} title="Entarchivieren">
      Entarchivieren
    </button>
  ) : (
    <button className="px-2 py-1 text-xs border rounded hover:bg-gray-50" onClick={onArchive} title="Archivieren">
      Archivieren
    </button>
  );
}
