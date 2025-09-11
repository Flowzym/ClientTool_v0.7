import React from "react";
import { countNotes } from "../../utils/notes";

type ClientName = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  notes?: any[];
  contactLog?: any[];
  note?: string | null;
};
type Props = { client: ClientName; onOpenNotes?: (id: string) => void };

export default function NameCell({ client, onOpenNotes }: Props) {
  const name = [
    (client.lastName ?? "").trim(),
    (client.firstName ?? "").trim(),
  ].filter(Boolean).join(", ");
  const title = (client.title ?? "").trim();
  const display = title ? `${name} (${title})` : name || "-";
  const noteCount = countNotes(client);

  return (
    <div className="relative flex items-center gap-2">
      <span className="truncate max-w-[260px]">{display}</span>
      <button
        className={`p-1 rounded hover:bg-muted ${noteCount ? "" : "opacity-60"}`}
        onClick={() => onOpenNotes?.(client.id)}
        title={noteCount ? `${noteCount} Notizen` : "Keine Notizen"}
      >
        ✎
      </button>
      {noteCount > 0 && (
        <span className="absolute -top-1 -right-1 text-[10px] px-1 rounded bg-gray-800 text-white">
          {noteCount}
        </span>
      )}
    </div>
  );
}
