import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countNotes } from './utils/notes';
import { perfMark, perfMeasure } from '../../lib/perf/timer';
import { useRenderCount } from '../../lib/perf/useRenderCount';
import { useBoardData } from './useBoardData';
import { useBoardActions } from './hooks/useBoardActions';
import { useOptimisticOverlay } from './hooks/useOptimisticOverlay';
import ColumnHeader from './components/ColumnHeader';
import { ClientInfoDialog } from './components';
import { ClientRow } from './components/ClientRow';
import BatchActionsBar from './components/BatchActionsBar';
import { BoardHeader } from './components/BoardHeader';
import { featureManager } from '../../config/features';

// Extracted components for stable hook order
function ClassicClientList({ 
  clients, 
  users, 
  actions, 
  selectedSet, 
  onToggleSelect,
  onTogglePin
}: {
  clients: any[];
  users: any[];
  actions: any;
  selectedSet: Set<string>;
  onToggleSelect: (index: number, id: string, withShift: boolean) => void;
  onTogglePin: (index: number, id: string, event?: React.MouseEvent) => void;
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
                onTogglePin={(event?: React.MouseEvent) => onTogglePin(realIndex, c.id, event)}
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
  onToggleSelect,
  onTogglePin
}: {
  clients: any[];
  users: any[];
  actions: any;
  selectedSet: Set<string>;
  onToggleSelect: (index: number, id: string, withShift: boolean) => void;
  onTogglePin: (index: number, id: string, event?: React.MouseEvent) => void;
}) {
  // Import VirtualizedBoardList dynamically to avoid circular deps
  const VirtualizedBoardList = React.lazy(() => import('./components/VirtualizedBoardList'));
  
  return (
    <React.Suspense fallback={<div className="min-w-[1480px] border rounded-lg overflow-hidden h-[520px] bg-gray-50 animate-pulse" />}>
      <VirtualizedBoardList
        clients={clients}
        users={users}
        actions={actions}
        selectedIds={selectedSet}
        onToggleSelect={onToggleSelect}
        onTogglePin={onTogglePin}
        rowHeight={44}
        className="min-w-[1480px] border rounded-lg overflow-hidden"
      />
    </React.Suspense>
  );
}

