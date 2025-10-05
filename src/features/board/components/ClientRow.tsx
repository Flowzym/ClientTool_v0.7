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
import { formatPhoneNumber } from '../utils/phone';

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
  client, users, actions, visibleColumns, gridTemplate, selected, onToggleSelect,
  onTogglePin
}: {
  client: any;
  users: any[];
  actions: Actions;
  visibleColumns?: any[];
  gridTemplate?: string;
  selected?: boolean;
  onToggleSelect?: (withShift: boolean) => void;
  onTogglePin?: (event?: React.MouseEvent) => void;
}) {
  const { id } = client ?? {};

  // Track row mounts for performance analysis
  React.useEffect(() => {
    rowMountCounter.inc();
  }, []);

  // Error-State Detection
  const hasDecodeError = client._decodeError === true;

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

  //Fallback to hardcoded layout if grid Template is not provided
  const defaultGridTemplate = 'grid-cols-[64px_minmax(240px,1fr)_120px_140px_140px_160px_160px_160px_240px_120px_100px_120px_120px]';

  return (
    <div
      className={`grid gap-2 items-center px-3 py-2 hover:bg-gray-50 ${!gridTemplate ? defaultGridTemplate : ''} ${selected ? 'bg-blue-50' : ''} ${hasDecodeError ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
      style={gridTemplate ? { gridTemplateColumns: gridTemplate } : undefined}
    >
      {/* Error-Icon bei Decode-Fehler */}
      {hasDecodeError && (
        <div className="col-span-full text-xs text-red-600 px-2 py-1 bg-red-100 rounded">
          ⚠️ Entschlüsselungsfehler: {client._errorMessage || 'Daten konnten nicht geladen werden'}
        </div>
      )}
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

      {/* Dynamic column layout */}
      {visibleColumns && visibleColumns.length > 0 ? (
        // Render only visible columns
        visibleColumns.map((col) => {
          const key = col.key;

          switch (key) {
            case 'name':
              return (
                <NameCell
                  key={key}
                  client={{
                    id,
                    firstName: client.firstName,
                    lastName: client.lastName,
                    title: client.title,
                    notes: client.notes,
                    contactLog: client.contactLog,
                    note: client.note,
                    phone: client.phone,
                    countryCode: client.countryCode,
                    areaCode: client.areaCode,
                    phoneNumber: client.phoneNumber,
                  }}
                  onOpenNotes={onOpenNotes}
                  onOpenClient={onOpenClient}
                />
              );
            case 'offer':
              return <OfferCell key={key} id={id} value={client.angebot} />;
            case 'status':
              return <StatusCell key={key} id={id} value={client.status} onChange={(s?: string) => actions.setStatus?.(id, s)} />;
            case 'result':
              return <ResultCell key={key} id={id} value={client.result} onChange={(r?: string) => actions.setResult?.(id, r)} />;
            case 'followUp':
              return (
                <FollowupCell
                  key={key}
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
              return <AssignCell key={key} id={id} value={client.assignedTo} users={users} onChange={(u?: string) => actions.setAssignedTo?.(id, u)} />;
            case 'contacts':
              return (
                <ContactAttemptsCell
                  key={key}
                  id={id}
                  phone={phone}
                  sms={sms}
                  email={email}
                  proxy={proxy}
                  onAdd={(ch, counts) => actions.addContactAttempt?.(id, ch, counts)}
                />
              );
            case 'notes':
              return <NoteTextCell key={key} id={id} text={client.note} />;
            case 'booking':
              return <BookingDateCell key={key} id={id} value={client.amsBookingDate} />;
            case 'priority':
              return <PriorityCell key={key} id={id} value={client.priority} onCycle={() => actions.cyclePriority?.(id, client.priority)} />;
            case 'activity':
              return <ActivityCell key={key} value={client.lastActivity} />;
            case 'actions':
              return <ArchiveCell key={key} id={id} isArchived={!!client.isArchived} onArchive={() => actions.archive?.(id)} onUnarchive={() => actions.unarchive?.(id)} />;

            // Neue Felder (ohne eigene Cell-Komponenten)
            case 'title':
              return <div key={key} className="text-sm text-gray-700">{client.title || '—'}</div>;
            case 'firstName':
              return <div key={key} className="text-sm text-gray-700">{client.firstName || '—'}</div>;
            case 'lastName':
              return <div key={key} className="text-sm text-gray-700">{client.lastName || '—'}</div>;
            case 'gender':
              return <div key={key} className="text-sm text-gray-700">{client.gender || '—'}</div>;
            case 'svNumber':
              return <div key={key} className="text-sm text-gray-700">{client.svNumber || '—'}</div>;
            case 'birthDate':
              return <div key={key} className="text-sm text-gray-700">{client.birthDate || '—'}</div>;
            case 'postalCode':
              // Support both import field name (zip) and board field name (postalCode)
              return <div key={key} className="text-sm text-gray-700">{client.zip || client.postalCode || '—'}</div>;
            case 'city':
              return <div key={key} className="text-sm text-gray-700">{client.city || '—'}</div>;
            case 'street':
              // Support both import field name (address) and board field name (street)
              return <div key={key} className="text-sm text-gray-700">{client.address || client.street || '—'}</div>;
            case 'phone':
              return <div key={key} className="text-sm text-gray-700">{formatPhoneNumber(client)}</div>;
            case 'email':
              return <div key={key} className="text-sm text-gray-700">{client.email || '—'}</div>;
            case 'bookingStatus':
              return <div key={key} className="text-sm text-gray-700">{client.bookingStatus || '—'}</div>;
            case 'planned':
              return <div key={key} className="text-sm text-gray-700">{client.planned || '—'}</div>;
            case 'entryDate':
              return <div key={key} className="text-sm text-gray-700">{client.entryDate || '—'}</div>;
            case 'exitDate':
              return <div key={key} className="text-sm text-gray-700">{client.exitDate || '—'}</div>;
            case 'rgs':
              // Support both import field name (internalCode) and board field name (rgs)
              return <div key={key} className="text-sm text-gray-700">{client.internalCode || client.rgs || '—'}</div>;
            case 'advisorTitle':
              return <div key={key} className="text-sm text-gray-700">{client.amsAgentTitle || '—'}</div>;
            case 'advisorFirstName':
              return <div key={key} className="text-sm text-gray-700">{client.amsAgentFirstName || '—'}</div>;
            case 'advisorLastName':
              return <div key={key} className="text-sm text-gray-700">{client.amsAgentLastName || '—'}</div>;
            case 'measureNumber':
              return <div key={key} className="text-sm text-gray-700">{client.measureNumber || '—'}</div>;
            case 'eventNumber':
              return <div key={key} className="text-sm text-gray-700">{client.eventNumber || '—'}</div>;

            // Additional Import fields
            case 'countryDial':
              return <div key={key} className="text-sm text-gray-700">{client.countryCode || '—'}</div>;
            case 'areaDial':
              return <div key={key} className="text-sm text-gray-700">{client.areaCode || '—'}</div>;

            // Computed columns
            case 'advisorFull':
              if (col.computed && typeof col.computed === 'function') {
                const value = col.computed(client);
                return <div key={key} className="text-sm text-gray-700">{value || '—'}</div>;
              }
              return <div key={key} className="text-sm text-gray-700">—</div>;
            case 'phoneCombined':
              if (col.computed && typeof col.computed === 'function') {
                const value = col.computed(client);
                return <div key={key} className="text-sm text-gray-700">{value || '—'}</div>;
              }
              return <div key={key} className="text-sm text-gray-700">—</div>;

            default:
              return <div key={key} className="text-sm text-gray-500">—</div>;
          }
        })
      ) : (
        // Fallback: Render all default columns if visibleColumns is not provided
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