import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Empty } from '../../components/Empty';
import { Trello, Filter, SortDesc, Archive, User, Phone, MessageSquare, Mail, StickyNote } from 'lucide-react';
import { useBoardData, type FilterChip, type SortMode } from './useBoardData';
import { ContactDialog } from './ContactDialog';
import { ClientInfoDialog } from './ClientInfoDialog';
import { StatusChip, ResultChip } from './StatusChips';
import { AssignDropdown } from './AssignDropdown';
import { FollowupPicker } from './FollowupPicker';
import { BatchBar } from './BatchBar';
import { Can } from '../../components/auth/Can';
import { db } from '../../data/db';
import { nowISO } from '../../utils/date';
import type { Client, Channel, Priority } from '../../domain/models';
import { formatDDMMYYYY } from '../../utils/date';



const __genderSymbol = (g:any) => g === 'F' ? '♀' : (g === 'M' ? '♂' : '');
/** akzeptiere nur skalare Keys (string|number) */
const safeKey = (v: any) => (typeof v === 'string' || typeof v === 'number') ? v : undefined;

/** Anzeige-Normalisierung (zusätzliche Safety im UI) */
function normalizeClientView(c: Partial<Client>): Client {
  return {
    ...c,
    firstName: c.firstName ?? '',
    lastName:  c.lastName  ?? '',
    priority:  (c.priority as any) ?? 'normal',
    status:    (c.status as any)   ?? 'offen',
    contactCount: typeof c.contactCount === 'number' ? c.contactCount : 0,
    contactLog:   Array.isArray(c.contactLog) ? c.contactLog : [],
    isArchived:   !!c.isArchived,
  } as Client;
}

/** Primärschlüssel robust finden: id → amsId → rowKey */
async function resolvePk(row: Partial<Client>): Promise<string | number> {
  if (typeof row.id === 'string' || typeof row.id === 'number') return row.id;
  if (safeKey((row as any).amsId)) {
    const hit = await db.clients.where('amsId').equals(safeKey((row as any).amsId) as any).first();
    if (hit && (hit as any).id != null) return (hit as any).id;
  }
  if ((row as any).rowKey) {
    const hit = await db.clients.where('rowKey').equals(safeKey((row as any).rowKey) as any).first();
    if (hit && (hit as any).id != null) return (hit as any).id;
  }
  throw new Error('Kein Primärschlüssel gefunden');
}

/** Zentrales Update – inkl. lastActivity */
async function updateClientByIdOrLookup(row: Partial<Client>, mods: Partial<Client>) {
  const pk = await resolvePk(row);
  const patch: any = { ...mods };
  if (!('lastActivity' in patch)) patch.lastActivity = nowISO();

  const n = await db.clients.update(pk as any, patch);
  if (n > 0) return;

  const existing = await db.clients.get(pk as any);
  if (!existing) throw new Error('Client nicht gefunden');
  await db.clients.put({ ...existing, ...patch, id: pk } as any);
}

const filterChipLabels: Record<FilterChip, string> = {
  'unassigned': 'ohne Zuteilung',
  'followup-today': 'Wiedervorlage heute',
  'followup-overdue': 'Wiedervorlage überfällig',
  'unreachable-3plus': 'nicht erreichbar (≥3 Versuche)',
  'appointment-open': 'Termin offen',
  'documents-open': 'Dokumente offen',
  'completed': 'Erledigt',
  'cancelled': 'Abgebrochen',
  'inactive-14days': '>14 Tage inaktiv',
  'priority-high': 'Priorität: hoch/dringend',
  'assigned-me': 'zugewiesen: ich'
};

const sortModeLabels: Record<SortMode, string> = {
  'urgency': 'Dringlichkeit',
  'activity': 'Letzte Aktivität',
  'assignee': 'Mitarbeitende'
};

const priorityVariants: Record<Priority, 'default' | 'success' | 'warning' | 'error'> = {
  'niedrig': 'default',
  'normal': 'default',
  'hoch': 'warning',
  'dringend': 'error'
};

