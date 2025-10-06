export type FilterChip =
  | 'bam'
  | 'lebenslauf'
  | 'bewerbungsbuero'
  | 'km-termin'
  | 'termin-vereinbart'
  | 'mailaustausch'
  | 'rueckmeldung-erwartet'
  | 'gebucht'
  | 'absolviert'
  | 'offen'
  | 'unassigned'
  | 'priority-high'
  | 'unreachable-3plus'
  | 'entfernt-vom-tas'
  | 'assigned-me'
  | 'assigned-to'
  | 'ueberfaellig'
  | 'erledigt'
  | 'termin-nicht-eingehalten'
  | 'kein-interesse'
  | 'kontrollmeldung';

export type SortKey = 'name' | 'offer' | 'status' | 'result' | 'followUp' | 'assignedTo' | 'contacts' | 'notes' | 'priority' | 'activity' | null;
export type SortDirection = 'asc' | 'desc' | null;

export type BoardFilters = {
  chips: FilterChip[];
  showArchived: boolean;
  currentUserId?: string | null;
  assignedToId?: string | null;
};

export type BoardSort = { 
  key: SortKey;
  direction: SortDirection;
};

export type BoardColumnVisibility = {
  angebot?: boolean;
  status?: boolean;
  followUp?: boolean;
  assignedTo?: boolean;
  priority?: boolean;
};

export type BoardView = {
  filters: BoardFilters;
  sort: BoardSort;
  columnVisibility: BoardColumnVisibility;
};

export const defaultView: BoardView = {
  filters: { chips: [], showArchived: false, currentUserId: null, assignedToId: null },
  sort: { key: null, direction: null },
  columnVisibility: {
    angebot: true,
    status: true,
    followUp: true,
    assignedTo: true,
    priority: true,
  },
};

const STORAGE_KEY = 'board:view';

export async function loadViewFromStorage(): Promise<BoardView | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.filters || !parsed.sort) return null;
    return parsed as BoardView;
  } catch {
    return null;
  }
}

export async function saveViewToStorage(view: BoardView): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  } catch {
    // ignore (Quota / private mode)
  }
}

// Sorting helper functions
export const byEnum = (key: string, order: string[]) => (a: any, b: any) => {
  const ord = order.map(v => String(v).toLowerCase());
  const unknown = ord.length;
  const av = String(a?.[key] ?? '').toLowerCase();
  const bv = String(b?.[key] ?? '').toLowerCase();
  const ai = ord.indexOf(av); const bi = ord.indexOf(bv);
  const aIndex = ai === -1 ? unknown : ai;
  const bIndex = bi === -1 ? unknown : bi;
  return aIndex - bIndex;
};

export const byDateISO = (key: string) => (a: any, b: any) => {
  const aDate = a?.[key] ? new Date(a[key]).getTime() : Number.POSITIVE_INFINITY;
  const bDate = b?.[key] ? new Date(b[key]).getTime() : Number.POSITIVE_INFINITY;
  return aDate - bDate;
};

export const byNumber = (key: string) => (a: any, b: any) => {
  return Number(a?.[key] ?? 0) - Number(b?.[key] ?? 0);
};

export const withPinnedFirst = (sortFn: (a: any, b: any) => number) => (a: any, b: any) => {
  const aPinned = Boolean(a.isPinned ?? a.pinned ?? false);
  const bPinned = Boolean(b.isPinned ?? b.pinned ?? false);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return sortFn(a, b);
};