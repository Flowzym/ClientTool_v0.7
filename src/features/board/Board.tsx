import React from 'react';
import { useBoardData } from './useBoardData';
import { useBoardActions } from './hooks/useBoardActions';
import { ClientRow } from './components/ClientRow';

function Board() {
  const { clients, users, isLoading } = useBoardData();
  const actions = useBoardActions();

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-600">Lade Board…</div>;
  }

  return (
    <div className="p-4 overflow-auto">
      <div className="text-sm text-gray-600 mb-3">Board geladen — {clients.length} Einträge</div>

      <div className="min-w-[1400px] border rounded-lg overflow-hidden">
        {/* Kopfzeile */}
        <div className="grid grid-cols-[minmax(240px,1fr)_120px_140px_140px_160px_160px_160px_240px_120px_100px_120px_120px_64px] gap-2 bg-gray-50 border-b px-3 py-2 text-xs font-medium text-gray-600">
          <div>Kunde</div>
          <div>Offer</div>
          <div>Status</div>
          <div>Ergebnis</div>
          <div>Follow-up</div>
          <div>Zuständigkeit</div>
          <div>Kontakt</div>
          <div>Anmerkung</div>
          <div>Zubuchung</div>
          <div>Priorität</div>
          <div>Aktivität</div>
          <div>Aktionen</div>
          <div>Pin</div>
        </div>

        {/* Zeilen */}
        <div className="divide-y">
          {clients.map((c) => (
            <ClientRow key={c.id} client={c} users={users} actions={actions} />
          ))}
          {clients.length === 0 && (
            <div className="px-3 py-6 text-sm text-gray-500">Keine Einträge für die aktuelle Ansicht.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export { Board };
export default Board;
