/**
 * Board-Datenlogik: Filter, Sortierung, Persistenz
 */
import { useState, useEffect, useMemo } from 'react';
import { db } from '../../data/db';
import { cryptoManager } from '../../data/crypto';
import type { Client, User } from '../../domain/models';
import type { 
  FilterChip, 
  SortMode, 
  BoardFilters, 
  BoardSort, 
  BoardColumnVisibility, 
  BoardView 
} from './useBoardData.helpers';
import { defaultView, loadViewFromStorage, saveViewToStorage } from './useBoardData.helpers';

export function useBoardData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<BoardView>(defaultView);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
          setView(savedView);
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
  }, [view]);

  // Gefilterte und sortierte Clients
  const filteredClients = useMemo(() => {
    let filtered = clients;
    
    // Archiv-Filter
    if (!view.filters.showArchived) {
      filtered = filtered.filter(c => !c.isArchived);
    }
    
    // Chip-Filter
    
    view.filters.chips.forEach(chip => {
      switch (chip) {
        case 'bam':
          filtered = filtered.filter(c => c.result === 'bam');
          break;
        case 'lebenslauf':
          filtered = filtered.filter(c => c.result === 'lebenslauf');
          break;
        case 'bewerbungsbuero':
          filtered = filtered.filter(c => c.result === 'bewerbungsbuero');
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
    
    // Sortierung
    switch (view.sort.mode) {
      case 'urgency':
        filtered.sort((a, b) => {
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
  }, [clients, users, view]);

  // Zähler
  const counts = useMemo(() => {
    const total = clients.length;
    const filtered = filteredClients.length;
    const archived = clients.filter(c => c.isArchived).length;
    
    return { total, filtered, archived };
  }, [clients, filteredClients]);

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

  const setSortMode = (mode: SortMode) => {
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
    setSortMode,
    setColumnVisibility,
    resetToDefaultView,
    refreshData
  };
}