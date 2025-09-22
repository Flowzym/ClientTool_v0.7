/**
 * Comprehensive alias dictionary for German/Austrian field mapping
 * Includes broken encoding variants and common synonyms
 */

import type { InternalField } from './types';

// TODO: Implement comprehensive alias dictionary
// - German/Austrian field name variants
// - Broken encoding artifacts (ä→�, ß→�)
// - Common synonyms and abbreviations
// - Case-insensitive matching

export const ALIASES: Record<InternalField, string[]> = {
  // TODO: Populate with comprehensive aliases
  amsId: ['ams id', 'ams-id', 'amsid'],
  firstName: ['vorname', 'first name', 'firstname'],
  lastName: ['nachname', 'last name', 'lastname'],
  title: ['titel', 'anrede', 'title'],
  gender: ['geschlecht', 'sex', 'gender'],
  birthDate: ['geburtsdatum', 'birth date', 'birthdate'],
  svNumber: ['sv nummer', 'sv-nummer', 'svnummer'],
  phone: ['telefon', 'tel', 'phone'],
  email: ['email', 'e-mail', 'mail'],
  address: ['adresse', 'address', 'anschrift'],
  zip: ['plz', 'postleitzahl', 'zip'],
  city: ['ort', 'stadt', 'city'],
  countryCode: ['land', 'country', 'ländercode'],
  areaCode: ['vorwahl', 'area code', 'areacode'],
  phoneNumber: ['rufnummer', 'phone number', 'phonenumber'],
  amsBookingDate: ['ams buchung', 'ams-buchung', 'amsbuchung'],
  entryDate: ['eintrittsdatum', 'entry date', 'entrydate'],
  exitDate: ['austrittsdatum', 'exit date', 'exitdate'],
  amsAgentLastName: ['ams berater nachname', 'ams-berater-nachname'],
  amsAgentFirstName: ['ams berater vorname', 'ams-berater-vorname'],
  amsAdvisor: ['ams berater', 'ams-berater', 'amsberater'],
  note: ['notiz', 'note', 'bemerkung'],
  internalCode: ['interner code', 'internal code', 'code'],
  status: ['status', 'zustand', 'state'],
  priority: ['priorität', 'priority', 'prio'],
  result: ['ergebnis', 'result', 'resultat'],
  angebot: ['angebot', 'offer', 'maßnahme'],
  followUp: ['nachfass', 'follow up', 'followup'],
  lastActivity: ['letzte aktivität', 'last activity'],
  assignedTo: ['zugewiesen an', 'assigned to', 'verantwortlich']
};

/**
 * Gets all aliases for a given internal field
 * TODO: Implement comprehensive alias lookup
 */
export function getAliases(field: InternalField): string[] {
  return ALIASES[field] || [];
}

/**
 * Finds internal field by alias (case-insensitive)
 * TODO: Implement reverse alias lookup
 */
export function findFieldByAlias(alias: string): InternalField | null {
  // TODO: Implement alias matching logic
  const normalizedAlias = alias.toLowerCase().trim();
  
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.some(a => a.toLowerCase() === normalizedAlias)) {
      return field as InternalField;
    }
  }
  
  return null;
}

/**
 * Gets all possible aliases across all fields (for reverse lookup)
 * TODO: Implement complete reverse lookup map
 */
export function getAllAliases(): Record<string, InternalField> {
  // TODO: Implement reverse lookup generation
  const result: Record<string, InternalField> = {};
  
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      result[alias.toLowerCase()] = field as InternalField;
    }
  }
  
  return result;
}