import type { 
  FilterChip, 
  SortKey,
  SortDirection,
  BoardFilters, 
  BoardSort, 
  BoardColumnVisibility, 
  BoardView 
} from './useBoardData.helpers';
import { 
  defaultView, 
  loadViewFromStorage, 
  saveViewToStorage,
  byString,
  byEnum,
  byDateISO,
  byNumber,
  withPinnedFirst
} from './useBoardData.helpers';

  const toggleSort = (key: SortKey) => {
    setView(prev => {
      const currentSort = prev.sort;
      
      if (currentSort.key === key) {
        // Same column: toggle direction or clear
        if (currentSort.direction === 'asc') {
          return { ...prev, sort: { key, direction: 'desc' } };
        } else if (currentSort.direction === 'desc') {
          return { ...prev, sort: { key: null, direction: null } };
        } else {
          return { ...prev, sort: { key, direction: 'asc' } };
        }
      } else {
        // Different column: start with ascending
        return { ...prev, sort: { key, direction: 'asc' } };
      }
    });
  };

  return {
    clients: filteredClients,
    users,
    view,
    setView,
    counts,
    isLoading,
    selectedIds,
    setSelectedIds,
    toggleChip,
    toggleArchived,
    setCurrentUser,
    setColumnVisibility,
    resetToDefaultView,
    refreshData
  };
}