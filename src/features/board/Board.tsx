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
import { getAllColumns } from './columns/registry';
import { useColumnVisibility } from './hooks/useColumnVisibility';

// Lazy-load VirtualizedBoardList außerhalb Component für Code-Splitting
const VirtualizedBoardList = React.lazy(() => import('./components/VirtualizedBoardList'));

// Extracted components for stable hook order
function ClassicClientList({ 
  clients, 
  users, 
  actions, 
  selectedSet, 
  visibleColumns,
  onToggleSelect,
  onTogglePin
}: {
  clients: any[];
  users: any[];
  actions: any;
  selectedSet: Set<string>;
  visibleColumns: any[];
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

  // Generate dynamic grid template for rows
  const rowGridTemplate = useMemo(() => {
    const baseColumns = ['64px']; // Selection + Pin column

    visibleColumns.forEach(col => {
      const width = col.minWidth ? `${col.minWidth}px` : '120px';
      baseColumns.push(width);
    });

    return baseColumns.join(' ');
  }, [visibleColumns]);

  const minWidthValue = useMemo(() => {
    const totalWidth = visibleColumns.reduce((sum, col) => sum + (col.minWidth || 120), 64);
    return `${totalWidth}px`;
  }, [visibleColumns]);

  return (
    <div className="border rounded-lg overflow-hidden" style={{ minWidth: minWidthValue }}>
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
                visibleColumns={visibleColumns}
                gridTemplate={rowGridTemplate}
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
  visibleColumns,
  onToggleSelect,
  onTogglePin
}: {
  clients: any[];
  users: any[];
  actions: any;
  selectedSet: Set<string>;
  visibleColumns: any[];
  onToggleSelect: (index: number, id: string, withShift: boolean) => void;
  onTogglePin: (index: number, id: string, event?: React.MouseEvent) => void;
}) {
  return (
    <React.Suspense fallback={<div className="min-w-[1480px] border rounded-lg overflow-hidden h-[520px] bg-gray-50 animate-pulse" />}>
      <VirtualizedBoardList
        clients={clients}
        users={users}
        actions={actions}
        visibleColumns={visibleColumns}
        selectedIds={selectedSet}
        onToggleSelect={onToggleSelect}
        onTogglePin={onTogglePin}
        rowHeight={44}
        className="border rounded-lg overflow-hidden"
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

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Column visibility management
  const allColumns = useMemo(() => getAllColumns(), []);
  const { visible: visibleColumnKeys, toggle, reset, getVisibleColumns } = useColumnVisibility(allColumns, 'board-main');
  const visibleColumns = useMemo(() => getVisibleColumns(), [getVisibleColumns]);
  
  // All hooks must be called before any early returns
  const { clients, users, isLoading, view, toggleSort } = useBoardData();
  const actions = useBoardActions();

  // Start performance measurement
  perfMark('board:render:start');

  function handleHeaderToggle(key: string){ try { toggleSort?.(key as any); } catch {} }

  // Selektion/IDs ableiten
  const allIds = useMemo(() => clients.map((c: any) => c.id as string), [clients]);


  // Performance measurement after render
  useEffect(() => {
    perfMark('board:render:end');
    perfMeasure('board:render', 'board:render:start', 'board:render:end');
  });

  // Listen for ClientInfoDialog open events and board refresh
  useEffect(() => {
    const handleOpenClientInfo = (event: CustomEvent) => {
      setClientInfoDialogId(event.detail.id);
    };

    const handleBoardRefresh = () => {
      console.log('🔄 Board refresh triggered');
      // Nicht mehr nötig - liveQuery refresht automatisch
    };

    const handleSyncDataUpdated = (event: CustomEvent) => {
      console.log('🔄 Sync data updated:', event.detail);
      // liveQuery aktualisiert automatisch, nur Log für User-Feedback
      // Optional: Toast-Notification anzeigen
    };

    window.addEventListener('board:open-client-info', handleOpenClientInfo as EventListener);
    window.addEventListener('board:refresh', handleBoardRefresh);
    window.addEventListener('sync:dataUpdated', handleSyncDataUpdated as EventListener);

    return () => {
      window.removeEventListener('board:open-client-info', handleOpenClientInfo as EventListener);
      window.removeEventListener('board:refresh', handleBoardRefresh);
      window.removeEventListener('sync:dataUpdated', handleSyncDataUpdated as EventListener);
    };
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
    const currentClient = clients.find((c: any) => c.id === id);
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

  // Generate header grid template (same as rows)
  const headerGridTemplate = useMemo(() => {
    const baseColumns = ['64px']; // Selection + Pin column

    visibleColumns.forEach(col => {
      const width = col.minWidth ? `${col.minWidth}px` : '120px';
      baseColumns.push(width);
    });

    return baseColumns.join(' ');
  }, [visibleColumns]);

  const minHeaderWidthValue = useMemo(() => {
    const totalWidth = visibleColumns.reduce((sum, col) => sum + (col.minWidth || 120), 64);
    return `${totalWidth}px`;
  }, [visibleColumns]);

  // Derived values
  const selectedRowsProvider = () => clients.filter((c: any) => selectedSet.has(c.id));

  // Decode-Errors Detection
  const decodeErrors = useMemo(() => {
    return clients.filter(c => (c as any)._decodeError === true);
  }, [clients]);

  // Debug logging for empty state
  useEffect(() => {
    if (import.meta.env.DEV && !isLoading) {
      console.log('🔍 Board Debug:', {
        clientsLength: clients.length,
        isLoading,
        viewFilters: view?.filters,
        hasUsers: users.length > 0,
        userCount: users.length,
        decodeErrors: decodeErrors.length
      });

      // Zusätzliche DB-Prüfung wenn Board leer ist
      if (clients.length === 0) {
        db.clients.count().then(rawCount => {
          console.log(`🔍 Raw DB count: ${rawCount} clients`);
          if (rawCount > 0) {
            console.warn('⚠️ DB hat Daten, aber Board zeigt keine - möglicherweise Crypto-Problem');
          } else {
            console.log('💡 DB ist wirklich leer - bitte Test-Daten erstellen');
          }
        });
      }
    }
  }, [clients.length, isLoading, users.length, view?.filters, decodeErrors.length]);

  // Early return AFTER all hooks
  if (isLoading) return <div className="p-4 text-sm text-gray-600">Lade Board…</div>;

  return (
    <div className="p-4 overflow-auto">
      {/* Error-Banner für Decode-Fehler */}
      {decodeErrors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-semibold">⚠️ Entschlüsselungsfehler</span>
            <span className="text-sm text-red-700">
              {decodeErrors.length} Datensatz{decodeErrors.length > 1 ? 'e' : ''} konnte{decodeErrors.length > 1 ? 'n' : ''} nicht entschlüsselt werden
            </span>
          </div>
          <button
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
            onClick={() => {
              console.log('Re-encrypt requested for:', decodeErrors.map(c => c.id));
              alert('Admin-Funktion für Re-Encryption noch nicht implementiert. IDs wurden in Konsole geloggt.');
            }}
          >
            Problem beheben (Admin)
          </button>
        </div>
      )}

      <BoardHeader
        selectedCount={selectedIds.length}
        getSelectedRows={selectedRowsProvider}
        onPinSelected={() => actions.bulkPin?.(selectedIds)}
        onUnpinSelected={() => actions.bulkUnpin?.(selectedIds)}
        onRefresh={() => {}}
        allColumns={allColumns}
        visibleColumns={visibleColumnKeys}
        onToggleColumn={toggle}
        onResetColumns={reset}
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
      <div className="border rounded-t-lg bg-gray-50 border-b px-3 py-2" style={{ minWidth: minHeaderWidthValue }}>
        <div className="grid gap-2 items-center" style={{ gridTemplateColumns: headerGridTemplate }}>
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
          {visibleColumns.map((col) => (
            <ColumnHeader
              key={col.key}
              columnKey={col.key}
              label={col.label}
              sortable={col.sortable}
              isActive={view?.sort?.key === col.key}
              direction={view?.sort?.key === col.key ? view?.sort?.direction : undefined}
              onToggle={() => col.sortable && handleHeaderToggle(col.key)}
            />
          ))}
        </div>
      </div>

      {/* Client List (virtualized or classic) */}
      {clients.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-gray-50">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Klient:innen gefunden</h3>
          <p className="text-sm text-gray-600 mb-6">
            {view?.filters?.chips?.length > 0 || view?.filters?.showArchived
              ? 'Keine Einträge entsprechen den aktuellen Filterkriterien.'
              : 'Die Datenbank ist leer. Importieren Sie Daten oder erstellen Sie Test-Daten.'}
          </p>
          {import.meta.env.DEV && (
            <button
              onClick={async () => {
                try {
                  const { seedTestData } = await import('../../data/seed');
                  await seedTestData('replace');
                  alert('Test-Daten wurden erstellt!');
                  window.location.reload();
                } catch (error) {
                  console.error('Seed failed:', error);
                  alert('Fehler beim Erstellen der Test-Daten: ' + (error as Error).message);
                }
              }}
              className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors"
            >
              Test-Daten erstellen (DEV)
            </button>
          )}
        </div>
      ) : virtualRowsEnabled ? (
        <VirtualClientList
          clients={clients}
          users={users}
          actions={actions}
          selectedSet={selectedSet}
          visibleColumns={visibleColumns}
          onToggleSelect={toggleAtIndex}
          onTogglePin={togglePinAtIndex}
        />
      ) : (
        <ClassicClientList
          clients={clients}
          users={users}
          actions={actions}
          selectedSet={selectedSet}
          visibleColumns={visibleColumns}
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
              ({virtualRowsEnabled ? 'ON' : 'OFF'}) - {clients.length} clients
            </span>
          </label>
        </div>
      )}

      {/* Client Info Dialog */}
      <ClientInfoDialog
        isOpen={!!clientInfoDialogId}
        onClose={() => setClientInfoDialogId(null)}
        client={clientInfoDialogId ? clients.find((c: any) => c.id === clientInfoDialogId) || null : null}
      />
    </div>
  );
}

export default Board;