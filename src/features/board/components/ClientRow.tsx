import React from 'react';
import { createCounter } from '../../../lib/perf/counter';
import { Pin } from 'lucide-react';
import NameCell from './cells/NameCell';
import OfferCell from './cells/OfferCell';
import StatusCell from './cells/StatusCell';
import ResultCell from './cells/ResultCell';
import FollowupCell from './cells/FollowupCell';
import AssignCell from './cells/AssignCell';
import ContactAttemptsCell from './cells/ContactAttemptsCell';
import NoteTextCell from './cells/NoteTextCell';
import BookingDateCell from './cells/BookingDateCell';
import PriorityCell from './cells/PriorityCell';
import ActivityCell from './cells/ActivityCell';
import ArchiveCell from './cells/ArchiveCell';

// Performance counter for row mounts (Dev-only)
const rowMountCounter = createCounter('rowMounts');

type Actions = {
  update: (id: string, changes: any) => Promise<void> | void;
  bulkUpdate: (ids: string[], changes: any) => Promise<void> | void;
  setOffer?: (id: string, v?: string) => Promise<void> | void;
  setFollowup?: (id: string, date?: string) => Promise<void> | void;
  setAssignedTo?: (id: string, userId?: string) => Promise<void> | void;
  setStatus?: (id: string, status?: string) => Promise<void> | void;
  setResult?: (id: string, result?: string) => Promise<void> | void;
  cyclePriority?: (id: string, current?: string | null) => Promise<void> | void;
  addContactAttempt?: (id: string, channel: 'phone'|'sms'|'email'|'proxy', current?: { phone?: number; sms?: number; email?: number; proxy?: number }) => Promise<void> | void;
  archive?: (id: string) => Promise<void> | void;
  unarchive?: (id: string) => Promise<void> | void;
  togglePin?: (id: string) => Promise<void> | void;
};

