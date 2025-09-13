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
  | 'assigned-to';

export type SortMode = 'urgency' | 'activity' | 'assignee';

export type BoardFilters = {
  chips: FilterChip[];
  showArchived: boolean;
  currentUserId?: string | null;
  assignedToId?: string | null;
};

export type BoardSort = { mode: SortMode };

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
  sort: { mode: 'urgency' },
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