export function Board() {
  const {
    clients,
    users,
    view,
    counts,
    isLoading,
    selectedIds,
    setSelectedIds,
    toggleChip,
    toggleArchived,
    setCurrentUser,
    setSortMode,
    refreshData
  } = useBoardData();

  // Sidebar-Sync: Board-View-Änderungen an Sidebar melden
  useEffect(() => {
    try {
      document.dispatchEvent(new CustomEvent('board:viewUpdated', {
        detail: {
          chips: view.filters.chips,
          showArchived: view.filters.showArchived,
          currentUserId: view.filters.currentUserId,
          sortMode: view.sort.mode
        }
      }));
    } catch {}
  }, [view]);

  // Sidebar steuert Board über Events
  useEffect(() => {
    const onToggle = (ev: any) => {
      const chip = ev?.detail as any;
      if (chip) toggleChip(chip);
    };
    const onToggleArchived = () => toggleArchived();
    document.addEventListener('board:toggleChip', onToggle as any);
    document.addEventListener('board:toggleArchived', onToggleArchived as any);
    return () => {
      document.removeEventListener('board:toggleChip', onToggle as any);
      document.removeEventListener('board:toggleArchived', onToggleArchived as any);
    };
  }, [toggleChip, toggleArchived]);


  const [contactDialog, setContactDialog] = useState<{ isOpen: boolean; client?: Client; }>({ isOpen: false });
  const [infoDialog, setInfoDialog] = useState<{ isOpen: boolean; client: Client | null }>({ isOpen: false, client: null });

  // Undo- / Redo-State
  const [undoAction, setUndoAction] = useState<{
    type: string;
    data: any;
    redo?: any;
    timeoutId?: any;
  } | null>(null);

  const [redoAction, setRedoAction] = useState<any | null>(null);
  const handleRedo = useCallback(async () => {
    if (!redoAction) return;
    try {
      const patches = redoAction.redo.map((item: any) => ({
        id: item.id,
        ...item.newValues
      }));
      // Optimistic visual
      if (patches.length) applyOptimistic(patches.map(p => String(p.id)), patches[0] || {});
      await db.bulkPatch(patches);
      await refreshData();
      clearOptimistic(patches.map(p => String(p.id)));
      setRedoAction(null);
    } catch (e) {
      console.error('Redo failed', e);
    }
  }, [redoAction, refreshData]);

  // Optimistic UI-Puffer
  const [pendingPatches, setPendingPatches] = useState<Map<string, Partial<Client>>>(new Map());
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());
  // Auswahl: letzter geklickter Row-Key für Shift-Range-Selektion
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);


  const applyOptimistic = (ids: string[], patch: Partial<Client>) => {
    setPendingPatches(prev => {
      const next = new Map(prev);
      ids.forEach(id => {
        const current = next.get(id) ?? {};
        next.set(id, { ...current, ...patch });
      });
      return next;
    });
  };
  const clearOptimistic = (ids: string[]) => {
    setPendingPatches(prev => {
      const next = new Map(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    setPendingRemovals(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  // Kontakt hinzufügen
  const handleAddContact = useCallback(async (client: Client, channel: Channel, note?: string) => {
    try {
      await updateClientByIdOrLookup(client, {
        contactLog: [...(client.contactLog ?? []), { date: nowISO(), channel, note }],
        contactCount: (client.contactCount ?? 0) + 1
      });
      await refreshData();
    } catch (error) {
      console.error('❌ Failed to add contact:', error);
    }
  }, [refreshData]);

  // Einzelne Feldänderungen → optimistisch + Undo/Redo
  const handleFieldUpdate = useCallback(async (client: Partial<Client>, updates: Partial<Client>) => {
    try {
      if (client?.id) applyOptimistic([String(client.id)], updates);

      const undoData = [{ id: client.id, originalValues: { ...(client as any) } }];
      const redoData = [{ id: client.id, newValues: { ...updates, id: client.id } }];

      await updateClientByIdOrLookup(client, updates);
      await refreshData();
      if (client?.id) clearOptimistic([String(client.id)]);

      if (undoAction?.timeoutId) clearTimeout(undoAction.timeoutId);
      const timeoutId = setTimeout(() => setUndoAction(null), 10000);
      setUndoAction({ type: 'field', data: undoData, redo: redoData, timeoutId });
    } catch (error) {
      console.error('❌ Failed to update client:', error);
      if (client?.id) clearOptimistic([String(client.id)]);
    }
  }, [refreshData, undoAction]);

  // Priorität cycling
  const cyclePriority = useCallback((current: Priority): Priority => {
    const order: Priority[] = ['niedrig', 'normal', 'hoch', 'dringend'];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  }, []);

  // Batch-Aktionen
  const handleBatchAction = useCallback(async (
    action: 'assign' | 'status' | 'result' | 'followup' | 'archive' | 'unarchive' | 'delete',
    value?: any
  ) => {
    if (selectedIds.length === 0) return;
    try {
      const selectedClients = clients.filter(c => selectedIds.includes(c.id));

      const undoData = selectedClients.map(c => ({ id: c.id, originalValues: { ...c } }));

      let optPatch: Partial<Client> | null = null;
      if (action === 'assign') optPatch = { assignedTo: value, lastActivity: nowISO() };
      if (action === 'status') optPatch = { status: value, lastActivity: nowISO() };
      if (action === 'result') optPatch = { result: value, lastActivity: nowISO() };
      if (action === 'followup') optPatch = { followUp: value };
      if (action === 'archive') optPatch = { isArchived: true, archivedAt: nowISO() };
      if (action === 'unarchive') optPatch = { isArchived: false, archivedAt: undefined };

      if (optPatch) applyOptimistic(selectedIds, optPatch);
      if (action === 'archive' || action === 'delete') {
        setPendingRemovals(prev => {
          const next = new Set(prev);
          selectedIds.forEach(id => next.add(id));
          return next;
        });
      }

      const redoData = selectedClients.map(c => ({ id: c.id, newValues: { ...(optPatch ?? {}), id: c.id } }));

      switch (action) {
        case 'assign':
          await db.bulkPatch(selectedIds.map(id => ({ id, assignedTo: value })));
          break;
        case 'status':
          await db.bulkPatch(selectedIds.map(id => ({ id, status: value })));
          break;
        case 'result':
          await db.bulkPatch(selectedIds.map(id => ({ id, result: value })));
          break;
        case 'followup':
          await db.bulkPatch(selectedIds.map(id => ({ id, followUp: value })));
          break;
        case 'archive':
          await db.bulkArchive(selectedIds, nowISO());
          break;
        case 'unarchive':
          await db.bulkPatch(selectedIds.map(id => ({ id, isArchived: false, archivedAt: undefined })));
          break;
        case 'delete':
          const deletable = selectedClients.filter(c => (c.contactLog?.length ?? 0) === 0 && !c.assignedTo);
          if (deletable.length > 0) await db.bulkDelete(deletable.map(c => c.id));
          break;
      }

      if (undoAction?.timeoutId) clearTimeout(undoAction.timeoutId);
      const timeoutId = setTimeout(() => setUndoAction(null), 10000);
      setUndoAction({ type: action, data: undoData, redo: redoData, timeoutId });

      setSelectedIds([]);
      await refreshData();
      clearOptimistic(selectedIds);
    } catch (error) {
      console.error(`❌ Batch ${action} failed:`, error);
    }
  }, [selectedIds, clients, refreshData, undoAction]);

  // Undo
  const handleUndo = useCallback(async () => {
    if (!undoAction) return;
    try {
      const patches = undoAction.data.map((item: any) => ({ id: item.id, ...item.originalValues }));
      await db.bulkPatch(patches);
      await refreshData();
      setRedoAction({ redo: undoAction.redo });
      if (undoAction.timeoutId) clearTimeout(undoAction.timeoutId);
      setUndoAction(null);
    } catch (error) {
      console.error('❌ Undo failed:', error);
    }
  }, [undoAction, refreshData]);

  // Tabellen-Spalten
  const columnHelper = createColumnHelper<Client>();

function formatPhoneForDisplay(c: Client): string {
  // Robust phone pretty-printer with country-list heuristic
  type CDef = { iso: string; code: string; name: string; trunk?: string };
  const COUNTRY_LIST: CDef[] = [
    { iso: 'AT', code: '43', name: 'Austria', trunk: '0' },
    { iso: 'DE', code: '49', name: 'Germany', trunk: '0' },
    { iso: 'CH', code: '41', name: 'Switzerland', trunk: '0' },
    { iso: 'CZ', code: '420', name: 'Czechia', trunk: '0' },
    { iso: 'SK', code: '421', name: 'Slovakia', trunk: '0' },
    { iso: 'HU', code: '36', name: 'Hungary', trunk: '06' },
    { iso: 'PL', code: '48', name: 'Poland', trunk: '0' },
    { iso: 'IT', code: '39', name: 'Italy', trunk: '0' },
    { iso: 'FR', code: '33', name: 'France', trunk: '0' },
    { iso: 'ES', code: '34', name: 'Spain', trunk: '0' },
    { iso: 'NL', code: '31', name: 'Netherlands', trunk: '0' },
    { iso: 'BE', code: '32', name: 'Belgium', trunk: '0' },
    { iso: 'SE', code: '46', name: 'Sweden', trunk: '0' },
    { iso: 'NO', code: '47', name: 'Norway', trunk: '0' },
    { iso: 'DK', code: '45', name: 'Denmark', trunk: '0' },
    { iso: 'FI', code: '358', name: 'Finland', trunk: '0' },
    { iso: 'PT', code: '351', name: 'Portugal', trunk: '0' },
    { iso: 'IE', code: '353', name: 'Ireland', trunk: '0' },
    { iso: 'LU', code: '352', name: 'Luxembourg', trunk: '0' },
    { iso: 'SI', code: '386', name: 'Slovenia', trunk: '0' },
    { iso: 'HR', code: '385', name: 'Croatia', trunk: '0' },
    { iso: 'BA', code: '387', name: 'Bosnia and Herzegovina', trunk: '0' },
    { iso: 'RS', code: '381', name: 'Serbia', trunk: '0' },
    { iso: 'GB', code: '44', name: 'United Kingdom', trunk: '0' },
    { iso: 'RO', code: '40', name: 'Romania', trunk: '0' },
    { iso: 'GR', code: '30', name: 'Greece', trunk: '0' },
    { iso: 'BG', code: '359', name: 'Bulgaria', trunk: '0' },
    { iso: 'LT', code: '370', name: 'Lithuania', trunk: '8' },
    { iso: 'LV', code: '371', name: 'Latvia', trunk: '8' },
    { iso: 'EE', code: '372', name: 'Estonia', trunk: '0' },
    { iso: 'UA', code: '380', name: 'Ukraine', trunk: '0' },
    { iso: 'TR', code: '90', name: 'Türkiye', trunk: '0' },
    { iso: 'US', code: '1', name: 'US/Canada (NANP)', trunk: '1' },
    { iso: 'AU', code: '61', name: 'Australia', trunk: '0' },
    { iso: 'NZ', code: '64', name: 'New Zealand', trunk: '0' }
  ];
  const CCODES = new Set(COUNTRY_LIST.map(c => c.code));

  const toStr = (v: any) => (v === undefined || v === null) ? '' : String(v);
  const clean = (s?: any) => toStr(s).trim();
  const digitsWithPlus = (s?: any) => clean(s).replace(/[^0-9+]/g, '');
  const digitsOnly = (s?: any) => clean(s).replace(/\D/g, '');

  let cc = digitsOnly(c.countryCode);
  let ac = digitsOnly(c.areaCode);
  let pn = digitsOnly(c.phoneNumber);
  let full = digitsWithPlus(c.phone);

  if (full.startsWith('00')) full = '+' + full.slice(2);

  const detectFromFull = (f: string): string => {
    if (!f) return '';
    if (f.startsWith('+')) {
      const rest = f.slice(1);
      for (const len of [3, 2, 1]) {
        const cand = rest.slice(0, len);
        if (CCODES.has(cand)) return cand;
      }
      return '';
    }
    for (const len of [3, 2]) {
      const cand = f.slice(0, len);
      if (CCODES.has(cand)) return cand;
    }
    return '';
  };

  if (!cc) cc = detectFromFull(full);
  if (!cc) cc = '43'; // Default: Austria

  if (full) {
    if (full.startsWith('+' + cc)) full = full.slice(cc.length + 1);
    else if (full.startsWith(cc)) full = full.slice(cc.length);
  }

  if (!ac && full) {
    let f = digitsOnly(full);
    const country = COUNTRY_LIST.find(x => x.code === cc);
    const trunk = (country?.trunk || '0').replace(/\D/g, '');
    if (trunk && f.startsWith(trunk)) f = f.slice(trunk.length);
    ac = f.slice(0, 3);
    full = f.slice(3);
  }

  if (!pn) {
    let f = digitsOnly(full || c.phone);
    const country = COUNTRY_LIST.find(x => x.code === cc);
    const trunk = (country?.trunk || '0').replace(/\D/g, '');
    if (trunk && f.startsWith(trunk)) f = f.slice(trunk.length);
    pn = f;
  }

  const parts: string[] = [];
  parts.push(`(+${cc})`);
  if (ac) parts.push(ac);
  if (pn) parts.push(pn);
  return parts.join(' ').trim();
}

  const columns = useMemo((): ColumnDef<Client, any>[] => [
    columnHelper.display({
      id: 'select',
      size: 50,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (e.shiftKey && lastClickedId) {
              const rows = (virtOn ? visibleRows : table.getRowModel().rows);
              const ids = rows.map(r => String(r.id));
              const currentId = String(row.id);
              const start = ids.indexOf(lastClickedId);
              const end = ids.indexOf(currentId);
              if (start !== -1 && end !== -1) {
                const [from, to] = start <= end ? [start, end] : [end, start];
                const rangeIds = ids.slice(from, to + 1);
                const next = new Set(selectedIds);
                const target = !selectedIds.includes(currentId);
                rangeIds.forEach(id => target ? next.add(id) : next.delete(id));
                setSelectedIds(Array.from(next));
                e.preventDefault();
                e.stopPropagation();
              }
            }
          }}
          onClick={(e) => { e.stopPropagation(); setLastClickedId(String(row.id)); }}
          className="rounded border-gray-300"
        />
      )
    }),

    columnHelper.accessor(row => ([row.lastName ?? '', row.firstName ?? ''].join(' ')).toLowerCase(), {
      id: 'kunde',
      header: 'Kunde',
      size: 260,
      cell: ({ row }) => (
        <div className="text-left leading-tight">
          <div className="flex items-center gap-2">
            <button
              className="font-medium underline-offset-2 hover:underline"
              onClick={() => setInfoDialog({ isOpen: true, client: row.original })}
              title="Details anzeigen"
            >
              {(() => {
                const lname = row.original.lastName || '';
                const fname = row.original.firstName || '';
                const nm = [lname, fname].filter(Boolean).join(', ');
                return nm || row.original.amsId || row.original.email || '—';
              })()}
            </button>
            {row.original?.gender === 'M' && (
              <span className="text-blue-600 font-bold text-lg" title="Männlich">♂</span>
            )}
            {row.original?.gender === 'F' && (
              <span className="text-pink-600 font-bold text-lg" title="Weiblich">♀</span>
            )}
            <button type="button" aria-label="Notiz öffnen" className="p-1" onClick={() => setContactDialog({ client: row.original, isOpen: true })}>
              <StickyNote size={16} />
            </button>
            {row.original?.note && String(row.original?.note).trim().length > 0 ? (
              <Badge variant="default" size="sm" className="ml-1" title="Notiz vorhanden">
                1
              </Badge>
            ) : null}
          </div>
          {(row.original.phone || row.original.phoneNumber || row.original.areaCode || row.original.countryCode) && (
            <div className="text-xs text-gray-600 mt-1">
              <span className="text-gray-500"></span>{' '}
              {formatPhoneForDisplay(row.original) || (row.original.phone ?? '')}
            </div>
          )}
        </div>
      )
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 150,
      cell: ({ row }) => (
        <Can perm="update_status">
          <StatusChip value={row.original.status} onChange={(status) => handleFieldUpdate(row.original, { status })} />
        </Can>
      )
    }),
    columnHelper.accessor('result', {
      header: 'Ergebnis',
      size: 150,
      cell: ({ row }) => (
        <Can perm="update_status">
          <ResultChip value={row.original.result} onChange={(result) => handleFieldUpdate(row.original, { result })} />
        </Can>
      )
    }),
    columnHelper.accessor(row => (row.contactLog?.length ?? 0), { id: 'contactCount',
      header: 'Kontaktversuche',
      size: 100,
   
      cell: ({ row }) => {
        const log = Array.isArray(row?.original?.contactLog) ? row.original.contactLog : [];
        const norm = (ch) => {
          const v = String(ch || '').toLowerCase();
          if (v.includes('tel')) return 'telefon';
          if (v.includes('sms') || v.includes('text')) return 'sms';
          if (v.includes('mail')) return 'email';
          if (v.includes('dritt') || v.includes('third') || v.includes('andere') || v.includes('person')) return 'dritt';
          return 'other';
        };
        const count = (key) => log.filter((e) => norm(e?.channel) === key).length;
        const IconBadge = ({ children, n, label, onClick }) => (
          <button
            type="button"
            onClick={onClick}
            title={`${label}${n > 0 ? `: ${n}` : ''}`}
            className="relative inline-flex items-center mr-3 text-gray-800 hover:text-gray-900"
            style={{ display:'inline-flex', alignItems:'center' }}
          >
            {children}
            {n > 0 && (
              <span style={{ position:'absolute', right:-8, top:-6, fontSize:10, padding:'0px 4px',
                             border:'1px solid #9CA3AF', borderRadius:10, background:'#F3F4F6', lineHeight:'14px', minWidth:14, textAlign:'center' }}>
                {n}
              </span>
            )}
          </button>
        );
        const openContactDialog = () => setContactDialog({ isOpen: true, client: row.original });
        return (
          <div className="flex items-center">
            <IconBadge n={count('telefon')} label="Telefon" onClick={openContactDialog}><Phone size={18} /></IconBadge>
            <IconBadge n={count('sms')} label="SMS" onClick={openContactDialog}><MessageSquare size={18} /></IconBadge>
            <IconBadge n={count('email')} label="E-Mail" onClick={openContactDialog}><Mail size={18} /></IconBadge>
            <IconBadge n={count('dritt')} label="Andere Person" onClick={openContactDialog}><User size={18} /></IconBadge>
          </div>
        );
      },
    
}),

    columnHelper.accessor('followUp', {
      header: 'Termin',
      size: 120,
      sortingFn: (a,b) => {
        const va = a.original.followUp ? new Date(a.original.followUp).getTime() : 0;
        const vb = b.original.followUp ? new Date(b.original.followUp).getTime() : 0;
        return va - vb;
      },
      cell: ({ row }) => (
        <Can perm="edit_followup">
          <FollowupPicker value={ formatDDMMYYYY(row.original.followUp) } onChange={(date) => handleFieldUpdate(row.original, { followUp: date, ...(date ? { result: 'terminFixiert' } : {}) })} />
        </Can>
      )
    }),

    columnHelper.accessor('assignedTo', {
      header: 'Zuständigkeit',
      size: 150,
      sortingFn: (a,b) => {
        const name = (id?: string) => (users.find(u => u.id === (id||''))?.name || '').toLowerCase();
        return name(a.original.assignedTo).localeCompare(name(b.original.assignedTo), 'de', { sensitivity: 'base' });
      },
      cell: ({ row }) => (
        <Can perm="assign">
          <AssignDropdown value={row.original.assignedTo} onChange={(userId) => handleFieldUpdate(row.original, { assignedTo: userId })} users={users} />
        </Can>
      )
    }),
    
    columnHelper.accessor('note', {
      header: 'Anmerkung',
      size: 220,
      sortingFn: (a,b) => {
        const va = (a.original.note || '').toLowerCase();
        const vb = (b.original.note || '').toLowerCase();
        return va.localeCompare(vb);
      },
      cell: ({ row }) => {
        const text = row.original.note || '';
        if (!text) return <span className="text-gray-400">-</span>;
        return (
          <span
            title={text}
            style={{ display: 'inline-block', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {text}
          </span>
        );
      }
    }),


    columnHelper.accessor('amsBookingDate', {
      header: 'Zubuchung',
      size: 160,
      sortingFn: (a,b) => {
        const va = a.original.amsBookingDate ? new Date(a.original.amsBookingDate).getTime() : 0;
        const vb = b.original.amsBookingDate ? new Date(b.original.amsBookingDate).getTime() : 0;
        return va - vb;},
      cell: ({ row }) => (
        <span className="text-sm">{ formatDDMMYYYY(row.original.amsBookingDate ?? '—') }</span>
      )
    }),


    columnHelper.accessor('priority', {
      header: "Priorität",
      size: 100,
      sortingFn: (a,b) => {
        const w = (p?: string) => p==='hoch'?2 : p==='normal'?1 : 0;
        return w(a.original.priority) - w(b.original.priority);
      },
      cell: ({ row }) => (
        <Can perm="update_status">
          <button
            onClick={() => {
              const newPriority = cyclePriority(row.original.priority);
              handleFieldUpdate(row.original, { priority: newPriority });
            }}
            className="cursor-pointer hover:opacity-80"
          >

            {/* Visual-only Ampelpunkt; Wechsel per Button-Click */}
            <span
              className="rounded-full"
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: 9999,
                border: '1px solid rgba(0,0,0,0.05)',
                backgroundColor: (() => {
                  const v = String(row.original.priority ?? '').toLowerCase().trim();
                  if (v.startsWith('dring')) return '#EF4444';   // rot
                  if (v.startsWith('hoch') || v.startsWith('mittel')) return '#F59E0B'; // gelb
                  return '#9CA3AF';                              // grau
                })()
              }}
            />
            <span className="sr-only">{`Priorität: ${row.original.priority}`}</span></button>
        </Can>
      )
    }),

    columnHelper.accessor('lastActivity', {
      header: 'Aktivität',
      size: 120,
      cell: ({ row }) => {
        if (!row.original.lastActivity) return <span className="text-gray-400">-</span>;
        const date = new Date(row.original.lastActivity);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return <span className="text-sm">heute</span>;
        if (diffDays === 1) return <span className="text-sm">gestern</span>;
        return <span className="text-sm text-gray-600">vor {diffDays} Tagen</span>;
      }
    }),

    columnHelper.display({
      id: 'actions',
      size: 100,
      cell: ({ row }) => (
        <Can perm="update_status">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (row.original.isArchived) {
                  handleFieldUpdate(row.original, { isArchived: false, archivedAt: undefined });
                } else {
                  handleFieldUpdate(row.original, { isArchived: true, archivedAt: nowISO() });
                }
              }}
              className="text-xs"
            >
              {row.original.isArchived ? 'Entarchivieren' : 'Archivieren'}
            </Button>
          </div>
        </Can>
      )
    })
  ], [users, handleFieldUpdate, cyclePriority]);

  // Effektive Clients inkl. Optimistic-Puffer
  const viewClients = useMemo(() => {
    let base = clients ?? [];
    let arr = base.map(c => {
      const p = pendingPatches.get(c.id);
      return p ? ({ ...c, ...p }) : c;
    });
    if (pendingRemovals.size > 0) arr = arr.filter(c => !pendingRemovals.has(c.id));
    return arr;
  }, [clients, pendingPatches, pendingRemovals]);

  const [sorting, setSorting] = useState([] as any);
  const table = useReactTable({
    data: useMemo(() => (viewClients ?? []).map(normalizeClientView), [viewClients]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      rowSelection: selectedIds.reduce((acc, id) => ({ ...acc, [id]: true }), {} as Record<string, boolean>)
    },
    onSortingChange: setSorting,
    getRowId: (r) => String((r as any).id ?? (r as any).amsId ?? (r as any).rowKey),
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      // Wichtig: dem Updater den *aktuellen* RowSelection-Status geben (nicht {}),
      // sonst wird immer nur die zuletzt geklickte Zeile selektiert.
      const current = selectedIds.reduce((acc, id) => {
        (acc as any)[id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      const next = typeof updater === 'function' ? updater(current) : updater;
      const newIds = Object.keys(next).filter(id => (next as any)[id]);
      setSelectedIds(newIds);
    },
    });
  useEffect(() => {
    try { table.getColumn('lastActivity')?.toggleVisibility(false); } catch {}
  }, [table]);


  /** Virtualisierung (optional) */
  const ROW_HEIGHT = 44;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(600);
  const totalRows = table.getRowModel().rows.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const visibleCount = Math.ceil(containerH / ROW_HEIGHT) + 10;
  const endIndex = Math.min(totalRows, startIndex + visibleCount);
  const visibleRows = table.getRowModel().rows.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);

  // Leistungsmodus (Virtualisierung)
  const [virtOn, setVirtOn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('board:virtOn');
      if (saved != null) return saved === '1';
    } catch {}
    return totalRows > 1500;
  });
  useEffect(() => {
    try { localStorage.setItem('board:virtOn', virtOn ? '1' : '0'); } catch {}
  }, [virtOn]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const onResize = () => setContainerH(el.clientHeight || 600);
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    onResize();
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Keyboard-Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!document.activeElement?.closest('[data-board]')) return;
      switch (e.key.toLowerCase()) {
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) handleRedo(); else handleUndo();
          }
          break;
        case 'escape':
          e.preventDefault();
          setSelectedIds([]);
          setContactDialog({ isOpen: false });
          break;
        case 'a':
          e.preventDefault();
          const firstSelected = clients.find(c => selectedIds.includes(c.id));
          if (firstSelected) setContactDialog({ isOpen: true, client: firstSelected });
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clients, selectedIds, handleRedo, handleUndo, setSelectedIds]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Kanban Board</h2>
        <div className="text-center py-8 text-gray-500">Lade Daten...</div>
      </div>
    );
  }

  const canDelete = selectedIds.length > 0 && clients
    .filter(c => selectedIds.includes(c.id))
    .every(c => (c.contactLog?.length ?? 0) === 0 && !c.assignedTo);

  return (
    <div className="space-y-6" data-board>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Kanban Board</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {counts.filtered} von {counts.total}
            {counts.archived > 0 && ` (${counts.archived} archiviert)`}
          </div>
        </div>
      </div>

      {/* Filter-Chips */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter
              </div>
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* User-Auswahl */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <select
                  value={view.filters.currentUserId}
                  onChange={(e) => setCurrentUser(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {users.filter(u => u.active).map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {/* Leistungsmodus (Virtualisierung) */}
              <label className="flex items-center gap-2 text-sm select-none">
                <input type="checkbox" checked={virtOn} onChange={(e) => setVirtOn(e.target.checked)} />
                Leistungsmodus
              </label>

              {/* Sortierung */}
              <div className="flex items-center gap-2">
                <SortDesc className="w-4 h-4 text-gray-500" />
                <select
                  value={view.sort.mode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {Object.entries(sortModeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Archiv-Toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={view.filters.showArchived}
                  onChange={toggleArchived}
                  className="rounded border-gray-300"
                />
                <Archive className="w-4 h-4" />
                Archiv
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <></>
        </CardContent>
      </Card>

      {/* Batch-Aktionen */}
      <BatchBar
        selectedCount={selectedIds.length}
        users={users}
        onClearSelection={() => setSelectedIds([])}
        onBatchAssign={(userId) => handleBatchAction('assign', userId)}
        onBatchStatus={(status) => handleBatchAction('status', status)}
        onBatchResult={(result) => handleBatchAction('result', result)}
        onBatchFollowup={(date) => handleBatchAction('followup', date)}
        onBatchArchive={() => handleBatchAction('archive')}
        onBatchUnarchive={() => handleBatchAction('unarchive')}
        onBatchDelete={() => handleBatchAction('delete')}
        canDelete={canDelete}
        showArchived={view.filters.showArchived}
      />

      {/* Undo-Toast */}
      {undoAction && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <span className="text-sm">Änderung durchgeführt</span>
          <Button variant="ghost" size="sm" onClick={handleUndo} className="text-white hover:bg-gray-700 text-xs">
            Rückgängig
          </Button>
          <button
            onClick={handleRedo}
            className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 bg-white text-gray-900"
          >
            Wiederholen
          </button>
        </div>
      )}

      {/* Tabelle */}
      {clients.length === 0 ? (
        <Empty
          title="Keine Klient:innen gefunden"
          description="Keine Datensätze entsprechen den aktuellen Filterkriterien."
          icon={<Trello className="w-12 h-12 text-gray-300" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div ref={scrollRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                            className={"px-4 py-3 text-left text-sm font-medium " + (header.column.getCanSort() ? "text-blue-700 cursor-pointer select-none" : "text-gray-700")}
                            style={{ width: header.getSize() }}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === "asc" && <span>▲</span>}
                              {header.column.getIsSorted() === "desc" && <span>▼</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {virtOn && topPad > 0 && (
                      <tr><td colSpan={columns.length} style={{ height: topPad }} /></tr>
                    )}
                    {(virtOn ? visibleRows : table.getRowModel().rows).map(row => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-4 py-3 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {virtOn && bottomPad > 0 && (
                      <tr><td colSpan={columns.length} style={{ height: bottomPad }} /></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      
      <ClientInfoDialog isOpen={infoDialog.isOpen} client={infoDialog.client} onClose={() => setInfoDialog({ isOpen: false, client: null })} />
{/* Kontakt-Dialog */}
      <ContactDialog
        isOpen={contactDialog.isOpen}
        onClose={() => setContactDialog({ isOpen: false })}
        onConfirm={(channel, note) => {
          if (contactDialog.client) handleAddContact(contactDialog.client, channel, note);
          setContactDialog({ isOpen: false });
        }}
        clientName={contactDialog.client ? `${contactDialog.client.firstName} ${contactDialog.client.lastName}` : ''}
        currentStatus={contactDialog.client?.status || ''}
      />
    </div>
  );
}
