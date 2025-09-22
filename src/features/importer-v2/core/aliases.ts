/**
 * Comprehensive alias dictionary for German/Austrian field names
 * Includes broken encoding variants and common synonyms
 */

import type { InternalField } from './types';

/**
 * Comprehensive alias mappings for all internal fields
 * Includes broken encoding variants (� artifacts) and regional synonyms
 */
export const ALIASES: Record<InternalField, string[]> = {
  // AMS ID
  amsId: [
    'ams', 'ams-id', 'ams_id', 'amsid', 'ams nummer', 'ams-nummer', 'amsnummer',
    'kundennummer', 'kunden-nummer', 'kunden_nummer', 'clientid', 'client-id',
    'id', 'nummer', 'number', 'kundenid', 'kunden-id',
    // Broken variants
    'ams�id', 'ams�nummer', 'kunden�nummer'
  ],

  // Names
  firstName: [
    'vorname', 'vor-name', 'vor_name', 'first name', 'firstname', 'rufname',
    'taufname', 'given name', 'givenname', 'prename',
    // Broken variants
    'vor�name', 'vorname�', 'ruf�name'
  ],
  
  lastName: [
    'nachname', 'nach-name', 'nach_name', 'last name', 'lastname', 'familienname',
    'zuname', 'surname', 'family name', 'familyname',
    // Broken variants
    'nach�name', 'nachname�', 'familien�name'
  ],
  
  title: [
    'titel', 'anrede', 'title', 'prefix', 'academic title', 'grad',
    'akademischer titel', 'dr', 'prof', 'mag', 'dipl',
    // Broken variants
    'titel�', 'an�rede'
  ],

  // Personal data
  gender: [
    'geschlecht', 'gender', 'sex', 'geschl', 'male/female', 'm/f',
    'männlich/weiblich', 'mann/frau',
    // Broken variants
    'geschlecht�', 'geschl�', 'm�nnlich', 'weib�lich'
  ],
  
  birthDate: [
    'geburtsdatum', 'geburts-datum', 'geburts_datum', 'birth date', 'birthdate',
    'geboren', 'geb', 'date of birth', 'dob', 'birthday',
    'geburtsdatum', 'geb-datum', 'geb_datum',
    // Broken variants
    'geburts�datum', 'geburtsdatum�', 'geb�datum'
  ],
  
  svNumber: [
    'sv-nummer', 'sv nummer', 'svnummer', 'sv_nummer', 'sozialversicherungsnummer',
    'social security', 'versicherungsnummer', 'sv nr', 'sv-nr', 'svnr',
    'sozialversicherung', 'sv', 'versicherung',
    // Broken variants
    'sv�nummer', 'sozialversicherungs�nummer', 'versicherungs�nummer'
  ],

  // Contact information
  phone: [
    'telefon', 'tel', 'phone', 'telephone', 'telefonnummer', 'tel-nr', 'tel nr',
    'tel_nr', 'telefon-nr', 'telefon nr', 'telefon_nr', 'handy', 'mobil',
    'mobile', 'cell', 'cellular', 'fon', 'phone number',
    // Broken variants
    'tele�fon', 'telefon�', 'telefon�nummer', 'han�dy'
  ],
  
  email: [
    'email', 'e-mail', 'e_mail', 'mail', 'e-mail-adresse', 'email-adresse',
    'emailadresse', 'e-mailadresse', 'electronic mail', 'mail-adresse',
    'mailadresse', 'email address', 'e-mail address',
    // Broken variants
    'e�mail', 'email�', 'e�mail�adresse', 'mail�adresse'
  ],
  
  address: [
    'adresse', 'address', 'straße', 'strasse', 'str', 'street', 'anschrift',
    'wohnadresse', 'wohn-adresse', 'postadresse', 'post-adresse',
    'straße und hausnummer', 'straße nr', 'straße nummer',
    // Broken variants
    'adres�se', 'stra�e', 'stra�e nr', 'ansch�rift', 'wohn�adresse'
  ],
  
  zip: [
    'plz', 'postleitzahl', 'post-leitzahl', 'post_leitzahl', 'zip', 'zipcode',
    'zip code', 'postal code', 'postalcode', 'postcode',
    // Broken variants
    'post�leitzahl', 'plz�'
  ],
  
  city: [
    'ort', 'stadt', 'city', 'place', 'wohnort', 'wohn-ort', 'wohn_ort',
    'gemeinde', 'municipality', 'location', 'locality',
    // Broken variants
    'wohn�ort', 'gemein�de'
  ],

  // Phone components
  countryCode: [
    'ländercode', 'laendercode', 'country code', 'countrycode', 'land',
    'country', 'länder-code', 'laender-code', 'vorwahl land',
    // Broken variants
    'l�ndercode', 'laender�code', 'l�nder�code'
  ],
  
  areaCode: [
    'vorwahl', 'vor-wahl', 'vor_wahl', 'area code', 'areacode', 'ortsvorwahl',
    'orts-vorwahl', 'orts_vorwahl', 'city code', 'regional code',
    // Broken variants
    'vor�wahl', 'orts�vorwahl'
  ],
  
  phoneNumber: [
    'rufnummer', 'ruf-nummer', 'ruf_nummer', 'phone number', 'phonenumber',
    'nummer', 'number', 'telefonnummer', 'anschlussnummer',
    // Broken variants
    'ruf�nummer', 'anschluss�nummer', 'telefon�nummer'
  ],

  // AMS specific dates
  amsBookingDate: [
    'zubuchung', 'zubuchungsdatum', 'zubuchu ng-datum', 'zubuchungs-datum',
    'booking date', 'bookingdate', 'ams zubuchung', 'ams-zubuchung',
    'buchung', 'buchungsdatum', 'gebucht am', 'gebucht',
    // Broken variants
    'zubu�chung', 'zubuchungs�datum', 'bu�chung'
  ],
  
  entryDate: [
    'eintritt', 'eintrittsdatum', 'eintritts-datum', 'eintritts_datum',
    'entry date', 'entrydate', 'start', 'startdatum', 'start-datum',
    'beginn', 'beginndatum', 'beginn-datum', 'von', 'ab',
    // Broken variants
    'ein�tritt', 'eintritts�datum', 'be�ginn'
  ],
  
  exitDate: [
    'austritt', 'austrittsdatum', 'austritts-datum', 'austritts_datum',
    'exit date', 'exitdate', 'end', 'enddatum', 'end-datum',
    'ende', 'bis', 'beendet', 'beendet am',
    // Broken variants
    'aus�tritt', 'austritts�datum', 'en�de'
  ],

  // AMS staff
  amsAgentLastName: [
    'ams betreuer nachname', 'ams-betreuer-nachname', 'ams betreuer name',
    'ams agent lastname', 'ams agent name', 'betreuer nachname',
    'agent nachname', 'ams nachname', 'ams name',
    // Broken variants
    'ams�betreuer', 'betreu�er', 'ams�nachname'
  ],
  
  amsAgentFirstName: [
    'ams betreuer vorname', 'ams-betreuer-vorname', 'ams agent firstname',
    'ams agent vorname', 'betreuer vorname', 'agent vorname', 'ams vorname',
    // Broken variants
    'ams�betreuer�vorname', 'betreu�er�vorname'
  ],
  
  amsAdvisor: [
    'ams berater', 'ams-berater', 'ams_berater', 'amsberater', 'berater',
    'advisor', 'adviser', 'betreuer', 'ams betreuer', 'ams-betreuer',
    'sachbearbeiter', 'sach-bearbeiter', 'fallmanager', 'fall-manager',
    // Broken variants
    'ams�berater', 'bera�ter', 'betreu�er', 'sach�bearbeiter'
  ],

  // Internal fields
  note: [
    'notiz', 'notizen', 'note', 'notes', 'bemerkung', 'bemerkungen',
    'anmerkung', 'anmerkungen', 'kommentar', 'kommentare', 'hinweis',
    'hinweise', 'text', 'beschreibung', 'info', 'information',
    // Broken variants
    'no�tiz', 'bemer�kung', 'anmer�kung', 'kommen�tar'
  ],
  
  internalCode: [
    'interner code', 'internal code', 'internalcode', 'intern code',
    'intern-code', 'intern_code', 'code', 'referenz', 'reference',
    'ref', 'internal id', 'internalid', 'intern id', 'internid',
    // Broken variants
    'inter�ner', 'inter�nal', 'refe�renz'
  ],

  // Status and workflow
  status: [
    'status', 'zustand', 'state', 'bearbeitungsstatus', 'bearbeitungs-status',
    'workflow status', 'workflowstatus', 'prozess status', 'prozessstatus',
    'fallstatus', 'fall-status', 'case status', 'casestatus',
    // Broken variants
    'sta�tus', 'zu�stand', 'bearbeitungs�status'
  ],
  
  priority: [
    'priorität', 'prioritaet', 'priority', 'prio', 'wichtigkeit', 'urgency',
    'dringlichkeit', 'rang', 'ranking', 'gewichtung', 'relevanz',
    // Broken variants
    'priorit�t', 'priorit�t', 'wichtig�keit', 'dring�lichkeit'
  ],
  
  result: [
    'ergebnis', 'result', 'resultat', 'outcome', 'ausgang', 'erfolg',
    'abschluss', 'bearbeitungsergebnis', 'bearbeitungs-ergebnis',
    'fallabschluss', 'fall-abschluss', 'resolution',
    // Broken variants
    'ergeb�nis', 'resul�tat', 'ab�schluss'
  ],
  
  angebot: [
    'angebot', 'offer', 'maßnahme', 'massnahme', 'maßnahmen', 'massnahmen',
    'programm', 'program', 'kurs', 'course', 'training', 'schulung',
    'förderung', 'foerderung', 'unterstützung', 'unterstuetzung',
    // Broken variants
    'ange�bot', 'ma�nahme', 'ma�nahmen', 'f�rderung', 'unterst�tzung'
  ],

  // Dates and activity
  followUp: [
    'follow up', 'followup', 'follow-up', 'wiedervorlage', 'wieder-vorlage',
    'wieder_vorlage', 'termin', 'nächster termin', 'naechster termin',
    'next appointment', 'next contact', 'callback', 'rückruf', 'rueckruf',
    // Broken variants
    'wieder�vorlage', 'n�chster', 'naech�ster', 'r�ckruf'
  ],
  
  lastActivity: [
    'letzte aktivität', 'letzte aktivitaet', 'last activity', 'lastactivity',
    'letzter kontakt', 'last contact', 'lastcontact', 'zuletzt aktiv',
    'zuletzt bearbeitet', 'last modified', 'lastmodified', 'updated',
    // Broken variants
    'letzte�aktivit�t', 'letz�ter', 'zuletzt�aktiv'
  ],
  
  assignedTo: [
    'zugewiesen an', 'zugewiesen', 'assigned to', 'assignedto', 'assigned',
    'zuständig', 'zustaendig', 'responsible', 'owner', 'bearbeiter',
    'sachbearbeiter', 'fallmanager', 'case manager', 'casemanager',
    // Broken variants
    'zuge�wiesen', 'zust�ndig', 'zustaen�dig', 'bear�beiter'
  ]
};

