import React from 'react';
import { useBoardData } from './useBoardData';

// Wrapper-Komponente: stellt sowohl default- als auch named-Export bereit.
export function Board() {
  const { clients, isLoading } = useBoardData();
  return (
    <div className="p-4">
      {isLoading ? 'Lade Board…' : `Board geladen — ${clients.length} Einträge`}
    </div>
  );
}
export default Board;
