import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';

interface FollowupPickerProps {
  value?: string;
  onChange: (date?: string) => void;
  disabled?: boolean;
}

export function FollowupPicker({ value, onChange, disabled }: FollowupPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setInputValue(date.toISOString().slice(0, 16));
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!selectedChannel) {
      return;
    }
      const date = new Date(inputValue);
      onChange(date.toISOString());
    } else {
      onChange(undefined);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { 
          e.stopPropagation(); 
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 text-xs border rounded ${
          value ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}`}
      >
        <Calendar className="w-3 h-3" />
        {value ? new Date(value).toLocaleDateString('de-DE') : 'Termin'}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-3 min-w-64">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Follow-up Termin
              </label>
              <input
                type="datetime-local"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            
            <div className="flex justify-between gap-2">
              <button
                onClick={handleClear}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                <X className="w-3 h-3 mr-1 inline" />
                Löschen
              </button>
              
              <div className="flex gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}