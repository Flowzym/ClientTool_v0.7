import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countNotes } from './utils/notes';
import { perfMark, perfMeasure } from '../../lib/perf/timer';
import { useRenderCount } from '../../lib/perf/useRenderCount';
import { useBoardData } from './useBoardData';
import { useBoardActions } from './hooks/useBoardActions';
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
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [clientInfoDialogId, setClientInfoDialogId] = useState<string | null>(null);
  const [virtualRowsEnabled, setVirtualRowsEnabled] = useState(featureManager.isEnabled('virtualRows'));

  // All hooks must be called before any early returns
  const { clients, users, isLoading, view, toggleSort } = useBoardData();
  const actions = useBoardActions();

  function handleHeaderToggle(key: string){ try { toggleSort?.(key as any); } catch {} }

  // ==== SORT BLOCK (canonical) ====

  type SortState = { key: string | null; direction: 'asc' | 'desc' | null };

  const [localSort, setLocalSort] = useState<SortState>({ key: null, direction: null });

  const sortStateResolved: SortState =
    (localSort && (localSort.key !== null || localSort.direction !== null))
      ? localSort
      : (view?.sort ?? { key: null, direction: null });

  const _formatName = (c: any) => {
    const last = c.lastName ?? '';
    const first = c.firstName ?? '';
    const title = c.title ? ` (${c.title})` : '';
    const fallback = c.name ?? '';
    return (last || first) ? `${last}, ${first}${title}` : fallback;
  };

  const _getPinned = (c: any) => Boolean(c.isPinned ?? c.pinned ?? false);
  const _cmpStr  = (a: any, b: any) => String(a).localeCompare(String(b), 'de', { sensitivity: 'base' });
  const _cmpNum  = (a: any, b: any) => Number(a) - Number(b);
  const _cmpDate = (a?: string | null, b?: string | null) => {
    if (!a && !b) return 0; if (!a) return 1; if (!b) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  };

  const withPinnedFirst = (sortFn: (a: any, b: any) => number) => (a: any, b: any) => {
    const pa = _getPinned(a), pb = _getPinned(b);
    if (pa !== pb) return pa ? -1 : 1;
    return sortFn(a, b);
  };

  const byFullName = () => (a: any, b: any) => {
    const aName = _formatName(a);
    const bName = _formatName(b);
    return _cmpStr(aName, bName);
  };

  const byEnum = (key: string, order: string[]) => (a: any, b: any) => {
    const ord = order.map(v => String(v).toLowerCase());
    const unknown = ord.length;
    const av = String(a?.[key] ?? '').toLowerCase();
    const bv = String(b?.[key] ?? '').toLowerCase();
    const ai = ord.indexOf(av); const bi = ord.indexOf(bv);
    const aIndex = ai === -1 ? unknown : ai;
    const bIndex = bi === -1 ? unknown : bi;
    if (aIndex !== bIndex) return aIndex - bIndex;
    // Secondary sort by name for stability
    return byFullName()(a, b);
  };

  const byDateISO = (key: string) => (a: any, b: any) => {
    const aDate = a?.[key] ? new Date(a[key]).getTime() : Number.POSITIVE_INFINITY;
    const bDate = b?.[key] ? new Date(b[key]).getTime() : Number.POSITIVE_INFINITY;
    return aDate - bDate;
  };

  const byNoteText = () => (a: any, b: any) => {
    const aText = String(a?.note ?? '');
    const bText = String(b?.note ?? '');
    if (aText.length !== bText.length) return aText.length - bText.length;
    return _cmpStr(aText, bText);
  };

  const visibleClients = useMemo(() => 
    clients.filter((c: any) => !c.isArchived || view?.showArchived), 
    [clients, view?.showArchived]
  );

  const sortedClients = useMemo(() => {
    let sorted = [...visibleClients];
    
    if (sortStateResolved.key && sortStateResolved.direction) {
      const direction = sortStateResolved.direction === 'desc' ? -1 : 1;
      
      switch (sortStateResolved.key) {
        case 'name':
          sorted.sort(withPinnedFirst((a, b) => byFullName()(a, b) * direction));
          break;
        case 'status':
          const statusOrder = ['offen', 'terminVereinbart', 'inBearbeitung', 'wartetRueckmeldung', 'erledigt', 'nichtErreichbar', 'abgebrochen'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('status', statusOrder)(a, b) * direction));
          break;
        case 'priority':
          const priorityOrder = ['niedrig', 'normal', 'hoch', 'dringend'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('priority', priorityOrder)(a, b) * direction));
          break;
        case 'assignedTo':
          sorted.sort(withPinnedFirst((a, b) => {
            const aUser = users.find(u => u.id === a.assignedTo)?.name || '';
            const bUser = users.find(u => u.id === b.assignedTo)?.name || '';
            return _cmpStr(aUser, bUser) * direction;
          }));
          break;
        case 'activity':
          sorted.sort(withPinnedFirst((a, b) => byDateISO('lastActivity')(a, b) * direction));
          break;
        case 'followUp':
          sorted.sort(withPinnedFirst((a, b) => byDateISO('followUp')(a, b) * direction));
          break;
        case 'contacts':
          sorted.sort(withPinnedFirst((a, b) => _cmpNum(a.contactCount ?? 0, b.contactCount ?? 0) * direction));
          break;
        case 'notes':
          sorted.sort(withPinnedFirst((a, b) => byNoteText()(a, b) * direction));
          break;
        case 'booking':
          sorted.sort(withPinnedFirst((a, b) => byDateISO('amsBookingDate')(a, b) * direction));
          break;
        case 'offer':
          const angebotOrder = ['BAM', 'LL/B+', 'BwB', 'NB'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('angebot', angebotOrder)(a, b) * direction));
          break;
        case 'result':
          const resultOrder = ['bam', 'lebenslauf', 'bewerbungsbuero', 'gesundheitlicheMassnahme', 'mailaustausch', 'keineReaktion'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('result', resultOrder)(a, b) * direction));
          break;
      }
    } else {
      // Default sorting by urgency when no specific sort is applied
      sorted.sort(withPinnedFirst((a, b) => {
        // Priority: dringend > hoch > normal > niedrig
        const priorityOrder = { dringend: 4, hoch: 3, normal: 2, niedrig: 1 };
        const aPrio = priorityOrder[a.priority] || 0;
        const bPrio = priorityOrder[b.priority] || 0;
        
        if (aPrio !== bPrio) return bPrio - aPrio;
        
        // Follow-up: frühere Termine zuerst
        if (a.followUp && b.followUp) {
          return new Date(a.followUp).getTime() - new Date(b.followUp).getTime();
        }
        if (a.followUp && !b.followUp) return -1;
        if (!a.followUp && b.followUp) return 1;
        
        // Last activity: ältere zuerst
        if (a.lastActivity && b.lastActivity) {
          return new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
        }
        
        return 0;
      }));
    }
    
    return sorted;
  }, [visibleClients, sortStateResolved, users]);

  // Selektion/IDs NACH sortedClients ableiten
  const allIds = useMemo(() => sortedClients.map((c: any) => c.id as string), [sortedClients]);

  // ==== SORT BLOCK (canonical) END ====

  
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
          </div>
          <ColumnHeader
            columnKey="name"
            label="Kunde"
            isActive={sortStateResolved.key==='name'}
            direction={sortStateResolved.key==='name' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('name')}
          />
          <ColumnHeader
            columnKey="offer"
            label="Angebot"
            isActive={sortStateResolved.key==='offer'}
            direction={sortStateResolved.key==='offer' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('offer')}
          />
          <ColumnHeader
            columnKey="status"
            label="Status"
            isActive={sortStateResolved.key==='status'}
            direction={sortStateResolved.key==='status' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('status')}
          />
          <ColumnHeader
            columnKey="result"
            label="Ergebnis"
            isActive={sortStateResolved.key==='result'}
            direction={sortStateResolved.key==='result' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('result')}
          />
          <ColumnHeader
            columnKey="followUp"
            label="Follow-up"
            isActive={sortStateResolved.key==='followUp'}
            direction={sortStateResolved.key==='followUp' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('followUp')}
          />
          <ColumnHeader
            columnKey="assignedTo"
            label="Zuständigkeit"
            isActive={sortStateResolved.key==='assignedTo'}
            direction={sortStateResolved.key==='assignedTo' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('assignedTo')}
          />
          <ColumnHeader
            columnKey="contacts"
            label="Kontakt"
            isActive={sortStateResolved.key==='contacts'}
            direction={sortStateResolved.key==='contacts' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('contacts')}
          />
          <ColumnHeader
            columnKey="notes"
            label="Anmerkung"
            isActive={sortStateResolved.key==='notes'}
            direction={sortStateResolved.key==='notes' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('notes')}
          />
          <ColumnHeader
            columnKey="booking"
            label="Zubuchung"
            isActive={sortStateResolved.key==='booking'}
            direction={sortStateResolved.key==='booking' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('booking')}
          />
          <ColumnHeader
            columnKey="priority"
            label="Priorität"
            isActive={sortStateResolved.key==='priority'}
            direction={sortStateResolved.key==='priority' ? sortStateResolved.direction : undefined}
            onToggle={()=>handleHeaderToggle('priority')}
          />
          <ColumnHeader
            columnKey="activity"
            label="Aktivität"
            isActive={sortStateResolved.key==='activity'}
            direction={sortStateResolved.key==='activity' ? sortStateResolved.direction : undefined}
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