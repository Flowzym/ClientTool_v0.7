// Domänen-Typen für Klient:innendaten-Tool
// Exakte Typen - keine Abweichungen

export type Priority = 'niedrig' | 'normal' | 'hoch' | 'dringend';

export type Status =
  | 'offen'
  | 'inBearbeitung'
  | 'terminVereinbart'
  | 'wartetRueckmeldung'
  | 'dokumenteOffen'
  | 'foerderAbklaerung'
  | 'zugewiesenExtern'
  | 'ruht'
  | 'erledigt'
  | 'nichtErreichbar'
  | 'abgebrochen';

export type Result =
  | 'infogespraech'
  | 'terminFixiert'
  | 'nachrichtHinterlassen'
  | 'rueckrufZugesagt'
  | 'keineReaktion'
  | 'ablehnung'
  | 'massnahmeBeendet'
  | 'vermittelt'
  | 'sonstiges'
  // neue Werte für Board-UI
  | 'bam'
  | 'bewerbungsbuero'
  | 'lebenslauf'
  | 'mailaustausch'
  | 'gesundheitlicheMassnahme'
  | 'uebergabeAnAMS'
  | 'terminNichtEingehalten'
  | 'keinInteresse';

export type Angebot = 'BAM' | 'LL/B+' | 'BwB' | 'NB';

export type Channel = 'telefon' | 'sms' | 'email' | 'brief' | 'vorOrt' | 'video' | 'dritt';

export type ContactLog = {
  date: string;
  channel: Channel;
  note?: string;
};

export type Client = {
  id: string;
  amsId?: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  zip?: string;
  city?: string;
  title?: string;
  gender?: string;
  svNumber?: string;
  countryCode?: string;
  areaCode?: string;
  phoneNumber?: string;
  amsBookingDate?: string;
  entryDate?: string;
  exitDate?: string;
  amsAgentLastName?: string;
  amsAgentFirstName?: string;
  note?: string;
  internalCode?: string;

  assignedTo?: string;
  priority: Priority;

  status: Status;
  result?: Result;

  angebot?: Angebot;

  followUp?: string;
  lastActivity?: string;
  contactCount: number;
  contactLog: ContactLog[];

  // Provenienz & Archiv (für Delta-Sync)
  isArchived: boolean;
  archivedAt?: string;
  sourceId?: string;            // z. B. "AMS-Export-KW36"
  rowKey?: string;              // Primär amsId, sonst Name+Geburtsdatum normalisiert
  sourceRowHash?: string;       // Hash der importrelevanten Spalten
  lastImportedAt?: string;
  lastSeenInSourceAt?: string;
  protectedFields?: (keyof Client)[];

  // Pin-Funktionalität
  isPinned?: boolean;
  pinnedAt?: string;

  // AMS-Berater Override
  amsAdvisor?: string;

  // Erweiterte AMS-Felder (für Import-Mapping)
  amsAgentTitle?: string;
  measureNumber?: string;
  eventNumber?: string;
  
  // Telefon-Komponenten (für kombinierte Anzeige)
  countryCode?: string;
  areaCode?: string;
  phoneNumber?: string;
  
  // Zusätzliche Basis-Felder
  gender?: string;
  svNumber?: string;
  zip?: string;
  city?: string;

  // Angebot
  angebot?: 'BAM' | 'LL/B+' | 'BwB' | 'NB';

  source?: {
    fileName: string;
    importedAt: string;
    mappingPreset?: string;
  };
};

export type Role = 'admin' | 'sb';

// Role type erweitert um editor und user
export type Role = 'admin' | 'editor' | 'user';

export type User = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  avatar?: string; // URL oder Base64-String für Avatar-Bild
  initials?: string; // Fallback-Initialen für Avatar
};

export type ImportSession = {
  id: string;
  sourceId: string;
  createdAt: string;
  stats: {
    created: number;
    updated: number;
    archived: number;
    deleted: number;
  };
};