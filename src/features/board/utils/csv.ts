function isLikelyISODate(v: any): boolean {
  if (typeof v !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}(?:[T\s]|$)/.test(v);
}

export function formatDDMMYYYYFromISO(v: string): string {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export const CSV_LABELS: Record<string, string> = {
  id: 'ID',
  firstName: 'Vorname',
  lastName: 'Nachname',
  title: 'Titel',
  gender: 'Geschlecht',
  svNumber: 'SV-Nummer',
  birthDate: 'Geburtsdatum',
  email: 'E-Mail',
  phone: 'Telefon',
  phoneNumber: 'Telefon-Nr',
  countryCode: 'Landesvorwahl',
  areaCode: 'Vorwahl',
  address: 'Adresse',
  zip: 'PLZ',
  city: 'Ort',
  status: 'Status',
  result: 'Ergebnis',
  angebot: 'Angebot',
  followUp: 'Follow-up',
  assignedTo: 'Zuständigkeit',
  amsBookingDate: 'Zubuchung',
  entryDate: 'Eintritt',
  exitDate: 'Austritt',
  priority: 'Priorität',
  lastActivity: 'Letzte Aktivität',
  note: 'Notiz',
  amsAdvisor: 'AMS-Berater',
  amsAgentTitle: 'Titel Betreuer',
  amsAgentFirstName: 'Vorname Betreuer',
  amsAgentLastName: 'Nachname Betreuer',
  measureNumber: 'Maßnahmennummer',
  eventNumber: 'Veranstaltungsnummer',
  internalCode: 'Interner Code',
  isPinned: 'Gepinnt',
  isArchived: 'Archiviert',
};

export const CSV_TRANSFORMS: Record<string, (v:any)=>any> = {
  isPinned: (v:boolean) => v ? 'Ja' : 'Nein',
  isArchived: (v:boolean) => v ? 'Ja' : 'Nein',
  followUp: (v?:string) => v ? formatDDMMYYYYFromISO(v) : '',
  amsBookingDate: (v?:string) => v ? formatDDMMYYYYFromISO(v) : '',
  birthDate: (v?:string) => v ? formatDDMMYYYYFromISO(v) : '',
  entryDate: (v?:string) => v ? formatDDMMYYYYFromISO(v) : '',
  exitDate: (v?:string) => v ? formatDDMMYYYYFromISO(v) : '',
  gender: (v?:string) => v === 'M' ? 'Männlich' : v === 'F' ? 'Weiblich' : v || '',
};

export function escapeCsv(v: any): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes(';') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export type ToCsvOpts = {
  labels?: Record<string,string>;
  transforms?: Record<string,(v:any)=>any>;
  sep?: ',' | ';';
  withBOM?: boolean;
};

export function toCsv(rows:any[], fields:string[], opts:ToCsvOpts = {}) {
  const { labels = {}, transforms = {}, sep = ',', withBOM = false } = opts;
  const header = fields.map(f => labels[f] ?? f).join(sep);
  const lines = rows.map(r =>
    fields.map(f => {
      const raw = (r as any)[f];
      let v = transforms[f]?.(raw);
      if (v === undefined) {
        if (Array.isArray(raw)) v = raw.join(', ');
        else if (typeof raw === 'boolean') v = raw ? 'Ja' : 'Nein';
        else if (isLikelyISODate(raw)) v = formatDDMMYYYYFromISO(raw);
        else v = raw;
      }
      return escapeCsv(v);
    }).join(sep)
  );
  const csv = [header, ...lines].join('\n');
  return withBOM ? '\ufeff' + csv : csv;
}
