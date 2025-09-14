import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { perfMark, perfMeasure } from '../../lib/perf/timer';
import { useRenderCount } from '../../lib/perf/useRenderCount';
import { useBoardData } from './useBoardData';
import { useBoardActions } from './hooks/useBoardActions';
import { useOptimisticOverlay } from './hooks/useOptimisticOverlay';
import ColumnHeader from './components/ColumnHeader';
import { ClientInfoDialog } from './components';
import { ClientRow } from './components/ClientRow';
import BatchActionsBar from './components/BatchActionsBar';
import { BoardHeader } from './components';
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
  
  // Simple non-virtualized list rendering
  return (
    <div className="relative">
      <div className="min-w-[1480px] border rounded-lg overflow-hidden">
        {clients.map((client, index) => (
          <div key={client.id} role="row" aria-rowindex={index + 1}>
            <ClientRow
              client={client}
              index={index}
              users={users}
              actions={actions}
              selected={selectedSet.has(client.id)}
              onToggleSelect={(withShift) => onToggleSelect(index, client.id, withShift)}
              onTogglePin={(e) => onTogglePin(index, client.id, e)}
            />
          </div>
        ))}
        {clients.length === 0 && (
          <div className="px-3 py-6 text-sm text-gray-500 hover:bg-gray-50">
            Keine Einträge für die aktuelle Ansicht.
          </div>
        )}
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
  const renderCount = useRenderCount('Board');
  const lastIndexRef = useRef<number | null>(null);
  const [lastPinAnchorIndex, setLastPinAnchorIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clientInfoDialogId, setClientInfoDialogId] = useState<string | null>(null);
  const [virtualRowsEnabled, setVirtualRowsEnabled] = useState(featureManager.isEnabled('virtualRows'));

  // All hooks must be called before any early returns
  const { clients, users, isLoading, view, setView } = useBoardData();
  const actions = useBoardActions();

  const clientsWithOverlay = useOptimisticOverlay(clients);
  const visibleClients = useMemo(() => clientsWithOverlay.filter((c: any) => !c.isArchived || view.showArchived), [clientsWithOverlay, view.showArchived]);

  // ==== SORT BLOCK (canonical) ====
  type SortState = { key: string | null; direction: 'asc' | 'desc' | null };
const sortState: SortState = (view?.sort ?? { key: null, direction: null });

  const _formatName = (c: any) => {
    const last = c.lastName ?? '';
    const first = c.firstName ?? '';
    const title = c.title ? ` (${c.title})` : '';
    const fallback = c.name ?? '';
    return (last || first) ? `${last}, ${first}${title}` : fallback;
  };

  const _userName = (id?: string|null) => {
    if (!id) return '';
    const u = Array.isArray(users) ? users.find((x:any)=>x?.id===id) : null;
    return u?.name ?? '';
  };


  const _getPinned = (c: any) => Boolean(c.isPinned ?? c.pinned ?? false);
  const _cmpStr  = (a: any, b: any) => String(a).localeCompare(String(b), 'de', { sensitivity: 'base' });
  const _cmpNum  = (a: any, b: any) => Number(a) - Number(b);
  const _cmpDate = (a?: string | null, b?: string | null) => {
    if (!a && !b) return 0; if (!a) return 1; if (!b) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  };

  const _sortClients = (list: any[], sort: SortState) => {
    const dir = sort?.direction === 'desc' ? -1 : 1;
    const key = sort?.key;
    const arr = [...list];
    arr.sort((a, b) => {
      // 1) Pins immer zuerst
      const pa = _getPinned(a), pb = _getPinned(b);
      if (pa !== pb) return pa ? -1 : 1;

      // 2) Aktive Spalte
      let d = 0;
      switch (key) {
        case 'name':       d = _cmpStr(_formatName(a), _formatName(b)); break;
        case 'offer':      d = _cmpStr(a.offer ?? '', b.offer ?? ''); break;
        case 'status':     d = _cmpStr(a.status ?? '', b.status ?? ''); break;
        case 'result':     d = _cmpStr(a.result ?? '', b.result ?? ''); break;
        case 'followUp':   d = _cmpDate(a.followUp ?? null, b.followUp ?? null); break;
        case 'assignedTo': d = _cmpStr(_userName(a.assignedTo), _userName(b.assignedTo)); break;
        case 'contacts':   d = _cmpNum(a.contactCount ?? 0, b.contactCount ?? 0); break;
        case 'notes':      d = _cmpNum((a.noteCount ?? a.notesCount ?? 0), (b.noteCount ?? b.notesCount ?? 0)); break;
        case 'priority':   d = _cmpNum(_priorityRank(a.priority), _priorityRank(b.priority)); break;
        case 'activity':   d = _cmpDate(a.lastActivity ?? null, b.lastActivity ?? null); break;
        case 'booking': {
          const av = (a.booking ?? a.hasBooking ?? a.bookingLabel ?? '');
          const bv = (b.booking ?? b.hasBooking ?? b.bookingLabel ?? '');
          if (typeof av === 'boolean' || typeof bv === 'boolean')      d = _cmpNum(av ? 1 : 0, bv ? 1 : 0);
          else if (typeof av === 'number' || typeof bv === 'number')   d = _cmpNum(Number(av) || 0, Number(bv) || 0);
          else                                                         d = _cmpStr(String(av), String(bv));
          break;
        }
        default: d = 0;
      }

      if (d !== 0) return dir * (d < 0 ? -1 : 1);

      // 3) Stabile Tiebreaker: id
      return String(a.id).localeCompare(String(b.id));
    });
    return arr;
  };

  const sortedClients = useMemo(
    () => _sortClients(visibleClients, sortState),
    [visibleClients, sortState]
  );

  // Selektion/IDs NACH sortedClients ableiten
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = useMemo(() => sortedClients.map((c: any) => c.id as string), [sortedClients]);

  // ==== SORT BLOCK (canonical) END ====

  // Safe shim around setView
  const _cycle = (prev:{key:string|null;direction:'asc'|'desc'|null}|null, key:string)=>{
    if(!prev || prev.key!==key) return { key, direction:'asc' as const };
    if(prev.direction==='asc') return { key, direction:'desc' as const };
    return { key:null, direction:null };
  };
  const _setView = (update:any) => { try { setView(update); } catch {} };
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
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      idsInRange.forEach(id => newSet.add(id));
      return Array.from(newSet);
    });
    lastIndexRef.current = index;
  };

  const togglePinAtIndex = (index: number, id: string, event?: React.MouseEvent) => {
    const withShift = event?.shiftKey || false;
    const currentClient = sortedClients.find((c: any) => c.id === id);
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
  const selectedRowsProvider = () => sortedClients.filter((c: any) => selectedSet.has(c.id));

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
            isActive={sortState.key==='booking'}
            direction={sortState.key==='booking' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('booking')}
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
            isActive={sortState.key==='activity'}
            direction={sortState.key==='activity' ? sortState.direction : undefined}
            onToggle={()=>handleHeaderToggle('activity')}
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
