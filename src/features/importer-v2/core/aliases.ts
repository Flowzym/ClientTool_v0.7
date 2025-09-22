/**
 * Comprehensive alias dictionary for German/Austrian field mapping
 * Includes broken encoding variants and common synonyms
 */

import type { InternalField } from './types';

export const ALIASES: Record<InternalField, string[]> = {
  amsId: [
    'ams id', 'ams-id', 'amsid', 'ams nummer', 'ams-nummer', 'amsnummer',
    'kundennummer', 'kunden-nummer', 'kunden nummer', 'id', 'nummer',
    'ams�id', 'ams�nummer' // broken encoding variants
  ],
  
  firstName: [
    'vorname', 'vor name', 'vor-name', 'firstname', 'first name', 'first-name',
    'rufname', 'ruf name', 'ruf-name', 'taufname', 'vornamen',
    'vorname�', 'vor�name', 'rufname�' // broken encoding variants
  ],
  
  lastName: [
    'nachname', 'nach name', 'nach-name', 'lastname', 'last name', 'last-name',
    'familienname', 'familien name', 'familien-name', 'zuname', 'name',
    'nachname�', 'nach�name', 'familienname�' // broken encoding variants
  ],
  
  title: [
    'titel', 'title', 'anrede', 'grad', 'akademischer grad', 'akademischer-grad',
    'titel�', 'anrede�' // broken encoding variants
  ],
  
  gender: [
    'geschlecht', 'sex', 'gender', 'geschl', 'geschl.',
    'geschlecht�' // broken encoding variants
  ],
  
  birthDate: [
    'geburtsdatum', 'geburts datum', 'geburts-datum', 'birth date', 'birthdate',
    'geb datum', 'geb-datum', 'geb.', 'geboren', 'geboren am',
    'geburtsdatum�', 'geburts�datum' // broken encoding variants
  ],
  
  svNumber: [
    'sv nummer', 'sv-nummer', 'svnummer', 'sv nr', 'sv-nr', 'sv.nr.',
    'sozialversicherungsnummer', 'sozialversicherungs nummer', 'sozialversicherungs-nummer',
    'versicherungsnummer', 'versicherungs nummer', 'versicherungs-nummer',
    'sv�nummer', 'sozialversicherungs�nummer' // broken encoding variants
  ],
  
  phone: [
    'telefon', 'tel', 'phone', 'telefonnummer', 'telefon nummer', 'telefon-nummer',
    'tel nr', 'tel-nr', 'tel.nr.', 'handy', 'mobil', 'mobile',
    'festnetz', 'fest netz', 'fest-netz', 'rufnummer', 'ruf nummer', 'ruf-nummer',
    'telefon�', 'telefonnummer�', 'tel�nr' // broken encoding variants
  ],
  
  email: [
    'email', 'e-mail', 'e mail', 'mail', 'e-mail-adresse', 'email adresse',
    'e-mailadresse', 'emailadresse', 'elektronische post', 'elektronische-post',
    'email�', 'e�mail', 'mail�adresse' // broken encoding variants
  ],
  
  address: [
    'adresse', 'address', 'anschrift', 'wohnadresse', 'wohn adresse', 'wohn-adresse',
    'strasse', 'straße', 'str', 'str.', 'hausnummer', 'haus nummer', 'haus-nummer',
    'postadresse', 'post adresse', 'post-adresse',
    'adresse�', 'anschrift�', 'stra�e', 'stra�ennummer' // broken encoding variants
  ],
  
  zip: [
    'plz', 'postleitzahl', 'post leitzahl', 'post-leitzahl', 'zip', 'postal code',
    'plz�', 'postleitzahl�' // broken encoding variants
  ],
  
  city: [
    'ort', 'stadt', 'city', 'wohnort', 'wohn ort', 'wohn-ort',
    'gemeinde', 'ortschaft',
    'ort�', 'stadt�' // broken encoding variants
  ],
  
  countryCode: [
    'land', 'country', 'ländercode', 'länder code', 'länder-code',
    'country code', 'countrycode', 'landeskennzeichen',
    'land�', 'l�ndercode', 'l�nder�code' // broken encoding variants
  ],
  
  areaCode: [
    'vorwahl', 'vor wahl', 'vor-wahl', 'area code', 'areacode',
    'ortsvorwahl', 'orts vorwahl', 'orts-vorwahl',
    'vorwahl�', 'vor�wahl' // broken encoding variants
  ],
  
  phoneNumber: [
    'rufnummer', 'ruf nummer', 'ruf-nummer', 'phone number', 'phonenumber',
    'telefonnummer', 'telefon nummer', 'telefon-nummer',
    'rufnummer�', 'telefonnummer�' // broken encoding variants
  ],
  
  amsBookingDate: [
    'ams buchung', 'ams-buchung', 'amsbuchung', 'ams buchungsdatum', 'ams-buchungsdatum',
    'zubuchung', 'zu buchung', 'zu-buchung', 'zubuchungsdatum', 'zubuchungs datum',
    'ams�buchung', 'zu�buchung' // broken encoding variants
  ],
  
  entryDate: [
    'eintrittsdatum', 'eintritts datum', 'eintritts-datum', 'entry date', 'entrydate',
    'eintritt', 'beginn', 'start', 'startdatum', 'start datum', 'start-datum',
    'eintrittsdatum�', 'eintritts�datum' // broken encoding variants
  ],
  
  exitDate: [
    'austrittsdatum', 'austritts datum', 'austritts-datum', 'exit date', 'exitdate',
    'austritt', 'ende', 'end', 'enddatum', 'end datum', 'end-datum',
    'austrittsdatum�', 'austritts�datum' // broken encoding variants
  ],
  
  amsAgentLastName: [
    'ams berater nachname', 'ams-berater-nachname', 'ams berater nach name',
    'ams agent nachname', 'ams-agent-nachname', 'ams agent nach name',
    'berater nachname', 'berater nach name', 'berater-nachname',
    'ams�berater�nachname', 'berater�nachname' // broken encoding variants
  ],
  
  amsAgentFirstName: [
    'ams berater vorname', 'ams-berater-vorname', 'ams berater vor name',
    'ams agent vorname', 'ams-agent-vorname', 'ams agent vor name',
    'berater vorname', 'berater vor name', 'berater-vorname',
    'ams�berater�vorname', 'berater�vorname' // broken encoding variants
  ],
  
  amsAdvisor: [
    'ams berater', 'ams-berater', 'amsberater', 'ams betreuer', 'ams-betreuer',
    'ams agent', 'ams-agent', 'berater', 'betreuer', 'advisor', 'adviser',
    'sachbearbeiter', 'sach bearbeiter', 'sach-bearbeiter',
    'ams�berater', 'ams�betreuer', 'sach�bearbeiter' // broken encoding variants
  ],
  
  note: [
    'notiz', 'note', 'notes', 'notizen', 'bemerkung', 'bemerkungen',
    'anmerkung', 'anmerkungen', 'kommentar', 'kommentare', 'hinweis', 'hinweise',
    'notiz�', 'bemerkung�', 'anmerkung�' // broken encoding variants
  ],
  
  internalCode: [
    'interner code', 'internal code', 'code', 'interne nummer', 'interne-nummer',
    'referenz', 'referenznummer', 'referenz nummer', 'referenz-nummer',
    'interner�code', 'interne�nummer' // broken encoding variants
  ],
  
  status: [
    'status', 'zustand', 'state', 'bearbeitungsstatus', 'bearbeitungs status',
    'bearbeitungs-status', 'fallstatus', 'fall status', 'fall-status',
    'status�', 'bearbeitungs�status' // broken encoding variants
  ],
  
  priority: [
    'priorität', 'priority', 'prio', 'wichtigkeit', 'dringlichkeit',
    'prioritätsstufe', 'prioritäts stufe', 'prioritäts-stufe',
    'priorit�t', 'priorit�tsstufe', 'dringlichkeit�' // broken encoding variants
  ],
  
  result: [
    'ergebnis', 'result', 'resultat', 'outcome', 'ausgang',
    'bearbeitungsergebnis', 'bearbeitungs ergebnis', 'bearbeitungs-ergebnis',
    'ergebnis�', 'bearbeitungs�ergebnis' // broken encoding variants
  ],
  
  angebot: [
    'angebot', 'offer', 'maßnahme', 'massnahme', 'maßnahmen', 'massnahmen',
    'leistung', 'leistungen', 'service', 'services', 'programm', 'programme',
    'angebot�', 'ma�nahme', 'ma�nahmen', 'leistung�' // broken encoding variants
  ],
  
  followUp: [
    'nachfass', 'nach fass', 'nach-fass', 'follow up', 'followup', 'follow-up',
    'wiedervorlage', 'wieder vorlage', 'wieder-vorlage', 'termin', 'termine',
    'nachfasstermin', 'nachfass termin', 'nachfass-termin',
    'nachfa�', 'wieder�vorlage', 'nachfa��termin' // broken encoding variants
  ],
  
  lastActivity: [
    'letzte aktivität', 'letzte-aktivität', 'letzteaktivität', 'last activity',
    'lastactivity', 'last-activity', 'letzte aktion', 'letzte-aktion',
    'letzter kontakt', 'letzter-kontakt', 'letzterkontakt',
    'letzte�aktivit�t', 'letzte�aktion', 'letzter�kontakt' // broken encoding variants
  ],
  
  assignedTo: [
    'zugewiesen an', 'zugewiesen-an', 'zugewiesenan', 'assigned to', 'assignedto',
    'assigned-to', 'verantwortlich', 'verantwortlicher', 'zuständig', 'zuständiger',
    'bearbeiter', 'sachbearbeiter', 'sach bearbeiter', 'sach-bearbeiter',
    'zugewiesen�an', 'zust�ndig', 'zust�ndiger', 'sach�bearbeiter' // broken encoding variants
  ]
};

/**
 * Gets all aliases for a given internal field
 */
export function getAliases(field: InternalField): string[] {
  return ALIASES[field] || [];
}

/**
 * Finds internal field by alias (case-insensitive)
 */
export function findFieldByAlias(alias: string): InternalField | null {
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
 */
export function getAllAliases(): Record<string, InternalField> {
  const result: Record<string, InternalField> = {};
  
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const alias of aliases) {
      result[alias.toLowerCase()] = field as InternalField;
    }
  }
  
  return result;
}