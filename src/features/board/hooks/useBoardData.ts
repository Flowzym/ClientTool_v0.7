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

  return {
    clients: filteredClients,
    users,
    view,
    counts,
    isLoading,
    selectedIds,
    setSelectedIds,
    toggleChip,
    toggleArchived,
    setCurrentUser,
    toggleSort,
    setColumnVisibility,
    resetToDefaultView,
    refreshData
  };
}