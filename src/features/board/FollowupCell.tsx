import React from "react";
import { useBoardActions } from "../../hooks/useBoardActions";
import { formatDDMMYYYY, isValidISO } from "../../utils/date";

type Props = {
  id: string;
  followUp?: string | null;
};

export default function FollowupCell({ id, followUp }: Props) {
  const { setFollowup } = useBoardActions();
  const value = followUp && isValidISO(followUp) ? followUp : "";

  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        className="border rounded px-2 py-1 text-sm"
        value={value ? value.slice(0, 16) : ""}
        onChange={(e) => {
          const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
          setFollowup(id, iso);
        }}
      />
      <span className="text-xs opacity-70">{formatDDMMYYYY(value)}</span>
    </div>
  );
}