/**
 * Get all aliases for a specific field
 */
export function getAliases(field: InternalField): string[] {
  return ALIASES[field] || [];
}

/**
 * Find field by alias (case-ins ensitive)
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
 * Get all possible aliases across all fields (for search/autocomplete)
 */
export function getAllAliases(): string[] {
  const allAliases = new Set<string>();
  
  for (const aliases of Object.values(ALIASES)) {
    aliases.forEach(alias => allAliases.add(alias));
  }
  
  return Array.from(allAliases).sort();
}

/**
 * Check if an alias contains broken encoding artifacts
 */
export function hasBrokenEncoding(alias: string): boolean {
  return alias.includes('�') || 
         alias.includes('Ã¤') || // ä
         alias.includes('Ã¶') || // ö
         alias.includes('Ã¼') || // ü
         alias.includes('ÃŸ') || // ß
         alias.includes('Ã„') || // Ä
         alias.includes('Ã–') || // Ö
         alias.includes('Ãœ');   // Ü
}

/**
 * Get statistics about alias coverage
 */
export function getAliasStats() {
  const stats = {
    totalFields: Object.keys(ALIASES).length,
    totalAliases: 0,
    brokenEncodingAliases: 0,
    averageAliasesPerField: 0,
    fieldCoverage: {} as Record<InternalField, number>
  };
  
  for (const [field, aliases] of Object.entries(ALIASES)) {
    stats.totalAliases += aliases.length;
    stats.brokenEncodingAliases += aliases.filter(hasBrokenEncoding).length;
    stats.fieldCoverage[field as InternalField] = aliases.length;
  }
  
  stats.averageAliasesPerField = Math.round(stats.totalAliases / stats.totalFields);
  
  return stats;
}