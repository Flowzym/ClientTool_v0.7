/**
 * Smart column selector with grouped options
 * Combines internal fields and custom fields with intelligent grouping
 */

import React from 'react';
import type { InternalField, CustomField } from '../core/types';

interface ColumnSelectProps {
  value?: InternalField | string;
  customFields: CustomField[];
  onChange: (field: InternalField | string | null) => void;
  disabled?: boolean;
}

// Field groups for better UX
const FIELD_GROUPS = {
  'Basis-Daten': [
    'firstName', 'lastName', 'title', 'gender', 'birthDate'
  ] as InternalField[],
  'Kontakt': [
    'phone', 'email', 'address', 'zip', 'city'
  ] as InternalField[],
  'AMS-Daten': [
    'amsId', 'amsBookingDate', 'entryDate', 'exitDate', 
    'amsAgentFirstName', 'amsAgentLastName', 'amsAdvisor'
  ] as InternalField[],
  'Interne Felder': [
    'status', 'priority', 'angebot', 'result', 'followUp',
    'assignedTo', 'note', 'internalCode'
  ] as InternalField[],
  'Sonstige': [
    'svNumber', 'countryCode', 'areaCode', 'phoneNumber'
  ] as InternalField[]
};

const FIELD_LABELS: Record<InternalField, string> = {
  // Basis-Daten
  firstName: 'Vorname',
  lastName: 'Nachname', 
  title: 'Titel',
  gender: 'Geschlecht',
  birthDate: 'Geburtsdatum',
  
  // Kontakt
  phone: 'Telefon',
  email: 'E-Mail',
  address: 'Adresse',
  zip: 'PLZ',
  city: 'Ort',
  
  // AMS-Daten
  amsId: 'AMS-ID',
  amsBookingDate: 'Zubuchungsdatum',
  entryDate: 'Eintrittsdatum',
  exitDate: 'Austrittsdatum',
  amsAgentFirstName: 'AMS-Betreuer Vorname',
  amsAgentLastName: 'AMS-Betreuer Nachname',
  amsAdvisor: 'AMS-Berater',
  
  // Interne Felder
  status: 'Status',
  priority: 'Priorität',
  angebot: 'Angebot',
  result: 'Ergebnis',
  followUp: 'Follow-up Termin',
  assignedTo: 'Zugewiesen an',
  note: 'Notiz',
  internalCode: 'Interner Code',
  
  // Sonstige
  svNumber: 'SV-Nummer',
  countryCode: 'Ländercode',
  areaCode: 'Vorwahl',
  phoneNumber: 'Telefonnummer'
};

export function ColumnSelect({ value, customFields, onChange, disabled }: ColumnSelectProps) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
    >
      <option value="">Ignorieren</option>
      
      {/* Standard field groups */}
      {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
        <optgroup key={groupName} label={groupName}>
          {fields.map(field => (
            <option key={field} value={field}>
              {FIELD_LABELS[field]}
            </option>
          ))}
        </optgroup>
      ))}
      
      {/* Custom fields */}
      {customFields.length > 0 && (
        <optgroup label="Eigene Felder">
          {customFields.map(field => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}