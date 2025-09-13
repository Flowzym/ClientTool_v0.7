import React from 'react';
import { PencilLine } from 'lucide-react';

function countNotes(client: any): number {
  // 1) notes array
  if (Array.isArray(client?.notes)) return client.notes.length;
  // 2) contactLog entries with type/kind === 'note'
  if (Array.isArray(client?.contactLog)) {
    const n = client.contactLog.filter((e:any) => (e?.type === 'note' || e?.kind === 'note')).length;
    if (n > 0) return n;
  }
  // 3) fallback: note text
  if (client?.note && String(client.note).trim().length > 0) return 1;
  return 0;
}

export default function NameCell({ client, onOpenNotes: _onOpenNotes }: { client: any; onOpenNotes: (id: string) => void; }) {
  const name = [client?.lastName, client?.firstName].filter(Boolean).join(', ');
  const title = client?.title ? ` (${client.title})` : '';
  const count = countNotes(client);
  const muted = count === 0;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          className={`p-1 rounded hover:bg-gray-50 ${muted ? 'text-gray-400' : 'text-gray-700'}`}
          title="Notizen öffnen"
          onClick={() => _onOpenNotes(client?.id)}
        >
          <PencilLine size={16} />
        </button>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 text-[10px] leading-[16px] text-gray-800 bg-white border border-gray-300 rounded-full text-center">
            {count}
          </span>
        )}
      </div>
      <div className="truncate">{name}{title}</div>
    </div>
  );
}