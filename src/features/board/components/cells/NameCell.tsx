import React from 'react';
import { PencilLine } from 'lucide-react';
import { countNotes } from '../../utils/notes';

type Props = {
  client: {
    id: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    notes?: any[];
    contactLog?: any[];
    note?: string;
  };
  onOpenNotes?: (id: string) => void;
};

/**
 * NameCell ohne Geschlechtersymbole.
 * Notiz-Icon: immer PencilLine; Badge mit echter Anzahl über countNotes(...).
 * Namensformat: "Nachname, Vorname (Titel)" – Titel nur wenn vorhanden.
 */
export default function NameCell({ client, onOpenNotes }: Props) {
  const { id, firstName, lastName, title } = client;
  const count = countNotes(client);

  const nameParts = [lastName, firstName].filter(Boolean);
  const main = nameParts.join(', ');
  const titlePart = title ? ` (${title})` : '';

  return (
    <div className="flex items-center gap-2">
      <button
        className="relative inline-flex items-center justify-center w-7 h-7 rounded border border-gray-300 hover:bg-gray-50"
        title={count > 0 ? `${count} Notizen` : 'Notizen'}
        onClick={() => onOpenNotes?.(id)}
      >
        <PencilLine className={`w-4 h-4 ${count === 0 ? 'text-gray-400' : 'text-gray-700'}`} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </button>
      <div className="truncate">
        <div className="font-medium text-sm truncate">{main}{titlePart}</div>
      </div>
    </div>
  );
}
