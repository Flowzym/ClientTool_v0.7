/**
 * Mapping-Presets für verschiedene Import-Quellen
 * AMS-Default Preset mit robusten Alias-Zuordnungen
 */

import { normalizeHeader, headersMatch, getTokenOverlap } from './normalize';

export interface MappingPreset {
  id: string;
  name: string;
  description: string;
  mappings: Record<string, string>;
  aliases: Record<string, string[]>;
}

// AMS-Standard Preset mit korrekten Zuordnungen
export const PRESET_AMS_DEFAULT: MappingPreset = {
  id: 'ams-default',
  name: 'AMS Standard Export',
  description: 'Standardvorlage für AMS-Exporte mit typischen Spalten',
  mappings: {
    "Titel": "title",
    "Familien-/Nachname": "lastName", 
    "Vorname": "firstName",
    "Geschlecht": "gender",
    "SV-Nummer": "svNumber",
    "Geburtsdatum": "birthDate",
    "PLZ": "zip",
    "Ort": "city",
    "Adresse": "address",
    "Straße": "address", // Alias für Adresse
    "Landesvorwahl": "countryCode",
    "Vorwahl": "areaCode", 
    "Telefonnummer": "phoneNumber",
    "Telefon-Nr": "phoneNumber", // Alias
    "Buchungsstatus": "status",
    "Anmerkung": "note",
    "Zubuchung": "amsBookingDate",
    "Terminvorgabe": "followUp",
    "geplant": "followUp", // Alias
    "Gebucht": "entryDate",
    "Eintritt": "entryDate", // Alias
    "Ausgebucht": "exitDate",
    "Austritt": "exitDate", // Alias
    "RGS": "internalCode",
    "Titel AMS-Berater:in": "amsAgentTitle",
    "Titel Betreuer": "amsAgentTitle", // Alias
    "Nachname AMS-Berater:in": "amsAgentLastName",
    "Familien-/Nachname Betreuer": "amsAgentLastName", // Alias
    "Vorname AMS-Berater:in": "amsAgentFirstName", 
    "Vorname Betreuer": "amsAgentFirstName", // Alias
    "Maßnahmennummer": "measureNumber",
    "Veranstaltungsnummer": "eventNumber",
    "eMail": "email",
    "eMail-Adresse": "email", // Alias
    "Ignorieren": "__IGNORE__" // Spezialfall: überspringen
  },
  aliases: {
    // Kaputte Umlaute und Varianten
    "address": ["adresse", "stra�e", "straße", "strasse", "str"],
    "measureNumber": ["ma�nahmennummer", "maßnahmennummer", "massnahmennummer", "maßnahme nr"],
    "email": ["email", "e-mail", "e_mail", "mail", "emial", "e-mailadresse"],
    "phoneNumber": ["telefonnummer", "telefon-nr", "telefon nr", "tel nr", "tel-nr"],
    "lastName": ["nachname", "nach-name", "familienname", "familien-nachname"],
    "firstName": ["vorname", "vor-name", "rufname"],
    "birthDate": ["geburtsdatum", "geburts-datum", "geb datum", "geboren"],
    "gender": ["geschlecht", "geschl", "sex"],
    "svNumber": ["sv-nummer", "sv nummer", "svnummer", "sozialversicherungsnummer"],
    "zip": ["plz", "postleitzahl", "post-leitzahl"],
    "city": ["ort", "stadt", "wohnort"],
    "countryCode": ["landesvorwahl", "landes-vorwahl", "country code"],
    "areaCode": ["vorwahl", "vor-wahl", "ortsvorwahl"],
    "status": ["status", "buchungsstatus", "bearbeitungsstatus"],
    "note": ["notiz", "anmerkung", "bemerkung", "kommentar"],
    "amsBookingDate": ["zubuchung", "zubuchungsdatum", "buchung"],
    "followUp": ["terminvorgabe", "termin", "geplant", "wiedervorlage"],
    "entryDate": ["gebucht", "eintritt", "eintrittsdatum", "start"],
    "exitDate": ["ausgebucht", "austritt", "austrittsdatum", "ende"],
    "internalCode": ["rgs", "interner code", "referenz"],
    "amsAgentTitle": ["titel ams-berater", "titel betreuer"],
    "amsAgentLastName": ["nachname ams-berater", "nachname betreuer"],
    "amsAgentFirstName": ["vorname ams-berater", "vorname betreuer"]
  }
};

