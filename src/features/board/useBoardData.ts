/**
 * Board-Datenlogik: Filter, Sortierung, Persistenz
 */
import { useState, useEffect, useMemo } from 'react';
import { db } from '../../data/db';
import { cryptoManager } from '../../data/crypto'; // Keep this import
import type { Client, User } from '../../domain/models';
import type { 
  FilterChip, 
  SortKey,
  SortDirection,
  BoardFilters, 
  BoardSort, 
  BoardColumnVisibility, 
  BoardView
} from './useBoardData.helpers';
import { defaultView, loadViewFromStorage, saveViewToStorage, withPinnedFirst } from './useBoardData.helpers';

// Sorting helper functions
const byString = (key: string) => (a: any, b: any) => {
  const aVal = a[key] || '';
  const bVal = b[key] || '';
  return aVal.localeCompare(bVal);
};

const byEnum = (key: string, order: string[]) => (a: any, b: any) => {
  const aIndex = order.indexOf(a[key]) || 0;
  const bIndex = order.indexOf(b[key]) || 0;
  return aIndex - bIndex;
};

const byDateISO = (key: string) => (a: any, b: any) => {
  const aDate = a[key] ? new Date(a[key]).getTime() : 0;
  const bDate = b[key] ? new Date(b[key]).getTime() : 0;
  return aDate - bDate;
};

const byNumber = (key: string) => (a: any, b: any) => {
  const aVal = a[key] || 0;
  const bVal = b[key] || 0;
  return aVal - bVal;
};

const withPinnedFirst = (sortFn: (a: any, b: any) => number) => (a: any, b: any) => {
  if (a.isPinned && !b.isPinned) return -1;
  if (!a.isPinned && b.isPinned) return 1;
  return sortFn(a, b);
};

const countNotes = (client: Client) => {
  return (client.notes || []).length;
};

