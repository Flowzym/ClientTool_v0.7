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

export async function saveViewToStorage(view: BoardView): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  } catch {
    // ignore (Quota / private mode)
  }
}

// Generic comparators for sorting
export function byString(field: string) {
  return (a: any, b: any) => {
    const aVal = (a[field] ?? '').toString().trim();
    const bVal = (b[field] ?? '').toString().trim();
    
    // Empty values go to bottom
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1;
    if (!bVal) return -1;
    
    return aVal.localeCompare(bVal, 'de');
  };
}

export function byEnum(labelGetter: (value: any) => string) {
  return (a: any, b: any) => {
    const aLabel = labelGetter(a) || '';
    const bLabel = labelGetter(b) || '';
    
    // Empty values go to bottom
    if (!aLabel && !bLabel) return 0;
    if (!aLabel) return 1;
    if (!bLabel) return -1;
    
    return aLabel.localeCompare(bLabel, 'de');
  };
}

export function byDateISO(field: string) {
  return (a: any, b: any) => {
    const aVal = a[field];
    const bVal = b[field];
    
    // Empty values go to bottom
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1;
    if (!bVal) return -1;
    
    return new Date(aVal).getTime() - new Date(bVal).getTime();
  };
}

export function byNumber(field: string) {
  return (a: any, b: any) => {
    const aVal = Number(a[field]) || 0;
    const bVal = Number(b[field]) || 0;
    
    return aVal - bVal;
  };
}

// Pinned-first wrapper
export function withPinnedFirst<T>(comparator: (a: T, b: T) => number) {
  return (a: T, b: T) => {
    const aPinned = !!(a as any).isPinned;
    const bPinned = !!(b as any).isPinned;
    
    // Pinned items always come first
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    // Both pinned or both unpinned - use provided comparator
    return comparator(a, b);
  };
}