import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBoardData } from './useBoardData';
import { useBoardActions } from './hooks/useBoardActions';
import { useOptimisticOverlay } from './hooks/useOptimisticOverlay';
import { ClientRow } from './components/ClientRow';
import { BatchActionsBar } from './components/BatchActionsBar';
import { BoardHeader } from './components/BoardHeader';
import { featureManager } from '../../config/features';

// Extracted components for stable hook order
function ClassicClientList({ 
  clients, 
  users, 
  actions, 
  selectedSet, 
  onToggleSelect 
}: {
  clients: any[];
  users: any[];
  actions: any;
  selectedSet: Set<string>;
  onToggleSelect: (index: number, id: string, withShift: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  };
  
  const ROW_HEIGHT = 44;
  const viewportHeight = 520;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + 10;
  const endIndex = Math.min(clients.length, startIndex + visibleCount);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(0, (clients.length - endIndex) * ROW_HEIGHT);

  return (
    <div className="min-w-[1480px] border rounded-lg overflow-hidden">
      <div ref={containerRef} onScroll={onScroll} style={{ maxHeight: viewportHeight, overflowY: 'auto' }}>
        <div style={{ height: topPad }} />
        <div className="divide-y">
          {clients.slice(startIndex, endIndex).map((c: any, idx: number) => {
            const realIndex = startIndex + idx;
            return (
              <ClientRow
                key={c.id}
                client={c}
                index={realIndex}
                users={users}
                actions={actions}
                selected={selectedSet.has(c.id)}
                onToggleSelect={(withShift: boolean) => onToggleSelect(realIndex, c.id, withShift)}
              />
            );
          })}
          {clients.length === 0 && (
            <div className="px-3 py-6 text-sm text-gray-500 hover:bg-gray-50">
              Keine Einträge für die aktuelle Ansicht.
            </div>
          )}
        </div>
        <div style={{ height: bottomPad }} />
      </div>
    </div>
  );
}

function VirtualClientList({ 
  clients, 
  users, 
  actions, 
  selectedSet, 
  onToggleSelect 
}: {
  clients: any[];
  users: any[];
  actions: any;
  selectedSet: Set<string>;
  onToggleSelect: (index: number, id: string, withShift: boolean) => void;
}) {
  // Import VirtualizedBoardList dynamically to avoid circular deps
  const VirtualizedBoardList = React.lazy(() => import('./components/VirtualizedBoardList').then(m => ({ default: m.VirtualizedBoardList })));
  
  return (
    <React.Suspense fallback={<div className="min-w-[1480px] border rounded-lg overflow-hidden h-[520px] bg-gray-50 animate-pulse" />}>
      <VirtualizedBoardList
        clients={clients}
        users={users}
        actions={actions}
        selectedIds={selectedSet}
        onToggleSelect={onToggleSelect}
        rowHeight={44}
        className="min-w-[1480px] border rounded-lg overflow-hidden"
      />
    </React.Suspense>
  );
}

function Board() {
  // ALL HOOKS AT TOP LEVEL - NEVER CONDITIONAL
  const { clients, users, isLoading } = useBoardData();
  const actions = useBoardActions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [virtualRowsEnabled, setVirtualRowsEnabled] = useState(featureManager.isEnabled('virtualRows'));
  const lastIndexRef = useRef<number | null>(null);
  
  const visibleClients = useOptimisticOverlay(clients);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = useMemo(() => visibleClients.map((c:any) => c.id as string), [visibleClients]);

  // Subscribe to feature flag changes
  useEffect(() => {
    return featureManager.subscribe((features) => {
      setVirtualRowsEnabled(features.virtualRows);
    });
  }, []);

  // Event handlers - no hooks inside
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

  // Keyboard shortcuts
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

  // Derived values
  const selectedRowsProvider = () => visibleClients.filter((c:any) => selectedSet.has(c.id));

  // Early return AFTER all hooks
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

      {/* Sticky Header */}
      <div className="min-w-[1480px] border rounded-t-lg bg-gray-50 border-b px-3 py-2 text-xs font-medium text-gray-600">
        <div className="grid grid-cols-[64px_minmax(240px,1fr)_120px_140px_140px_160px_160px_160px_240px_120px_100px_120px_120px] gap-2">
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
      </div>

      {/* Client List (virtualized or classic) */}
      {virtualRowsEnabled ? (
        <VirtualClientList
          clients={visibleClients}
          users={users}
          actions={actions}
          selectedSet={selectedSet}
          onToggleSelect={toggleAtIndex}
        />
      ) : (
        <ClassicClientList
          clients={visibleClients}
          users={users}
          actions={actions}
          selectedSet={selectedSet}
          onToggleSelect={toggleAtIndex}
        />
      )}

      {/* Development feature toggle */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={virtualRowsEnabled}
              onChange={(e) => featureManager.setFeature('virtualRows', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Virtualized Rows (Performance)</span>
            <span className="text-xs text-gray-500">
              ({virtualRowsEnabled ? 'ON' : 'OFF'}) - {visibleClients.length} clients
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

export default Board;
