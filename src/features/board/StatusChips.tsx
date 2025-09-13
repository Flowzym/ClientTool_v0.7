/**
 * Status- und Ergebnis-Chips mit Dropdown
 */
import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '../../components/Badge';
import { ChevronDown } from 'lucide-react';
import type { Status, Result } from '../../domain/models';

const statusOptions: Array<{ key: Status; label: string; variant: 'default' | 'success' | 'warning' | 'error'; className?: string }> = [
  { key: 'offen',           label: 'Offen',                   variant: 'default' },
  { key: 'inBearbeitung',   label: 'Gebucht / Bearbeitung',   variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'erledigt',        label: 'Abgebucht / Erledigt',    variant: 'success' },
  { key: 'ruht',            label: 'Ruht',                    variant: 'default' },
  { key: 'abgebrochen',     label: 'Vom TAS entfernt',        variant: 'error' }
];

// Ergebnis-Optionen (gruppiert dargestellt)
const resultTop: Array<{ key: Result; label: string }> = [
  { key: 'ablehnung',         label: 'Kein Interesse' },
  { key: 'terminFixiert',     label: 'Termin vereinbart' },
  { key: 'rueckrufZugesagt',  label: 'Rückmeldung erwartet' }
];

const resultComm: Array<{ key: Result; label: string }> = [
  { key: 'bam',               label: 'BAM' },
  { key: 'bewerbungsbuero',   label: 'Bewerbungsbüro' },
  { key: 'lebenslauf',        label: 'Lebenslauf' },
  { key: 'mailaustausch',     label: 'Mailaustausch' }
];

const resultOutcome: Array<{ key: Result; label: string }> = [
  { key: 'vermittelt',              label: 'Arbeitsaufnahme' },
  { key: 'gesundheitlicheMassnahme',label: 'Gesundheitliche Maßnahme' },
  { key: 'uebergabeAnAMS',          label: 'Übergabe an AMS' },
  { key: 'terminNichtEingehalten',  label: 'Termin nicht eingehalten' }
];

const resultOptions: Array<{ key: Result; label: string }> = [...resultTop, ...resultComm, ...resultOutcome];


interface StatusChipProps {
  value: Status;
  onChange: (status: Status) => void;
  disabled?: boolean;
}

export function StatusChip({ value, onChange, disabled , labelOverride}: StatusChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentOption = statusOptions.find(opt => opt.key === value);
  
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

  const handleSelect = (status: Status) => {
    onChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); !disabled && setIsOpen(!isOpen); }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={disabled}
        className={`flex items-center gap-1 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}`}
      >
        <Badge variant={currentOption?.variant || 'default'} size="sm" className={currentOption?.className}>
          {currentOption?.label || value}
        </Badge>
        {!disabled && <ChevronDown className="w-3 h-3 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
          <div className="py-1 max-h-64 overflow-y-auto">
            {statusOptions.map(option => (
              <button
                key={option.key}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); handleSelect(option.key); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Badge variant={option.variant} size="sm" className={option.className}>
                  {option.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ResultChipProps {
  value?: Result;
  onChange: (result?: Result) => void;
  disabled?: boolean;
}

export function ResultChip({ value, onChange, disabled }: ResultChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentOption = value ? resultOptions.find(opt => opt.key === value) : null;
  
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

  const handleSelect = (result?: Result) => {
    onChange(result);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); !disabled && setIsOpen(!isOpen); }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={disabled}
        className={`flex items-center gap-1 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}`}
      >
        {currentOption ? (
          <Badge variant="default" size="sm">
            {currentOption.label}
          </Badge>
        ) : (
          <span className="text-xs text-gray-400 px-2 py-1 border border-dashed border-gray-300 rounded">
            Kein Ergebnis
          </span>
        )}
        {!disabled && <ChevronDown className="w-3 h-3 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
          <div className="py-1 max-h-64 overflow-y-auto">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); handleSelect(undefined); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-500"
            >
              Kein Ergebnis
            </button>
            {resultOptions.map(option => (
              <button
                key={option.key}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); handleSelect(option.key); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback export for Angebot chip (used by Board); simple pill rendering
export const AngebotChip = ({ value }: { value?: string }) => {
  if (!value) return null;
  return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">{value}</span>;
};