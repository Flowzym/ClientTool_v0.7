import React from 'react';
import NameCell from './cells/NameCell';
import FollowupCell from './cells/FollowupCell';
import AdvisorCell from './cells/AdvisorCell';
import StatusCell from './cells/StatusCell';
import OfferCell from './cells/OfferCell';
import PinCell from './cells/PinCell';

type Actions = {
  update: (id: string, changes: any) => Promise<void> | void;
  setOffer?: (id: string, v?: string) => Promise<void> | void;
  setFollowup?: (id: string, date?: string) => Promise<void> | void;
  togglePin?: (id: string) => Promise<void> | void;
};

export function ClientRow({ client, actions }: { client: any; actions: Actions }) {
  const { id } = client ?? {};

  return (
    <div className="grid grid-cols-[minmax(240px,1fr)_120px_140px_180px_160px_80px] gap-2 items-center px-3 py-2 hover:bg-gray-50">
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
        onOpenNotes={() => {}}
      />

      <OfferCell
        id={id}
        value={client.angebot}
        onChange={(v?: string) => (actions.setOffer ? actions.setOffer(id, v) : actions.update(id, { angebot: v }))}
      />

      <StatusCell id={id} value={client.status} />

      <FollowupCell id={id} followUp={client.followUp} onChange={(d?: string) => (actions.setFollowup ? actions.setFollowup(id, d) : actions.update(id, { followUp: d }))} />

      <AdvisorCell
        id={id}
        amsAdvisor={client.amsAdvisor}
        amsAgentFirstName={client.amsAgentFirstName}
        amsAgentLastName={client.amsAgentLastName}
      />

      <PinCell id={id} pinned={!!client.isPinned} onToggle={() => (actions.togglePin ? actions.togglePin(id) : actions.update(id, { isPinned: !client.isPinned }))} />
    </div>
  );
}
