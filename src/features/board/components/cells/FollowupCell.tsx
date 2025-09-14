import React, { useState } from "react";
import { Calendar, X } from "lucide-react";
import { useBoardActions } from "../../hooks/useBoardActions";
import { formatDDMMYYYY, isValidISO } from "../../utils/date";

type Props = {
  id: string;
  followUp?: string | null;
};

export default function FollowupCell({ id, followUp }: Props) {
  const { setFollowup } = useBoardActions();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const hasValue = followUp && isValidISO(followUp);

  React.useEffect(() => {
    if (hasValue) {
      setInputValue(followUp.slice(0, 16));
    }
  }, [followUp, hasValue]);

  const handleSave = () => {
    if (inputValue) {
      const iso = new Date(inputValue).toISOString();
      setFollowup(id, iso);
    }
    setIsEditing(false);
  };

  const handleClear = () => {
    setFollowup(id, null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (hasValue) {
      setInputValue(followUp.slice(0, 16));
    } else {
      setInputValue('');
    }
  };

  if (!hasValue) {
    // Icon-only mode when no date
    return (
      <div className="flex items-center">
        <button
          className="p-1 rounded hover:bg-gray-50 text-gray-400"
          title="Termin hinzufügen"
          onClick={() => setIsEditing(true)}
          aria-label="Termin hinzufügen"
        >
          <Calendar size={16} />
        </button>
        
        {isEditing && (
          <div className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg p-2 ml-6">
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                OK
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Has value mode - show date + clear button
  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        className="border rounded px-2 py-1 text-sm"
        value={hasValue ? followUp.slice(0, 16) : ""}
        onChange={(e) => {
          const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
          setFollowup(id, iso);
        }}
      />
      <span className="text-xs opacity-70">{formatDDMMYYYY(followUp)}</span>
      <button
        className="p-1 rounded hover:bg-gray-50 text-gray-400"
        title="Termin löschen"
        onClick={handleClear}
        aria-label="Termin löschen"
      >
        <X size={14} />
      </button>
    </div>
  );
}