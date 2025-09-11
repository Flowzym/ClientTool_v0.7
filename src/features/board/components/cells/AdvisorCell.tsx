import React, { useState } from "react";
import { useBoardActions } from "../../hooks/useBoardActions";
import { computeAdvisor } from "../../utils/advisor";

type Props = {
  id: string;
  amsAdvisor?: string | null;
  amsAgentFirstName?: string | null;
  amsAgentLastName?: string | null;
};

export default function AdvisorCell(props: Props) {
  const { update } = useBoardActions();
  const display = computeAdvisor(props);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(props.amsAdvisor ?? "");

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="truncate max-w-[200px]">{display || "-"}</span>
        <button
          className="text-xs underline opacity-70 hover:opacity-100"
          onClick={() => setEditing(true)}
        >
          edit
        </button>
        {props.amsAdvisor && (
          <button
            className="text-xs underline opacity-70 hover:opacity-100"
            onClick={() => update(props.id, { amsAdvisor: null as any })}
            title="Zurücksetzen (zeigt wieder AMS-Agent*in)"
          >
            reset
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="border rounded px-2 py-1 text-sm w-[220px]"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={display || "Berater/in"}
      />
      <button
        className="text-xs px-2 py-1 border rounded"
        onClick={async () => {
          await update(props.id, { amsAdvisor: val });
          setEditing(false);
        }}
      >
        OK
      </button>
      <button
        className="text-xs px-2 py-1 border rounded"
        onClick={() => setEditing(false)}
      >
        Abbrechen
      </button>
    </div>
  );
}