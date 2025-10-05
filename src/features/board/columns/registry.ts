import type { ColumnDef, ColumnKey } from './types';
import { formatPhoneNumber } from '../utils/phone';

/**
 * Zentrale Column-Registry für Board-Spalten
 * Bestehende Spalten bleiben sichtbar, neue Felder sind optional
 */

export const COLUMN_REGISTRY: ColumnDef[] = [
  // Bestehende Board-Spalten (sichtbar)
  {
    key: 'name',
    label: 'Kunde',
    visibleDefault: true,
    minWidth: 240,
    sortable: true,
    category: 'core'
  },
  {
    key: 'offer',
    label: 'Angebot',
    visibleDefault: true,
    minWidth: 120,
    sortable: true,
    category: 'core'
  },
  {
    key: 'status',
    label: 'Status',
    visibleDefault: true,
    minWidth: 140,
    sortable: true,
    category: 'core'
  },
  {
    key: 'result',
    label: 'Ergebnis',
    visibleDefault: true,
    minWidth: 140,
    sortable: true,
    category: 'core'
  },
  {
    key: 'followUp',
    label: 'Termin',
    visibleDefault: true,
    minWidth: 160,
    sortable: true,
    category: 'core'
  },
  {
    key: 'assignedTo',
    label: 'Zuständigkeit',
    visibleDefault: true,
    minWidth: 160,
    sortable: true,
    category: 'core'
  },
  {
    key: 'contacts',
    label: 'Kontakt',
    visibleDefault: true,
    minWidth: 160,
    sortable: true,
    category: 'core'
  },
  {
    key: 'notes',
    label: 'Anmerkung',
    visibleDefault: true,
    minWidth: 240,
    sortable: true,
    category: 'core'
  },
  {
    key: 'booking',
    label: 'Zubuchung',
    visibleDefault: true,
    minWidth: 120,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'priority',
    label: 'Priorität',
    visibleDefault: true,
    minWidth: 100,
    sortable: true,
    category: 'core'
  },
  {
    key: 'activity',
    label: 'Aktivität',
    visibleDefault: true,
    minWidth: 120,
    sortable: true,
    category: 'core'
  },
  {
    key: 'actions',
    label: 'Aktionen',
    visibleDefault: true,
    minWidth: 120,
    sortable: false,
    category: 'core'
  },

  // Neue Felder aus Import-Mapping (standardmäßig unsichtbar)
  {
    key: 'title',
    label: 'Titel',
    visibleDefault: false,
    minWidth: 80,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'firstName',
    label: 'Vorname',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'lastName',
    label: 'Nachname',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'gender',
    label: 'Geschlecht',
    visibleDefault: false,
    minWidth: 100,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'svNumber',
    label: 'SV-Nummer',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'birthDate',
    label: 'Geburtsdatum',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'postalCode',
    label: 'PLZ',
    visibleDefault: false,
    minWidth: 80,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'city',
    label: 'Ort',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'street',
    label: 'Straße',
    visibleDefault: false,
    minWidth: 160,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'countryDial',
    label: 'Landesvorwahl',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'areaDial',
    label: 'Vorwahl',
    visibleDefault: false,
    minWidth: 100,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'phone',
    label: 'Telefon-Nr',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'email',
    label: 'eMail-Adresse',
    visibleDefault: false,
    minWidth: 160,
    sortable: true,
    category: 'contact'
  },
  {
    key: 'bookingStatus',
    label: 'Buchungsstatus',
    visibleDefault: false,
    minWidth: 140,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'planned',
    label: 'geplant',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'entryDate',
    label: 'Eintritt',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'exitDate',
    label: 'Austritt',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'rgs',
    label: 'RGS',
    visibleDefault: false,
    minWidth: 100,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'advisorTitle',
    label: 'Titel Betreuer',
    visibleDefault: false,
    minWidth: 120,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'advisorLastName',
    label: 'Familien-/Nachname Betreuer',
    visibleDefault: false,
    minWidth: 160,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'advisorFirstName',
    label: 'Vorname Betreuer',
    visibleDefault: false,
    minWidth: 140,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'measureNumber',
    label: 'Maßnahmennummer',
    visibleDefault: false,
    minWidth: 140,
    sortable: true,
    category: 'ams'
  },
  {
    key: 'eventNumber',
    label: 'Veranstaltungsnummer',
    visibleDefault: false,
    minWidth: 160,
    sortable: true,
    category: 'ams'
  },

  // Computed Columns (optional, standardmäßig aus)
  {
    key: 'advisorFull',
    label: 'AMS-Berater',
    visibleDefault: false,
    minWidth: 200,
    sortable: true,
    category: 'computed',
    computed: (row: any) => {
      const last = row.amsAgentLastName?.trim() || '';
      const first = row.amsAgentFirstName?.trim() || '';
      const title = row.amsAgentTitle?.trim() || '';

      if (!last && !first && !title) return null;

      const parts: string[] = [];

      if (last) {
        parts.push(last);
      }

      if (first) {
        if (last) {
          parts.push(`, ${first}`);
        } else {
          parts.push(first);
        }
      }

      if (title) {
        parts.push(` (${title})`);
      }

      return parts.join('').trim();
    }
  },
  {
    key: 'phoneCombined',
    label: 'Telefonnummer',
    visibleDefault: false,
    minWidth: 160,
    sortable: true,
    category: 'computed',
    computed: (row: any) => {
      const formatted = formatPhoneNumber(row);
      return formatted === '—' ? null : formatted;
    }
  }
];

/**
 * Hole Column-Definition nach Key
 */
export function getColumnDef(key: ColumnKey): ColumnDef | null {
  return COLUMN_REGISTRY.find(col => col.key === key) || null;
}

/**
 * Hole alle Spalten einer Kategorie
 */
export function getColumnsByCategory(category: ColumnDef['category']): ColumnDef[] {
  return COLUMN_REGISTRY.filter(col => col.category === category);
}

/**
 * Hole Standard-sichtbare Spalten
 */
export function getDefaultVisibleColumns(): ColumnDef[] {
  return COLUMN_REGISTRY.filter(col => col.visibleDefault);
}

/**
 * Hole alle verfügbaren Spalten
 */
export function getAllColumns(): ColumnDef[] {
  return [...COLUMN_REGISTRY];
}