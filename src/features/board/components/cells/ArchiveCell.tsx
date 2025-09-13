import React from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';

export default function ArchiveCell({ id: _id, isArchived, onArchive, onUnarchive }: {
  id: string;
  isArchived: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
}) {
  return (
    <div className="flex items-center">
      {isArchived ? (
        <button className="p-1 rounded border hover:bg-gray-50" title="Entarchivieren" onClick={onUnarchive}>
          <ArchiveRestore size={16} />
        </button>
      ) : (
        <button className="p-1 rounded border hover:bg-gray-50" title="Archivieren" onClick={onArchive}>
          <Archive size={16} />
        </button>
      )}
    </div>
  );
}