export function useBoardData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<BoardView>(defaultView);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignedToFilter, setAssignedToFilter] = useState<string[]>([]);

  // Daten laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Sicherstellen, dass Crypto-Key verfügbar ist
        await cryptoManager.getActiveKey();
        if (cancelled) return;
        
        // View aus Storage laden
        const savedView = await loadViewFromStorage();
        if (cancelled) return;
        if (savedView) {
          setView({
            ...defaultView,
            ...savedView,
            filters: {
              ...defaultView.filters,
              ...savedView.filters
            },
            sort: {
              ...defaultView.sort,
              ...savedView.sort
            },
            columnVisibility: {
              ...defaultView.columnVisibility,
              ...savedView.columnVisibility
            }
          });
        }
        
        // Daten laden
        const [clientsData, usersData] = await Promise.all([
          Promise.all((await Promise.all((await db.clients.toArray()) as any)) as any),
          Promise.all((await Promise.all((await db.users.toArray()) as any)) as any)
        ]);
        
        if (cancelled) return;
        setClients(clientsData);
        setUsers(usersData);
      } catch (error) {
        console.error('❌ Board data loading failed:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // View-Änderungen persistieren
  useEffect(() => {
    saveViewToStorage(view);
    
    // Dispatch view update event
    window.dispatchEvent(new CustomEvent('board:viewUpdated', {
      detail: {
        chips: view.filters.chips,
        showArchived: view.filters.showArchived
      }
    }));
  }, [view]);

  // Listen for view update requests
  useEffect(() => {
    const handleRequestViewUpdate = () => {
      window.dispatchEvent(new CustomEvent('board:viewUpdated', {
        detail: {
          chips: view.filters.chips,
          showArchived: view.filters.showArchived
        }
      }));
    };

    const handleToggleChip = (event: CustomEvent) => {
      toggleChip(event.detail);
    };

    const handleToggleArchived = () => {
      toggleArchived();
    };

    const handleFilterAssignedTo = (event: CustomEvent) => {
      setAssignedToFilter(event.detail);
    };

    window.addEventListener('board:requestViewUpdate', handleRequestViewUpdate);
    window.addEventListener('board:toggleChip', handleToggleChip as EventListener);
    window.addEventListener('board:toggleArchived', handleToggleArchived);
    window.addEventListener('board:filterAssignedTo', handleFilterAssignedTo as EventListener);

    return () => {
      window.removeEventListener('board:requestViewUpdate', handleRequestViewUpdate);
      window.removeEventListener('board:toggleChip', handleToggleChip as EventListener);
      window.removeEventListener('board:toggleArchived', handleToggleArchived);
      window.removeEventListener('board:filterAssignedTo', handleFilterAssignedTo as EventListener);
    };
  }, [view.filters.chips, view.filters.showArchived]);

  // Gefilterte und sortierte Clients
  const filteredClients = useMemo(() => {
    let filtered = clients;
    
    // Archiv-Filter
    if (!view.filters.showArchived) {
      filtered = filtered.filter(c => !c.isArchived);
    }
    
    // Assigned to filter
    if (assignedToFilter.length > 0) {
      filtered = filtered.filter(c => 
        c.assignedTo && assignedToFilter.includes(c.assignedTo)
      );
    }
    
    // Chip-Filter
    
    view.filters.chips.forEach(chip => {
      switch (chip) {
        case 'bam':
          filtered = filtered.filter(c => c.angebot === 'bam');
          break;
        case 'lebenslauf':
          filtered = filtered.filter(c => c.angebot === 'lebenslauf');
          break;
        case 'bewerbungsbuero':
          filtered = filtered.filter(c => c.angebot === 'bewerbungsbuero');
          break;
        case 'km-termin':
          filtered = filtered.filter(c => c.result === 'gesundheitlicheMassnahme');
          break;
        case 'termin-vereinbart':
          filtered = filtered.filter(c => c.status === 'terminVereinbart');
          break;
        case 'mailaustausch':
          filtered = filtered.filter(c => c.result === 'mailaustausch');
          break;
        case 'rueckmeldung-erwartet':
          filtered = filtered.filter(c => c.status === 'wartetRueckmeldung');
          break;
        case 'gebucht':
          filtered = filtered.filter(c => c.status === 'inBearbeitung');
          break;
        case 'absolviert':
          filtered = filtered.filter(c => c.status === 'erledigt');
          break;
        case 'offen':
          filtered = filtered.filter(c => c.status === 'offen');
          break;
        case 'unassigned':
          filtered = filtered.filter(c => !c.assignedTo);
          break;
        case 'priority-high':
          filtered = filtered.filter(c => ['hoch', 'dringend'].includes(c.priority));
          break;
        case 'unreachable-3plus':
          filtered = filtered.filter(c => 
            c.contactCount >= 3 && 
            (c.status === 'nichtErreichbar' || c.result === 'keineReaktion')
          );
          break;
        case 'entfernt-vom-tas':
          filtered = filtered.filter(c => c.status === 'abgebrochen');
          break;
        case 'assigned-me':
          filtered = filtered.filter(c => c.assignedTo === view.filters.currentUserId);
          break;
        case 'assigned-to':
          // Wird durch separates Popup gehandhabt
          break;
      }
    });
    
    return filtered;
  }, [clients, users, view, assignedToFilter]);

  // Sortierte Clients
  const sortedClients = useMemo(() => {
    let sorted = [...filteredClients];
    
    // Sortierung
    if (view.sort.key && view.sort.direction) {
      const direction = view.sort.direction === 'desc' ? -1 : 1;
      
      switch (view.sort.key) {
        case 'name':
          sorted.sort(withPinnedFirst((a, b) => byString('name')(a, b) * direction));
          break;
        case 'status':
          const statusOrder = ['offen', 'terminVereinbart', 'inBearbeitung', 'wartetRueckmeldung', 'erledigt', 'nichtErreichbar', 'abgebrochen'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('status', statusOrder)(a, b) * direction));
          break;
        case 'priority':
          const priorityOrder = ['niedrig', 'normal', 'hoch', 'dringend'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('priority', priorityOrder)(a, b) * direction));
          break;
        case 'assignedTo':
          sorted.sort(withPinnedFirst((a, b) => {
            const aUser = users.find(u => u.id === a.assignedTo)?.name || '';
            const bUser = users.find(u => u.id === b.assignedTo)?.name || '';
            return aUser.localeCompare(bUser) * direction;
          }));
          break;
        case 'activity':
          sorted.sort(withPinnedFirst((a, b) => byDateISO('lastActivity')(a, b) * direction));
          break;
        case 'followUp':
          sorted.sort(withPinnedFirst((a, b) => byDateISO('followUp')(a, b) * direction));
          break;
        case 'contacts':
          sorted.sort(withPinnedFirst((a, b) => byNumber('contactCount')(a, b) * direction));
          break;
        case 'notes':
          break;
        case 'booking':
          sorted.sort(withPinnedFirst((a, b) => byDateISO('amsBookingDate')(a, b) * direction));
          break;
        case 'offer':
          const angebotOrder = ['bam', 'lebenslauf', 'bewerbungsbuero', 'gesundheitlicheMassnahme', 'mailaustausch'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('angebot', angebotOrder)(a, b) * direction));
          break;
        case 'result':
          const resultOrder = ['bam', 'lebenslauf', 'bewerbungsbuero', 'gesundheitlicheMassnahme', 'mailaustausch', 'keineReaktion'];
          sorted.sort(withPinnedFirst((a, b) => byEnum('result', resultOrder)(a, b) * direction));
          break;
      }
    } else {
      // Default sorting by urgency when no specific sort is applied
      sorted.sort((a, b) => {
        // Gepinnte Clients immer oben
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // Priority: dringend > hoch > normal > niedrig
        const priorityOrder = { dringend: 4, hoch: 3, normal: 2, niedrig: 1 };
        const aPrio = priorityOrder[a.priority] || 0;
        const bPrio = priorityOrder[b.priority] || 0;
        
        if (aPrio !== bPrio) return bPrio - aPrio;
        
        // Follow-up: frühere Termine zuerst
        if (a.followUp && b.followUp) {
          return new Date(a.followUp).getTime() - new Date(b.followUp).getTime();
        }
        if (a.followUp && !b.followUp) return -1;
        if (!a.followUp && b.followUp) return 1;
        
        // Last activity: ältere zuerst
        if (a.lastActivity && b.lastActivity) {
          return new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
        }
        
        return 0;
      });
    }
    
    return sorted;
  }, [filteredClients, view.sort, users]);

  // Legacy sorting modes for backward compatibility
  const legacySortedClients = useMemo(() => {
    let filtered = [...filteredClients];
    
    // Only apply legacy sorting if no new sort is active
    if (view.sort.key) {
      return sortedClients;
    }
    
    switch (view.sort.mode) {
      case 'urgency':
        // Already handled in default case above
        break;
        
      case 'activity':
        filtered.sort((a, b) => {
          // Gepinnte Clients immer oben
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          if (a.lastActivity && b.lastActivity) {
            return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
          }
          if (a.lastActivity && !b.lastActivity) return -1;
          if (!a.lastActivity && b.lastActivity) return 1;
          return 0;
        });
        break;
        
      case 'assignee':
        filtered.sort((a, b) => {
          // Gepinnte Clients immer oben
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          const aUser = users.find(u => u.id === a.assignedTo)?.name || '';
          const bUser = users.find(u => u.id === b.assignedTo)?.name || '';
          
          if (aUser !== bUser) return aUser.localeCompare(bUser);
          
          // Secondary: priority
          const priorityOrder = { dringend: 4, hoch: 3, normal: 2, niedrig: 1 };
          const aPrio = priorityOrder[a.priority] || 0;
          const bPrio = priorityOrder[b.priority] || 0;
          
          return bPrio - aPrio;
        });
        break;
    }
    
    return filtered;
  }, [filteredClients, sortedClients, view.sort, users]);

  // Zähler
  const counts = useMemo(() => {
    const total = clients.length;
    const filtered = sortedClients.length;
    const archived = clients.filter(c => c.isArchived).length;
    
    return { total, filtered, archived };
  }, [clients, sortedClients]);

  // Filter-Updates
  const toggleChip = (chip: FilterChip) => {
    setView(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        chips: prev.filters.chips.includes(chip)
          ? prev.filters.chips.filter(c => c !== chip)
          : [...prev.filters.chips, chip]
      }
    }));
  };

  const toggleArchived = () => {
    setView(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        showArchived: !prev.filters.showArchived
      }
    }));
  };

  const setCurrentUser = (userId: string) => {
    setView(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        currentUserId: userId
      }
    }));
  };

  const setSortMode = (mode: any) => {
    setView(prev => ({
      ...prev,
      sort: { mode }
    }));
  };

  const setColumnVisibility = (columnVisibility: Partial<BoardColumnVisibility>) => {
    setView(prev => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        ...columnVisibility
      }
    }));
  };

  const resetToDefaultView = () => {
    setView({
      ...defaultView,
      filters: {
        ...defaultView.filters,
        currentUserId: view.filters.currentUserId // Behalte aktuellen User
      }
    });
  };

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

  // Daten-Updates
  const refreshData = async () => {
    try {
      const clientsData = (await Promise.all((await db.clients.toArray()) as any));
      setClients(clientsData);
    } catch (error) {
      console.error('❌ Data refresh failed:', error);
    }
  };

  return {
    clients: sortedClients,
    users,
    view,
    counts,
    isLoading,
    selectedIds,
    setSelectedIds,
    toggleChip,
    toggleArchived,
    setCurrentUser,
    setSortMode,
    setColumnVisibility,
    resetToDefaultView,
    refreshData,
    toggleSort,
    setAssignedToFilter
  };
}