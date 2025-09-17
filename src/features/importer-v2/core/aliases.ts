/**
 * Comprehensive alias dictionary for German/Austrian field mapping
 * Includes broken encoding variants and common synonyms
 */

import type { InternalField } from './types';

export const ALIASES: Record<InternalField, string[]> = {
  amsId: [
    'ams id', 'ams-id', 'amsid', 'ams nummer', 'ams-nummer', 'amsnummer',
    'ams code', 'ams-code', 'amscode', 'ams kennzeichen', 'ams-kennzeichen',
    'ams referenz', 'ams-referenz', 'amsreferenz', 'ams key', 'ams-key',
    'ams identifikation', 'ams-identifikation', 'ams ident', 'ams-ident',
    'arbeitsmarktservice id', 'arbeitsmarktservice-id', 'arbeitsmarktservice nummer',
    'ams�id', 'ams�nummer', 'ams�code' // broken variants
  ],

  firstName: [
    'vorname', 'vor name', 'vor-name', 'first name', 'firstname', 'first-name',
    'rufname', 'ruf name', 'ruf-name', 'taufname', 'tauf name', 'tauf-name',
    'name vorname', 'name-vorname', 'vn', 'fn', 'givenname', 'given name',
    'christian name', 'christian-name', 'prename', 'pre name', 'pre-name',
    'vorname�', 'vor�name', 'rufname�' // broken variants
  ],

  lastName: [
    'nachname', 'nach name', 'nach-name', 'familienname', 'familien name', 'familien-name',
    'last name', 'lastname', 'last-name', 'surname', 'sur name', 'sur-name',
    'zuname', 'zu name', 'zu-name', 'name nachname', 'name-nachname',
    'nn', 'ln', 'sn', 'family name', 'family-name', 'geschlechtsname',
    'nachname�', 'nach�name', 'familienname�', 'familien�name' // broken variants
  ],

  title: [
    'titel', 'anrede', 'ansprache', 'title', 'salutation', 'prefix',
    'akademischer titel', 'akademischer-titel', 'akademischertitel',
    'grad', 'degree', 'dr', 'prof', 'mag', 'dipl', 'ing',
    'herr', 'frau', 'mr', 'mrs', 'ms', 'miss',
    'titel�', 'anrede�', 'grad�' // broken variants
  ],

  gender: [
    'geschlecht', 'sex', 'gender', 'm/w', 'mw', 'm w', 'm-w',
    'männlich weiblich', 'männlich-weiblich', 'male female', 'male-female',
    'geschlechtsangabe', 'geschlechts angabe', 'geschlechts-angabe',
    'geschlecht�', 'geschlechtsangabe�', 'm�nnlich', 'weiblich�' // broken variants
  ],

  birthDate: [
    'geburtsdatum', 'geburts datum', 'geburts-datum', 'birth date', 'birthdate', 'birth-date',
    'geboren', 'geboren am', 'geb', 'geb.', 'date of birth', 'dob',
    'geburtstermin', 'geburts termin', 'geburts-termin', 'birthday',
    'datum geburt', 'datum-geburt', 'datumgeburt',
    'geburtsdatum�', 'geburts�datum', 'geboren�' // broken variants
  ],

  svNumber: [
    'sv nummer', 'sv-nummer', 'svnummer', 'sv nr', 'sv-nr', 'svnr',
    'sozialversicherungsnummer', 'sozialversicherungs nummer', 'sozialversicherungs-nummer',
    'social security number', 'ssn', 'social security', 'social-security',
    'versicherungsnummer', 'versicherungs nummer', 'versicherungs-nummer',
    'sv kennzeichen', 'sv-kennzeichen', 'svkennzeichen',
    'sv�nummer', 'sv�nr', 'sozialversicherungsnummer�', 'versicherungsnummer�' // broken variants
  ],

  phone: [
    'telefon', 'tel', 'tel.', 'phone', 'telefonnummer', 'telefon nummer', 'telefon-nummer',
    'handy', 'mobil', 'mobile', 'cell', 'cellular', 'smartphone',
    'festnetz', 'fest netz', 'fest-netz', 'landline', 'land line', 'land-line',
    'rufnummer', 'ruf nummer', 'ruf-nummer', 'phone number', 'phone-number',
    'kontakt', 'kontaktnummer', 'kontakt nummer', 'kontakt-nummer',
    'telefon�', 'tel�', 'handy�', 'mobil�', 'rufnummer�' // broken variants
  ],

  email: [
    'email', 'e-mail', 'e mail', 'mail', 'electronic mail', 'electronic-mail',
    'email adresse', 'email-adresse', 'emailadresse', 'e-mail adresse', 'e-mail-adresse',
    'mail adresse', 'mail-adresse', 'mailadresse', 'internet adresse', 'internet-adresse',
    'elektronische post', 'elektronische-post', 'e-post', 'epost',
    'kontakt email', 'kontakt-email', 'kontaktemail',
    'email�', 'e�mail', 'mail�', 'mailadresse�' // broken variants
  ],

  address: [
    'adresse', 'anschrift', 'wohnadresse', 'wohn adresse', 'wohn-adresse',
    'address', 'street address', 'street-address', 'home address', 'home-address',
    'straße', 'strasse', 'str', 'str.', 'street', 'st', 'st.',
    'wohnort', 'wohn ort', 'wohn-ort', 'residence', 'domicile',
    'hausadresse', 'haus adresse', 'haus-adresse',
    'adresse�', 'anschrift�', 'stra�e', 'stra�e�', 'wohnadresse�' // broken variants
  ],

  zip: [
    'plz', 'postleitzahl', 'post leitzahl', 'post-leitzahl', 'zip', 'zip code', 'zip-code',
    'postal code', 'postal-code', 'postcode', 'post code', 'post-code',
    'lkz', 'landeskennzahl', 'landes kennzahl', 'landes-kennzahl',
    'plz�', 'postleitzahl�', 'post�leitzahl' // broken variants
  ],

  city: [
    'ort', 'stadt', 'gemeinde', 'city', 'town', 'municipality',
    'wohnort', 'wohn ort', 'wohn-ort', 'heimatort', 'heimat ort', 'heimat-ort',
    'ortschaft', 'siedlung', 'place', 'location', 'locality',
    'stadtname', 'stadt name', 'stadt-name', 'ortsname', 'orts name', 'orts-name',
    'ort�', 'stadt�', 'gemeinde�', 'wohnort�' // broken variants
  ],

  countryCode: [
    'land', 'country', 'staat', 'nation', 'ländercode', 'länder code', 'länder-code',
    'country code', 'country-code', 'countrycode', 'iso code', 'iso-code', 'isocode',
    'landeskürzel', 'landes kürzel', 'landes-kürzel', 'staatscode', 'staats code', 'staats-code',
    'land�', 'l�ndercode', 'l�nder�code', 'landeskürzel�' // broken variants
  ],

  areaCode: [
    'vorwahl', 'vor wahl', 'vor-wahl', 'area code', 'area-code', 'areacode',
    'ortsvorwahl', 'orts vorwahl', 'orts-vorwahl', 'telefonvorwahl', 'telefon vorwahl', 'telefon-vorwahl',
    'regional code', 'regional-code', 'regionalcode', 'dial code', 'dial-code',
    'vorwahl�', 'vor�wahl', 'ortsvorwahl�', 'telefonvorwahl�' // broken variants
  ],

  phoneNumber: [
    'rufnummer', 'ruf nummer', 'ruf-nummer', 'telefonnummer', 'telefon nummer', 'telefon-nummer',
    'phone number', 'phone-number', 'phonenumber', 'number', 'nr', 'nr.',
    'durchwahl', 'durch wahl', 'durch-wahl', 'extension', 'ext', 'ext.',
    'rufnummer�', 'ruf�nummer', 'telefonnummer�', 'telefon�nummer' // broken variants
  ],

  amsBookingDate: [
    'ams buchung', 'ams-buchung', 'amsbuchung', 'ams buchungsdatum', 'ams-buchungsdatum',
    'ams anmeldung', 'ams-anmeldung', 'amsanmeldung', 'ams anmeldedatum', 'ams-anmeldedatum',
    'ams eintrag', 'ams-eintrag', 'amseintrag', 'ams eintragsdatum', 'ams-eintragsdatum',
    'arbeitslos gemeldet', 'arbeitslos-gemeldet', 'arbeitslosgemeldet',
    'ams�buchung', 'ams�anmeldung', 'arbeitslos�gemeldet' // broken variants
  ],

  entryDate: [
    'eintrittsdatum', 'eintritts datum', 'eintritts-datum', 'entry date', 'entry-date',
    'eintritt', 'beginn', 'start', 'startdatum', 'start datum', 'start-datum',
    'aufnahme', 'aufnahmedatum', 'aufnahme datum', 'aufnahme-datum',
    'anmeldung', 'anmeldedatum', 'anmelde datum', 'anmelde-datum',
    'eintrittsdatum�', 'eintritts�datum', 'beginn�', 'startdatum�' // broken variants
  ],

  exitDate: [
    'austrittsdatum', 'austritts datum', 'austritts-datum', 'exit date', 'exit-date',
    'austritt', 'ende', 'end', 'enddatum', 'end datum', 'end-datum',
    'abmeldung', 'abmeldedatum', 'abmelde datum', 'abmelde-datum',
    'kündigung', 'kündigungsdatum', 'kündigung datum', 'kündigung-datum',
    'austrittsdatum�', 'austritts�datum', 'ende�', 'k�ndigung' // broken variants
  ],

  amsAgentLastName: [
    'ams berater nachname', 'ams-berater-nachname', 'ams berater name',
    'ams agent nachname', 'ams-agent-nachname', 'ams agent name',
    'betreuer nachname', 'betreuer-nachname', 'betreuername',
    'sachbearbeiter nachname', 'sachbearbeiter-nachname',
    'ams�berater�nachname', 'betreuer�nachname' // broken variants
  ],

  amsAgentFirstName: [
    'ams berater vorname', 'ams-berater-vorname', 'ams berater vorname',
    'ams agent vorname', 'ams-agent-vorname', 'ams agent vorname',
    'betreuer vorname', 'betreuer-vorname', 'betreuervorname',
    'sachbearbeiter vorname', 'sachbearbeiter-vorname',
    'ams�berater�vorname', 'betreuer�vorname' // broken variants
  ],

  amsAdvisor: [
    'ams berater', 'ams-berater', 'amsberater', 'ams beraterin', 'ams-beraterin',
    'ams agent', 'ams-agent', 'amsagent', 'ams betreuer', 'ams-betreuer',
    'sachbearbeiter', 'sach bearbeiter', 'sach-bearbeiter', 'bearbeiter',
    'ansprechpartner', 'ansprech partner', 'ansprech-partner',
    'ams�berater', 'ams�agent', 'sachbearbeiter�' // broken variants
  ],

  note: [
    'notiz', 'bemerkung', 'anmerkung', 'kommentar', 'hinweis',
    'note', 'comment', 'remark', 'memo', 'observation',
    'beschreibung', 'details', 'zusatz', 'ergänzung', 'info',
    'text', 'freitext', 'frei text', 'frei-text',
    'notiz�', 'bemerkung�', 'anmerkung�', 'erg�nzung' // broken variants
  ],

  internalCode: [
    'interner code', 'interner-code', 'internercode', 'internal code', 'internal-code',
    'code', 'kennzeichen', 'kennung', 'schlüssel', 'key', 'id',
    'referenz', 'referenznummer', 'referenz nummer', 'referenz-nummer',
    'aktenzeichen', 'akten zeichen', 'akten-zeichen',
    'interner�code', 'kennzeichen�', 'schl�ssel', 'referenz�' // broken variants
  ],

  status: [
    'status', 'zustand', 'stand', 'state', 'condition',
    'bearbeitungsstatus', 'bearbeitungs status', 'bearbeitungs-status',
    'verfahrensstatus', 'verfahrens status', 'verfahrens-status',
    'fallstatus', 'fall status', 'fall-status', 'case status', 'case-status',
    'status�', 'zustand�', 'bearbeitungsstatus�' // broken variants
  ],

  priority: [
    'priorität', 'priority', 'dringlichkeit', 'wichtigkeit', 'relevanz',
    'prio', 'rang', 'ranking', 'gewichtung', 'bedeutung',
    'eiligkeit', 'urgency', 'importance', 'significance',
    'priorit�t', 'dringlichkeit�', 'wichtigkeit�' // broken variants
  ],

  result: [
    'ergebnis', 'resultat', 'result', 'outcome', 'ausgang',
    'erfolg', 'abschluss', 'fazit', 'bilanz', 'schluss',
    'endergebnis', 'end ergebnis', 'end-ergebnis', 'final result', 'final-result',
    'ergebnis�', 'resultat�', 'erfolg�', 'abschluss�' // broken variants
  ],

  angebot: [
    'angebot', 'offer', 'vorschlag', 'empfehlung', 'maßnahme',
    'kursangebot', 'kurs angebot', 'kurs-angebot', 'course offer', 'course-offer',
    'schulungsangebot', 'schulungs angebot', 'schulungs-angebot',
    'weiterbildung', 'weiter bildung', 'weiter-bildung', 'training',
    'angebot�', 'ma�nahme', 'ma�nahme�', 'weiterbildung�' // broken variants
  ],

  followUp: [
    'nachfass', 'nach fass', 'nach-fass', 'follow up', 'follow-up', 'followup',
    'nachbearbeitung', 'nach bearbeitung', 'nach-bearbeitung',
    'wiedervorlage', 'wieder vorlage', 'wieder-vorlage',
    'nachkontrolle', 'nach kontrolle', 'nach-kontrolle',
    'nachfass�', 'nach�fass', 'nachbearbeitung�', 'wiedervorlage�' // broken variants
  ],

  lastActivity: [
    'letzte aktivität', 'letzte-aktivität', 'letzteaktivität', 'last activity', 'last-activity',
    'letzter kontakt', 'letzter-kontakt', 'letzterkontakt', 'last contact', 'last-contact',
    'letzte aktion', 'letzte-aktion', 'letzteaktion', 'last action', 'last-action',
    'letzte bearbeitung', 'letzte-bearbeitung', 'letztebearbeitung',
    'letzte�aktivit�t', 'letzte�aktivit�t', 'letzter�kontakt' // broken variants
  ],

  assignedTo: [
    'zugewiesen an', 'zugewiesen-an', 'zugewiesenan', 'assigned to', 'assigned-to',
    'verantwortlich', 'zuständig', 'bearbeiter', 'sachbearbeiter',
    'betreuer', 'ansprechpartner', 'kontaktperson', 'kontakt person', 'kontakt-person',
    'owner', 'responsible', 'handler', 'agent',
    'zugewiesen�an', 'verantwortlich�', 'zust�ndig', 'betreuer�' // broken variants
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