function Board() {
  const renderCount = useRenderCount();
  const lastIndexRef = useRef<number | null>(null);
  const [lastPinAnchorIndex, setLastPinAnchorIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clientInfoDialogId, setClientInfoDialogId] = useState<string | null>(null);
  const [virtualRowsEnabled, setVirtualRowsEnabled] = useState(featureManager.isEnabled('virtualRows'));
  const [localSort, setLocalSort] = useState<{key:string|null; direction:'asc'|'desc'|null}>({ key:null, direction:null });

  // All hooks must be called before any early returns
  const { clients, users, isLoading, view } = useBoardData();
  const actions = useBoardActions();

  const clientsWithOverlay = useOptimisticOverlay(clients);
  const visibleClients = useMemo(() => clientsWithOverlay.filter((c: any) => !c.isArchived || view.showArchived), [clientsWithOverlay, view.showArchived]);
  const allIds = useMemo(() => visibleClients.map((c: any) => c.id), [visibleClients]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const sortState = (localSort && (localSort.key!==null || localSort.direction!==null))
    ? localSort
    : (view?.sort ?? { key:null, direction:null });

  // Sort helper functions
  const _formatName = (c:any) => {
    const last = c.lastName ?? ''; const first = c.firstName ?? '';
    const title = c.title ? ` (${c.title})` : '';
    const fallback = c.name ?? '';
    return (last || first) ? `${last}, ${first}${title}` : fallback;
  };
  const _getPinned = (c:any) => Boolean(c.isPinned ?? c.pinned ?? false);
  const _cmpStr = (a:any,b:any)=> String(a).localeCompare(String(b),'de',{sensitivity:'base'});
  const _cmpNum = (a:any,b:any)=> Number(a)-Number(b);
  const _cmpDate = (a?:string|null,b?:string|null)=>{
    if(!a && !b) return 0; if(!a) return 1; if(!b) return -1;
    return a<b?-1:a>b?1:0;
  };
  const _sortClients = (list:any[], sort:{key:string|null;direction:'asc'|'desc'|null})=>{
    const dir = sort?.direction==='desc' ? -1 : 1;
    const key = sort?.key;
    const arr = [...list];
    arr.sort((a,b)=>{
      const pa=_getPinned(a), pb=_getPinned(b);
      if(pa!==pb) return pa?-1:1;               // 1) pins first
      let d=0;                                   // 2) active column
      switch(key){
        case 'name': d=_cmpStr(_formatName(a), _formatName(b)); break;
        case 'offer': d=_cmpStr(a.angebot??'', b.angebot??''); break;
        case 'status': d=_cmpStr(a.status??'', b.status??''); break;
        case 'result': d=_cmpStr(a.result??'', b.result??''); break;
        case 'followUp': d=_cmpDate(a.followUp??null,b.followUp??null); break;
        case 'assignedTo': d=_cmpStr(a.assignedTo??'', b.assignedTo??''); break;
        case 'contacts': d=_cmpNum(a.contactCount??0, b.contactCount??0); break;
        case 'notes': d=_cmpNum((a.noteCount ?? a.notesCount ?? 0), (b.noteCount ?? b.notesCount ?? 0)); break;
        case 'priority': d=_cmpNum(a.priority??0, b.priority??0); break;
        case 'activity': d=_cmpDate(a.lastActivity??null,b.lastActivity??null); break;
        default: d=0;
      }
      if(d!==0) return dir*(d<0?-1:1);
      return String(a.id).localeCompare(String(b.id)); // 3) id tiebreaker
    });
    return arr;
  };
  const sortedClients = useMemo(()=>_sortClients(visibleClients, sortState),[visibleClients, sortState]);

  // Safe shim around setView
  const _cycle = (prev:{key:string|null;direction:'asc'|'desc'|null}|null, key:string)=>{
    if(!prev || prev.key!==key) return { key, direction:'asc' as const };
    if(prev.direction==='asc') return { key, direction:'desc' as const };
    return { key:null, direction:null };
  };
  const _setView = (update:any)=>{
    try {
      if (typeof setView === 'function') return setView(update);
    } catch {}
    // fallback: nur Sort in localSort aktualisieren
    try {
      const current = view?.sort ?? localSort;
      const next = (typeof update==='function') ? update({ ...view, sort: current }) : update;
      if (next?.sort) setLocalSort(next.sort);
    } catch {}
  };
  const handleHeaderToggle = useCallback((key:string)=>{
    _setView((prev:any)=>({ ...prev, sort: _cycle(prev?.sort ?? null, key) }));
  },[]);

  // Subscribe to feature flag changes
  useEffect(() => {
    perfMark('board:render:start');
    return featureManager.subscribe((features) => {
      setVirtualRowsEnabled(featureManager.isEnabled('virtualRows'));
    });
  }, []);

  // Performance measurement after render
  useEffect(() => {
    perfMark('board:render:end');
    perfMeasure('board:render', 'board:render:start', 'board:render:end');
  });

  // Listen for ClientInfoDialog open events
  useEffect(() => {
    const handleOpenClientInfo = (event: CustomEvent) => {
      setClientInfoDialogId(event.detail.id);
    };

    window.addEventListener('board:open-client-info', handleOpenClientInfo as EventListener);
    return () => window.removeEventListener('board:open-client-info', handleOpenClientInfo as EventListener);
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

  const togglePinAtIndex = (index: number, id: string, event?: React.MouseEvent) => {
    const withShift = event?.shiftKey || false;
    const currentClient = visibleClients.find((c: any) => c.id === id);
    const targetPinState = !currentClient?.isPinned;

    if (!withShift || lastPinAnchorIndex == null) {
      // Single pin toggle
      actions.update(id, { isPinned: targetPinState });
      setLastPinAnchorIndex(index);
      return;
    }

    // Shift-range pin toggle
    const start = Math.min(lastPinAnchorIndex, index);
    const end = Math.max(lastPinAnchorIndex, index);
    const idsInRange = allIds.slice(start, end + 1);
    
    // Apply target state to all in range
    const changes = { isPinned: targetPinState };
    actions.bulkUpdate(idsInRange, changes);
    
    setLastPinAnchorIndex(index);
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
  const selectedRowsProvider = () => visibleClients.filter((c: any) => selectedSet.has(c.id));

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
      <div className="min-w-[1480px] border rounded-t-lg bg-gray-50 border-b px-3 py-2">
        <div className="grid grid-cols-[64px_minmax(240px,1fr)_120px_140px_140px_160px_160px_160px_240px_120px_100px_120px_120px] gap-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.length === allIds.length && allIds.length > 0}
              aria-checked={
                selectedIds.length === 0 ? false :
                selectedIds.length === allIds.length ? true :
                'mixed'
              }
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedIds.length > 0 && selectedIds.length < allIds.length;
                }
              }}
              onChange={(e) => {
                if (e.target.checked) {
                  selectAllVisible();
                } else {
                  clearSelection();
                }
              }}
              aria-label="Alle auswählen"
              className="mr-2"
            />
            <span className="text-xs font-medium text-gray-600">Pin</span>
          </div>
          <ColumnHeader
            columnKey="name"
            label="Kunde"
            isActive={sortState.key==='name'}
            direction={sortState.key==='name' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('name')}
          />
          <ColumnHeader
            columnKey="offer"
            label="Angebot"
            isActive={sortState.key==='offer'}
            direction={sortState.key==='offer' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('offer')}
          />
          <ColumnHeader
            columnKey="status"
            label="Status"
            isActive={sortState.key==='status'}
            direction={sortState.key==='status' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('status')}
          />
          <ColumnHeader
            columnKey="result"
            label="Ergebnis"
            isActive={sortState.key==='result'}
            direction={sortState.key==='result' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('result')}
          />
          <ColumnHeader
            columnKey="followUp"
            label="Follow-up"
            isActive={sortState.key==='followUp'}
            direction={sortState.key==='followUp' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('followUp')}
          />
          <ColumnHeader
            columnKey="assignedTo"
            label="Zuständigkeit"
            isActive={sortState.key==='assignedTo'}
            direction={sortState.key==='assignedTo' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('assignedTo')}
          />
          <ColumnHeader
            columnKey="contacts"
            label="Kontakt"
            isActive={sortState.key==='contacts'}
            direction={sortState.key==='contacts' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('contacts')}
          />
          <ColumnHeader
            columnKey="notes"
            label="Anmerkung"
            isActive={sortState.key==='notes'}
            direction={sortState.key==='notes' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('notes')}
          />
          <ColumnHeader
            columnKey="booking"
            label="Zubuchung"
            sortable={false}
            isActive={false}
            direction={undefined}
            onToggle={()=>{}}
          />
          <ColumnHeader
            columnKey="priority"
            label="Priorität"
            isActive={sortState.key==='priority'}
            direction={sortState.key==='priority' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('priority')}
          />
          <ColumnHeader
            columnKey="activity"
            label="Aktivität"
            sortable={false}
            isActive={false}
            direction={undefined}
            onToggle={()=>{}}
          />
          <div className="text-xs font-medium text-gray-600">Aktionen</div>
        </div>
      </div>

      {/* Client List (virtualized or classic) */}
      {virtualRowsEnabled ? (
        <VirtualClientList
          clients={sortedClients}
          users={users}
          actions={actions}
          selectedSet={selectedSet}
          onToggleSelect={toggleAtIndex}
          onTogglePin={togglePinAtIndex}
        />
      ) : (
        <ClassicClientList
          clients={sortedClients}
          users={users}
          actions={actions}
          selectedSet={selectedSet}
          onToggleSelect={toggleAtIndex}
          onTogglePin={togglePinAtIndex}
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
              ({virtualRowsEnabled ? 'ON' : 'OFF'}) - {sortedClients.length} clients
            </span>
          </label>
        </div>
      )}

      {/* Client Info Dialog */}
      <ClientInfoDialog
        isOpen={!!clientInfoDialogId}
        onClose={() => setClientInfoDialogId(null)}
        client={clientInfoDialogId ? sortedClients.find((c: any) => c.id === clientInfoDialogId) || null : null}
      />
    </div>
  );
}

export default Board;
