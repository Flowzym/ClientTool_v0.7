// Helper exports for useBoardData hook
// All non-component exports moved from useBoardData.ts

import type { Client, User } from '../../domain/models';

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

export interface BoardFilters {
  chips: FilterChip[];
  showArchived: boolean;
  currentUserId: string;
}

export interface BoardSort {
  mode: SortMode;
}

export interface BoardColumnVisibility {
  kunde: boolean;
  angebot: boolean;
  status: boolean;
  result: boolean;
  contactCount: boolean;
  followUp: boolean;
  assignedTo: boolean;
  note: boolean;
  amsBookingDate: boolean;
  amsAgentLastName: boolean;
  amsAgentFirstName: boolean;
  priority: boolean;
  lastActivity: boolean;
  actions: boolean;
}

export interface BoardView {
  filters: BoardFilters;
  sort: BoardSort;
  columnVisibility: BoardColumnVisibility;
}

export const defaultColumnVisibility: BoardColumnVisibility = {
  kunde: true,
  angebot: true,
  status: true,
  result: true,
  contactCount: true,
  followUp: true,
  assignedTo: true,
  note: true,
  amsBookingDate: true,
  amsAgentLastName: false,
  amsAgentFirstName: false,
  priority: true,
  lastActivity: false,
  actions: true
};

export const defaultView: BoardView = {
  filters: {
    chips: [],
    showArchived: false,
    currentUserId: 'u-sb-1'
  },
  sort: {
    mode: 'urgency'
  },
  columnVisibility: defaultColumnVisibility
};

// Storage functions
export async function loadViewFromStorage(): Promise<BoardView | null> {
  const { db } = await import('../../data/db');
  try {
    const data = await db.getKV('board.view.v1');
    if (!data) return null;
    
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  } catch (error) {
    console.warn('⚠️ Failed to load board view from storage:', error);
    return null;
  }
}

export async function saveViewToStorage(view: BoardView): Promise<void> {
  const { db } = await import('../../data/db');
  try {
    const json = JSON.stringify(view);
    const data = new TextEncoder().encode(json);
    await db.setKV('board.view.v1', data.buffer);
  } catch (error) {
    console.warn('⚠️ Failed to save board view to storage:', error);
  }
}