/**
 * Findet beste Zuordnung für einen Header basierend auf Preset
 */
export function findBestMapping(
  header: string, 
  preset: MappingPreset = PRESET_AMS_DEFAULT
): { field: string | null; confidence: number; reason: string } {
  const normalized = normalizeHeader(header);
  
  // 1. Exakte Übereinstimmung im Preset
  for (const [presetHeader, field] of Object.entries(preset.mappings)) {
    if (headersMatch(header, presetHeader)) {
      return {
        field: field === '__IGNORE__' ? null : field,
        confidence: 1.0,
        reason: `Exakte Übereinstimmung: "${presetHeader}"`
      };
    }
  }
  
  // 2. Alias-Matching
  for (const [field, aliases] of Object.entries(preset.aliases)) {
    for (const alias of aliases) {
      if (headersMatch(header, alias)) {
        return {
          field,
          confidence: 0.9,
          reason: `Alias-Übereinstimmung: "${alias}" → ${field}`
        };
      }
    }
  }
  
  // 3. Token-Overlap (fuzzy matching)
  let bestMatch: { field: string; confidence: number; reason: string } | null = null;
  
  for (const [presetHeader, field] of Object.entries(preset.mappings)) {
    if (field === '__IGNORE__') continue;
    
    const overlap = getTokenOverlap(header, presetHeader);
    if (overlap > 0.5 && (!bestMatch || overlap > bestMatch.confidence)) {
      bestMatch = {
        field,
        confidence: overlap * 0.7, // Reduziert für Fuzzy-Match
        reason: `Token-Overlap (${Math.round(overlap * 100)}%): "${presetHeader}"`
      };
    }
  }
  
  if (bestMatch) return bestMatch;
  
  // 4. Alias Token-Overlap
  for (const [field, aliases] of Object.entries(preset.aliases)) {
    for (const alias of aliases) {
      const overlap = getTokenOverlap(header, alias);
      if (overlap > 0.6 && (!bestMatch || overlap > bestMatch.confidence)) {
        bestMatch = {
          field,
          confidence: overlap * 0.6, // Noch mehr reduziert für Alias-Fuzzy
          reason: `Alias Token-Overlap (${Math.round(overlap * 100)}%): "${alias}"`
        };
      }
    }
  }
  
  return bestMatch || { field: null, confidence: 0, reason: 'Keine Übereinstimmung gefunden' };
}

/**
 * Auto-Mapping für alle Header einer Import-Datei
 */
export function autoMapHeaders(
  headers: string[],
  preset: MappingPreset = PRESET_AMS_DEFAULT,
  confidenceThreshold: number = 0.5
): {
  mapping: Record<string, string>;
  suggestions: Array<{
    index: number;
    header: string;
    field: string | null;
    confidence: number;
    reason: string;
    repairs: string[];
  }>;
} {
  const mapping: Record<string, string> = {};
  const suggestions: any[] = [];
  
  headers.forEach((header, index) => {
    if (!header) return;
    
    const _normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const targetField = HEADER_MAPPING[_normalized];
    
    suggestions.push({
      index,
      header,
      field: match.field,
      confidence: match.confidence,
      reason: match.reason,
      repairs: _normalized.repairs
    });
    
    // Nur bei ausreichender Confidence automatisch zuordnen
    if (match.field && match.confidence >= confidenceThreshold) {
      _mapping[index.toString()] = match.field;
    }
  });
  
  return { mapping: _mapping, suggestions };
}