export function ClientRow({
  client, users, actions, visibleColumns, selected, onToggleSelect,
  onTogglePin
}: {
  client: any;
  users: any[];
  actions: Actions;
  visibleColumns?: any[];
  selected?: boolean;
  onToggleSelect?: (withShift: boolean) => void;
  onTogglePin?: (event?: React.MouseEvent) => void;
}) {
  const { id } = client ?? {};

  // Track row mounts for performance analysis
  React.useEffect(() => {
    rowMountCounter.inc();
    return () => {
      // Could track unmounts if needed
    };
  }, []);

  const phone = client.contactPhone || 0;
  const sms = client.contactSms || 0;
  const email = client.contactEmail || 0;
  const proxy = client.contactProxy || 0;

  const onOpenNotes = (cid: string) => {
    // Bind an vorhandenen Dialog via CustomEvent
    window.dispatchEvent(new CustomEvent('board:open-notes', { detail: { id: cid } }));
  };

  const onOpenClient = (cid: string) => {
    // Trigger ClientInfoDialog via CustomEvent
    window.dispatchEvent(new CustomEvent('board:open-client-info', { detail: { id: cid } }));
  };
  
  // Generate dynamic grid template for this row
  const rowGridTemplate = React.useMemo(() => {
    if (!visibleColumns) {
      // Fallback to original fixed layout
      return 'grid-cols-[64px_minmax(240px,1fr)_120px_140px_140px_160px_160px_160px_240px_120px_100px_120px_120px]';
    }
    
    const baseColumns = ['64px']; // Selection + Pin column
    
    visibleColumns.forEach(col => {
      const width = col.minWidth ? `${col.minWidth}px` : '120px';
      baseColumns.push(width);
    });
    
    return `grid-cols-[${baseColumns.join('_')}]`;
  }, [visibleColumns]);
  
  // Cell mapping based on column key
  const renderCell = (column: any) => {
    switch (column.key) {
      case 'name':
        return (
          <NameCell
            client={{
              id,
              firstName: client.firstName,
              lastName: client.lastName,
              title: client.title,
              notes: client.notes,
              contactLog: client.contactLog,
              note: client.note,
            }}
            onOpenNotes={onOpenNotes}
            onOpenClient={onOpenClient}
          />
        );
      case 'offer':
        return <OfferCell id={id} value={client.angebot} />;
      case 'status':
        return <StatusCell id={id} value={client.status} onChange={(s?: string) => actions.setStatus?.(id, s)} />;
      case 'result':
        return <ResultCell id={id} value={client.result} onChange={(r?: string) => actions.setResult?.(id, r)} />;
      case 'followUp':
        return (
          <FollowupCell 
            id={id} 
            followUp={client.followUp} 
            onChange={(d?: string) => {
              const changes = { 
                followUp: d ?? null,
                status: d ? 'terminVereinbart' : 'offen'
              };
              actions.update(id, changes);
            }} 
          />
        );
      case 'assignedTo':
        return <AssignCell id={id} value={client.assignedTo} users={users} onChange={(u?: string) => actions.setAssignedTo?.(id, u)} />;
      case 'contacts':
        return (
          <ContactAttemptsCell
            id={id}
            phone={phone}
            sms={sms}
            email={email}
            proxy={proxy}
            onAdd={(ch, counts) => actions.addContactAttempt?.(id, ch, counts)}
          />
        );
      case 'notes':
        return <NoteTextCell id={id} text={client.note} />;
      case 'booking':
        return <BookingDateCell id={id} value={client.amsBookingDate} />;
      case 'priority':
        return <PriorityCell id={id} value={client.priority} onCycle={() => actions.cyclePriority?.(id, client.priority)} />;
      case 'activity':
        return <ActivityCell value={client.lastActivity} />;
      case 'actions':
        return <ArchiveCell id={id} isArchived={!!client.isArchived} onArchive={() => actions.archive?.(id)} onUnarchive={() => actions.unarchive?.(id)} />;
      default:
        return <div className="text-sm text-gray-500">—</div>;
    }
  };
  
  return (
    <div className={`grid gap-2 items-center px-3 py-2 hover:bg-gray-50 ${rowGridTemplate}`}>
      {/* Auswahl + Pin */}
      <div className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={!!selected}
          onClick={(e) => onToggleSelect?.((e as React.MouseEvent<HTMLInputElement>).shiftKey)}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Spacebar') {
              e.preventDefault();
              onToggleSelect?.(e.shiftKey);
            }
          }}
          onChange={() => {}}
          onTogglePin={onTogglePin}
        />
        <button
          className={`p-1 rounded hover:bg-gray-50 ${client.isPinned ? 'text-blue-600' : 'text-gray-400'}`}
          title="Pin toggeln"
          onClick={(event) => onTogglePin?.(event)}
        >
          <Pin size={14} />
        </button>
      </div>

      {/* Render only visible columns */}
      {visibleColumns ? visibleColumns.map(column => (
        <div key={column.key}>
          {renderCell(column)}
        </div>
      )) : (
        // Fallback: render all columns if visibleColumns not provided
        <>
          <NameCell
            client={{
              id,
              firstName: client.firstName,
              lastName: client.lastName,
              title: client.title,
              notes: client.notes,
              contactLog: client.contactLog,
              note: client.note,
            }}
            onOpenNotes={onOpenNotes}
            onOpenClient={onOpenClient}
          />
          <OfferCell id={id} value={client.angebot} />
          <StatusCell id={id} value={client.status} onChange={(s?: string) => actions.setStatus?.(id, s)} />
          <ResultCell id={id} value={client.result} onChange={(r?: string) => actions.setResult?.(id, r)} />
          <FollowupCell id={id} followUp={client.followUp} onChange={(d?: string) => {
              const changes = { 
                followUp: d ?? null,
                status: d ? 'terminVereinbart' : 'offen'
              };
              actions.update(id, changes);
            }} />
          <AssignCell id={id} value={client.assignedTo} users={users} onChange={(u?: string) => actions.setAssignedTo?.(id, u)} />
          <ContactAttemptsCell
            id={id}
            phone={phone}
            sms={sms}
            email={email}
            proxy={proxy}
            onAdd={(ch, counts) => actions.addContactAttempt?.(id, ch, counts)}
          />
          <NoteTextCell id={id} text={client.note} />
          <BookingDateCell id={id} value={client.amsBookingDate} />
          <PriorityCell id={id} value={client.priority} onCycle={() => actions.cyclePriority?.(id, client.priority)} />
          <ActivityCell value={client.lastActivity} />
          <ArchiveCell id={id} isArchived={!!client.isArchived} onArchive={() => actions.archive?.(id)} onUnarchive={() => actions.unarchive?.(id)} />
        </>
      )}
    </div>
  );
}

export default ClientRow;