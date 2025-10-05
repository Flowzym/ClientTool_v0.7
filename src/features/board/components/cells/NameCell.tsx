import React from 'react';
import { PencilLine } from 'lucide-react';

function countNotes(client: any): number {
  // 1) notes array
  if (Array.isArray(client?.notes)) return client.notes.length;
  // 2) contactLog entries with type/kind === 'note'
  if (Array.isArray(client?.contactLog)) {
    const n = client.contactLog.filter((e:any) => {
      if (!e) return false;
      const hasNoteType = e?.type === 'note' || e?.kind === 'note';
      const hasText = e?.text && String(e.text).trim().length > 0;
      return hasNoteType && hasText;
    }).length;
    if (n > 0) return n;
  }
  // 3) fallback: note text
  if (client?.note && String(client.note).trim().length > 0) return 1;
  return 0;
}

export default function NameCell({
  client,
  onOpenNotes,
  onOpenClient
}: {
  client: any;
  onOpenNotes: (id: string) => void;
  onOpenClient: (id: string) => void;
}) {
  const lastName = client?.lastName || '';
  const firstName = client?.firstName || '';
  const title = client?.title ? ` (${client.title})` : '';

  // Telefonnummer: phone-Feld wird beim Import bereits kombiniert
  // Fallback: Wenn Einzelkomponenten vorhanden, kombiniere diese
  const phone = (() => {
    // Primär: phone-Feld (wird beim Import aus countryCode/areaCode/phoneNumber kombiniert)
    if (client?.phone) return client.phone;

    // Fallback 1: Legacy phoneNumber-Feld
    if (client?.phoneNumber && !client?.countryCode && !client?.areaCode) {
      return client.phoneNumber;
    }

    // Fallback 2: Kombiniere aus Einzelteilen (falls phone nicht gesetzt wurde)
    const parts: string[] = [];
    if (client?.countryCode) {
      const cc = String(client.countryCode).trim();
      parts.push(cc.startsWith('+') ? `(${cc})` : `(+${cc})`);
    }
    if (client?.areaCode) parts.push(String(client.areaCode).trim());
    if (client?.phoneNumber) parts.push(String(client.phoneNumber).trim());

    return parts.length > 0 ? parts.join(' ') : '—';
  })();
  
  // Format: "Nachname, Vorname (Titel)"
  const nameDisplay = lastName && firstName 
    ? `${lastName}, ${firstName}${title}`
    : lastName || firstName || '—';
  
  const count = countNotes(client);
  const muted = count === 0;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          className={`p-1 rounded hover:bg-gray-50 ${muted ? 'text-gray-400' : 'text-gray-700'}`}
          title="Notizen öffnen"
          onClick={() => onOpenNotes(client?.id)}
          aria-label="Notizen öffnen"
        >
          <PencilLine size={16} />
        </button>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 text-[10px] leading-[16px] text-gray-800 bg-white border border-gray-300 rounded-full text-center">
            {count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <button
          className="text-left w-full hover:text-blue-600 transition-colors"
          onClick={() => onOpenClient(client?.id)}
          aria-label={`Kundeninfo für ${nameDisplay} öffnen`}
        >
          <div className="font-medium truncate">{nameDisplay}</div>
          <div className="text-xs text-gray-500 truncate">{phone}</div>
        </button>
      </div>
    </div>
  );
}