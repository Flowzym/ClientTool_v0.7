import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBoardData } from './useBoardData';
import { useBoardActions } from './hooks/useBoardActions';
import { useOptimisticOverlay } from './hooks/useOptimisticOverlay';
import { ClientRow } from './components/ClientRow';
import { BatchActionsBar } from './components/BatchActionsBar';
import { BoardHeader } from './components/BoardHeader';

const ROW_HEIGHT = 44;

function Board() {
  const { clients, users, isLoading } = useBoardData();
  const actions = useBoardActions();

  const visibleClients = useOptimisticOverlay(clients);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastIndexRef = useRef<number | null>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = useMemo(() => visibleClients.map((c:any) => c.id as string), [visibleClients]);

  const clearSelection = () => setSelectedIds([]);
  const selectAllVisible = () => setSelectedIds(allIds);

  const toggleAtIndex = (index: number, id: string, withShift: boolean) => {
    if (!withShift || lastIndexRef.current == null) {
      setSelectedIds(prev => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id); else s.add(id);
        return Array.from(s);
      });
      lastIndexRef.current = index;
      return;
    }
    const start = Math.min(lastIndexRef.current, index);
    const end = Math.max(lastIndexRef.current, index);
    const idsInRange = allIds.slice(start, end + 1);
    setSelectedIds(prev => Array.from(new Set([...prev, ...idsInRange])));
    lastIndexRef.current = index;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); actions.undo?.(); return; }
      if (meta && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); actions.redo?.(); return; }
      if (e.key === 'Escape') { e.preventDefault(); clearSelection(); return; }
      if (!meta && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); selectAllVisible(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, allIds]);

  // Simple virtualization
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop((e.target as HTMLDivElement).scrollTop);
  const viewportHeight = 520;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + 10;
  const endIndex = Math.min(visibleClients.length, startIndex + visibleCount);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(0, (visibleClients.length - endIndex) * ROW_HEIGHT);

  const selectedRowsProvider = () => visibleClients.filter((c:any) => selectedSet.has(c.id));

  if (isLoading) return <div className="p-4 text-sm text-gray-600">Lade Board…</div>;

  return (
    <div className="p-4 overflow-auto">
      <BoardHeader
        selectedCount={selectedIds.length}
        getSelectedRows={selectedRowsProvider}
        onPinSelected={() => actions.bulkPin?.(selectedIds)}
        onUnpinSelected={() => actions.bulkUnpin?.(selectedIds)}
      />

      {selectedIds.length > 0 && (
        <BatchActionsBar
          selectedCount={selectedIds.length}
          users={users}
          onClear={clearSelection}
          onSetStatus={(status) => actions.bulkUpdate(selectedIds, { status })}
          onSetResult={(result) => actions.bulkUpdate(selectedIds, { result })}
          onSetAssign={(userId) => actions.bulkUpdate(selectedIds, { assignedTo: userId ?? null })}
          onSetFollowup={(date) => actions.bulkUpdate(selectedIds, { followUp: date ?? null, status: date ? 'terminVereinbart' : 'offen' })}
          onArchive={() => actions.bulkUpdate(selectedIds, { isArchived: true, archivedAt: new Date().toISOString() })}
          onUnarchive={() => actions.bulkUpdate(selectedIds, { isArchived: false, archivedAt: null })}
          onPin={() => actions.bulkPin?.(selectedIds)}
          onUnpin={() => actions.bulkUnpin?.(selectedIds)}
          selectedRowsProvider={selectedRowsProvider}
        />
      )}

      <div className="min-w-[1480px] border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[64px_minmax(240px,1fr)_120px_140px_140px_160px_160px_160px_240px_120px_100px_120px_120px] gap-2 bg-gray-50 border-b px-3 py-2 text-xs font-medium text-gray-600">
          <div>✓ • Pin</div>
          <div>Kunde</div>
          <div>Offer</div>
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
        </div>

        <div ref={containerRef} onScroll={onScroll} style={{ maxHeight: viewportHeight, overflowY: 'auto' }}>
          <div style={{ height: topPad }} />
          <div className="divide-y">
            {visibleClients.slice(startIndex, endIndex).map((c:any, idx:number) => {
              const realIndex = startIndex + idx;
              return (
                <ClientRow
                  key={c.id}
                  client={c}
                  index={realIndex}
                  users={users}
                  actions={actions}
                  selected={selectedSet.has(c.id)}
                  onToggleSelect={(withShift: boolean) => toggleAtIndex(realIndex, c.id, withShift)}
                />
              );
            })}
            {visibleClients.length === 0 && (
              <div className="px-3 py-6 text-sm text-gray-500 hover:bg-gray-50">Keine Einträge für die aktuelle Ansicht.</div>
            )}
          </div>
          <div style={{ height: bottomPad }} />
        </div>
      </div>
    </div>
  );
}

export default Board;
