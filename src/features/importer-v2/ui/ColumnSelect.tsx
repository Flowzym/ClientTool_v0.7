/**
 * Enhanced column selection dropdown
 * Smart field selection with search, grouping, and suggestions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '../../../components/Badge';
import { ChevronDown, Search, Plus } from 'lucide-react';
import type { InternalField } from '../core/types';

interface FieldOption {
  field: InternalField;
  label: string;
  group: 'required' | 'optional' | 'custom';
  description?: string;
}

const FIELD_OPTIONS: FieldOption[] = [
  // Required fields
  { field: 'firstName', label: 'Vorname', group: 'required', description: 'Vorname der Person' },
  { field: 'lastName', label: 'Nachname', group: 'required', description: 'Nachname der Person' },
  
  // Optional basic fields
  { field: 'amsId', label: 'AMS-ID', group: 'optional', description: 'AMS-Kundennummer (A + Ziffern)' },
  { field: 'title', label: 'Titel', group: 'optional', description: 'Akademischer Titel (Dr., Mag., etc.)' },
  { field: 'gender', label: 'Geschlecht', group: 'optional', description: 'M/F/D oder männlich/weiblich/divers' },
  { field: 'birthDate', label: 'Geburtsdatum', group: 'optional', description: 'Geburtsdatum (DD.MM.YYYY oder ISO)' },
  { field: 'svNumber', label: 'SV-Nummer', group: 'optional', description: 'Sozialversicherungsnummer' },
  
  // Contact fields
  { field: 'phone', label: 'Telefon', group: 'optional', description: 'Telefonnummer (+43 Format bevorzugt)' },
  { field: 'email', label: 'E-Mail', group: 'optional', description: 'E-Mail-Adresse' },
  { field: 'address', label: 'Adresse', group: 'optional', description: 'Straße und Hausnummer' },
  { field: 'zip', label: 'PLZ', group: 'optional', description: 'Postleitzahl (4-5 Ziffern)' },
  { field: 'city', label: 'Ort', group: 'optional', description: 'Wohnort' },
  
  // AMS fields
  { field: 'amsBookingDate', label: 'Zubuchungsdatum', group: 'optional', description: 'AMS-Zubuchungsdatum' },
  { field: 'entryDate', label: 'Eintrittsdatum', group: 'optional', description: 'Maßnahmen-Eintritt' },
  { field: 'exitDate', label: 'Austrittsdatum', group: 'optional', description: 'Maßnahmen-Austritt' },
  { field: 'amsAdvisor', label: 'AMS-Berater', group: 'optional', description: 'Zuständiger AMS-Berater' },
  
  // Internal fields
  { field: 'status', label: 'Status', group: 'optional', description: 'Bearbeitungsstatus' },
  { field: 'priority', label: 'Priorität', group: 'optional', description: 'Bearbeitungspriorität' },
  { field: 'angebot', label: 'Angebot', group: 'optional', description: 'Maßnahmen-Angebot (BAM, LL/B+, etc.)' },
  { field: 'note', label: 'Notiz', group: 'optional', description: 'Anmerkungen und Notizen' }
];

interface ColumnSelectProps {
  value?: InternalField;
  onChange: (field: InternalField | '') => void;
  suggestions?: Array<{
    field: InternalField;
    confidence: number;
    reason: string;
  }>;
  disabled?: boolean;
  placeholder?: string;
  showConfidence?: boolean;
}

export function ColumnSelect({
  value,
  onChange,
  suggestions = [],
  disabled = false,
  placeholder = "Feld auswählen...",
  showConfidence = true
}: ColumnSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = FIELD_OPTIONS.find(opt => opt.field === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = FIELD_OPTIONS.filter(option => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return option.label.toLowerCase().includes(searchLower) ||
           option.field.toLowerCase().includes(searchLower) ||
           option.description?.toLowerCase().includes(searchLower);
  });

  // Group filtered options
  const groupedOptions = {
    suggestions: suggestions.slice(0, 3),
    required: filteredOptions.filter(opt => opt.group === 'required'),
    optional: filteredOptions.filter(opt => opt.group === 'optional'),
    custom: filteredOptions.filter(opt => opt.group === 'custom')
  };

  const handleSelect = (field: InternalField | '') => {
    onChange(field);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-sm bg-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* Dropdown content */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Feld suchen..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-64">
            {/* Clear selection option */}
            <button
              onClick={() => handleSelect('')}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-500 border-b border-gray-100"
            >
              <span className="italic">Nicht zuordnen</span>
            </button>

            {/* Suggestions section */}
            {groupedOptions.suggestions.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Vorschläge
                </div>
                {groupedOptions.suggestions.map((suggestion, index) => {
                  const option = FIELD_OPTIONS.find(opt => opt.field === suggestion.field);
                  if (!option) return null;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelect(suggestion.field)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{suggestion.reason}</div>
                      </div>
                      {showConfidence && (
                        <Badge 
                          variant={suggestion.confidence > 0.8 ? 'success' : 'warning'} 
                          size="sm"
                        >
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Required fields section */}
            {groupedOptions.required.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Pflichtfelder
                </div>
                {groupedOptions.required.map(option => (
                  <button
                    key={option.field}
                    onClick={() => handleSelect(option.field)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500">{option.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Optional fields section */}
            {groupedOptions.optional.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Optionale Felder
                </div>
                {groupedOptions.optional.map(option => (
                  <button
                    key={option.field}
                    onClick={() => handleSelect(option.field)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500">{option.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Custom fields section */}
            {groupedOptions.custom.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                  Eigene Felder
                </div>
                {groupedOptions.custom.map(option => (
                  <button
                    key={option.field}
                    onClick={() => handleSelect(option.field)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500">{option.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Create custom field option */}
            <button
              onClick={() => {
                // TODO: Trigger custom field creation
                console.log('Create custom field');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-accent-600 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Eigenes Feld erstellen...</span>
            </button>

            {/* No results */}
            {filteredOptions.length === 0 && searchTerm && (
              <div className="px-4 py-6 text-center text-gray-500">
                <div className="text-sm">Keine Felder gefunden für "{searchTerm}"</div>
                <button
                  onClick={() => {
                    // TODO: Create custom field with search term
                    console.warn('Create field from search:', searchTerm);
                  }}
                  className="mt-2 text-xs text-accent-600 hover:text-accent-700"
                >
                  Als eigenes Feld erstellen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}