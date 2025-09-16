/**
 * Column alias detection for Importer V2
 * Comprehensive alias mappings including broken umlauts and common variations
 */

import type { InternalField } from './types';

// Comprehensive alias mappings with broken encoding variants
export const ALIASES: Record<InternalField, string[]> = {
  // AMS-ID variants
  amsId: [
    'ams', 'ams-id', 'ams_id', 'amsid', 'amsnummer', 'ams-nummer', 'ams_nummer',
    'kundennummer', 'kunden-nummer', 'kunden_nummer', 'clientid', 'client-id', 'client_id',
    'id', 'nummer', 'fallnummer', 'fall-nummer', 'fall_nummer'
  ],

  // Name fields with broken umlauts
  firstName: [
    'vorname', 'vor-name', 'vor_name', 'firstname', 'first-name', 'first_name',
    'givenname', 'given-name', 'given_name', 'vn', 'fname', 'prename',
    'rufname', 'ruf-name', 'ruf_name'
  ],
  
  lastName: [
    'nachname', 'nach-name', 'nach_name', 'lastname', 'last-name', 'last_name',
    'familienname', 'familien-name', 'familien_name', 'surname', 'nn', 'lname',
    'zuname', 'zu-name', 'zu_name'
  ],

  title: [
    'titel', 'title', 'anrede', 'grad', 'degree', 'academic-title', 'academic_title',
    'akademischer-titel', 'akademischer_titel', 'dr', 'prof', 'mag'
  ],

  gender: [
    'geschlecht', 'gender', 'sex', 'geschl', 'male-female', 'male_female',
    'm-w', 'm_w', 'mann-frau', 'mann_frau'
  ],

  // Broken umlaut variants for common fields
  birthDate: [
    'geburtsdatum', 'geburts-datum', 'geburts_datum', 'birthdate', 'birth-date', 'birth_date',
    'geb-datum', 'geb_datum', 'gebdat', 'dob', 'date-of-birth', 'date_of_birth',
    // Broken umlauts
    'geburtsdatum', 'geburts�datum', 'geb�rtsdatum'
  ],

  svNumber: [
    'sv-nummer', 'sv_nummer', 'svnummer', 'sv-nr', 'sv_nr', 'svnr',
    'sozialversicherungsnummer', 'sozialversicherungs-nummer', 'sozialversicherungs_nummer',
    'social-security', 'social_security', 'ssn',
    // Broken umlauts
    'sv-n�mmer', 'sv_n�mmer', 'sozialversicher�ngsnummer'
  ],

  // Contact information
  phone: [
    'telefon', 'tel', 'phone', 'telefonnummer', 'telefon-nummer', 'telefon_nummer',
    'tel-nr', 'tel_nr', 'telnr', 'handy', 'mobil', 'mobile', 'cell', 'cellular',
    'festnetz', 'fest-netz', 'fest_netz'
  ],

  email: [
    'email', 'e-mail', 'e_mail', 'mail', 'emailadresse', 'email-adresse', 'email_adresse',
    'e-mail-adresse', 'e_mail_adresse', 'elektronische-post', 'elektronische_post'
  ],

  address: [
    'adresse', 'address', 'anschrift', 'wohnadresse', 'wohn-adresse', 'wohn_adresse',
    'strasse', 'straße', 'street', 'str', 'hausnummer', 'haus-nummer', 'haus_nummer',
    // Broken umlauts
    'stra�e', 'stra�e', 'wohnadr�sse'
  ],

  zip: [
    'plz', 'postleitzahl', 'post-leitzahl', 'post_leitzahl', 'zipcode', 'zip-code', 'zip_code',
    'postal-code', 'postal_code', 'postalcode'
  ],

  city: [
    'ort', 'stadt', 'city', 'wohnort', 'wohn-ort', 'wohn_ort',
    'gemeinde', 'municipality'
  ],

  countryCode: [
    'land', 'country', 'landcode', 'land-code', 'land_code',
    'countrycode', 'country-code', 'country_code', 'laendercode', 'ländercode',
    // Broken umlauts
    'l�ndercode', 'l�nder-code'
  ],

  areaCode: [
    'vorwahl', 'vor-wahl', 'vor_wahl', 'areacode', 'area-code', 'area_code',
    'ortsvorwahl', 'orts-vorwahl', 'orts_vorwahl'
  ],

  phoneNumber: [
    'rufnummer', 'ruf-nummer', 'ruf_nummer', 'phonenumber', 'phone-number', 'phone_number',
    'durchwahl', 'durch-wahl', 'durch_wahl'
  ],

  // AMS-specific fields
  amsBookingDate: [
    'zubuchung', 'zubuchungsdatum', 'zubuchungs-datum', 'zubuchungs_datum',
    'buchung', 'buchungsdatum', 'buchungs-datum', 'buchungs_datum',
    'ams-buchung', 'ams_buchung', 'amsbuchung', 'booking-date', 'booking_date'
  ],

  entryDate: [
    'eintritt', 'eintrittsdatum', 'eintritts-datum', 'eintritts_datum',
    'entry-date', 'entry_date', 'entrydate', 'start-date', 'start_date',
    'beginn', 'beginndatum', 'beginn-datum', 'beginn_datum'
  ],

  exitDate: [
    'austritt', 'austrittsdatum', 'austritts-datum', 'austritts_datum',
    'exit-date', 'exit_date', 'exitdate', 'end-date', 'end_date',
    'ende', 'endedatum', 'ende-datum', 'ende_datum'
  ],

  amsAgentLastName: [
    'ams-betreuer-nachname', 'ams_betreuer_nachname', 'amsbetreuer-nachname',
    'ams-agent-lastname', 'ams_agent_lastname', 'amsagent-lastname',
    'berater-nachname', 'berater_nachname', 'beraternachname'
  ],

  amsAgentFirstName: [
    'ams-betreuer-vorname', 'ams_betreuer_vorname', 'amsbetreuer-vorname',
    'ams-agent-firstname', 'ams_agent_firstname', 'amsagent-firstname',
    'berater-vorname', 'berater_vorname', 'beratervorname'
  ],

  amsAdvisor: [
    'ams-berater', 'ams_berater', 'amsberater', 'ams-betreuer', 'ams_betreuer', 'amsbetreuer',
    'berater', 'betreuer', 'advisor', 'agent', 'sachbearbeiter', 'sb',
    'ansprechpartner', 'ansprech-partner', 'ansprech_partner'
  ],

  // Internal fields
  note: [
    'notiz', 'notizen', 'note', 'notes', 'bemerkung', 'bemerkungen', 'anmerkung', 'anmerkungen',
    'kommentar', 'kommentare', 'comment', 'comments', 'hinweis', 'hinweise'
  ],

  internalCode: [
    'interner-code', 'interner_code', 'internercode', 'internal-code', 'internal_code',
    'internalcode', 'code', 'referenz', 'reference', 'ref'
  ],

  // Status and workflow
  status: [
    'status', 'zustand', 'state', 'bearbeitungsstatus', 'bearbeitungs-status', 'bearbeitungs_status',
    'fallstatus', 'fall-status', 'fall_status', 'case-status', 'case_status'
  ],

  priority: [
    'priorität', 'prioritaet', 'priority', 'prio', 'wichtigkeit', 'dringlichkeit',
    'urgency', 'importance',
    // Broken umlauts
    'priorit�t', 'priorit�t'
  ],

  result: [
    'ergebnis', 'result', 'outcome', 'resultat', 'ausgang', 'erfolg',
    'abschluss', 'conclusion', 'resolution'
  ],

  angebot: [
    'angebot', 'offer', 'maßnahme', 'massnahme', 'maßnahmen', 'massnahmen',
    'programm', 'program', 'kurs', 'course', 'training',
    // Broken umlauts
    'ma�nahme', 'ma�nahmen', 'ma�nahmennummer'
  ],

  followUp: [
    'follow-up', 'follow_up', 'followup', 'termin', 'wiedervorlage', 'wieder-vorlage', 'wieder_vorlage',
    'naechster-termin', 'nächster-termin', 'naechster_termin', 'nächster_termin',
    'next-appointment', 'next_appointment', 'appointment',
    // Broken umlauts
    'n�chster-termin', 'n�chster_termin', 'wiedervorl�ge'
  ],

  lastActivity: [
    'letzte-aktivität', 'letzte_aktivität', 'letzteaktivität',
    'last-activity', 'last_activity', 'lastactivity',
    'letzte-aktion', 'letzte_aktion', 'letzteaktion',
    // Broken umlauts
    'letzte-aktivit�t', 'letzte_aktivit�t', 'letzteaktivit�t'
  ],

  assignedTo: [
    'zugewiesen-an', 'zugewiesen_an', 'zugewiesenan', 'assigned-to', 'assigned_to', 'assignedto',
    'zuständig', 'zustaendig', 'responsible', 'owner', 'sachbearbeiter', 'sb',
    // Broken umlauts
    'zust�ndig', 'zust�ndig'
  ]
};

export interface NormalizationResult {
  fixed: string;
  tokens: string[];
  original: string;
  repairs: string[];
}

export interface ContentAnalysis {
  hints: ContentHint[];
  patterns: {
    datePattern?: RegExp;
    emailPattern?: RegExp;
    phonePattern?: RegExp;
    zipPattern?: RegExp;
    svPattern?: RegExp;
    amsIdPattern?: RegExp;
  };
}

export interface ContentHint {
  type: 'date' | 'email' | 'phone' | 'zip' | 'svNumber' | 'amsId' | 'name' | 'address';
  confidence: number;
  samples: string[];
  pattern?: string;
}

export interface ScoringWeights {
  exactAlias: number;
  tokenOverlap: number;
  fuzzyMatch: number;
  contentHint: number;
  positionHint: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  exactAlias: 1.0,
  tokenOverlap: 0.7,
  fuzzyMatch: 0.4,
  contentHint: 0.6,
  positionHint: 0.2
};