import React, { useState, useEffect } from 'react';
import { Users, X } from 'lucide-react';
import { db } from '../../data/db';
import type { User } from '../../domain/models';
import type { FilterChip } from './useBoardData.helpers';

export function SidebarFilters() {
  const [activeChips, setActiveChips] = useState<FilterChip[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<string[]>([]);
  const [showUserPopup, setShowUserPopup] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await db.users.toArray();
        setUsers(userList);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Listen for board view updates
  useEffect(() => {
    const handleViewUpdated = (event: CustomEvent) => {
      const { chips, showArchived: archived } = event.detail;
      setActiveChips(chips || []);
      setShowArchived(archived || false);
    };

    window.addEventListener('board:viewUpdated', handleViewUpdated as EventListener);
    
    // Request initial state from board
    window.dispatchEvent(new CustomEvent('board:requestViewUpdate'));
    
    return () => {
      window.removeEventListener('board:viewUpdated', handleViewUpdated as EventListener);
    };
  }, []);

  const handleFilterToggle = (chip: FilterChip) => {
    window.dispatchEvent(new CustomEvent('board:toggleChip', { detail: chip }));
  };

  const handleArchiveToggle = () => {
    window.dispatchEvent(new CustomEvent('board:toggleArchived'));
  };

  const handleUserToggle = (userId: string) => {
    const newSelectedUsers = selectedAssignedUsers.includes(userId)
      ? selectedAssignedUsers.filter(id => id !== userId)
      : [...selectedAssignedUsers, userId];
    
    setSelectedAssignedUsers(newSelectedUsers);
    
    window.dispatchEvent(new CustomEvent('board:filterAssignedTo', {
      detail: newSelectedUsers
    }));
  };

  const filterButtons: Array<{ key: FilterChip; label: string }> = [
    { key: 'bam', label: 'BAM' },
    { key: 'lebenslauf', label: 'Lebenslauf' },
    { key: 'bewerbungsbuero', label: 'BwB' },
    { key: 'mailaustausch', label: 'Mailaustausch' },
    { key: 'offen', label: 'Offen' },
    { key: 'unassigned', label: 'Ohne Zuständigkeit' },
    { key: 'priority-high', label: 'Hohe Priorität' },
    { key: 'unreachable-3plus', label: '≥3 Kontaktversuche' },
    { key: 'entfernt-vom-tas', label: 'Entfernt vom TAS' },
    { key: 'assigned-me', label: 'Ich' }
  ];

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleFilterToggle(key)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                activeChips.includes(key)
                  ? 'bg-blue-500 border-blue-500 text-white font-medium'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          
          {/* Zuständigkeit Button */}
          <button
            onClick={() => setShowUserPopup(true)}
            className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
              selectedAssignedUsers.length > 0
                ? 'bg-blue-500 border-blue-500 text-white font-medium'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-3 h-3" />
            Zuständigkeit
            {selectedAssignedUsers.length > 0 && (
              <span className="ml-1 px-1 py-0.5 bg-blue-600 text-white rounded-full text-xs font-medium">
                {selectedAssignedUsers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Archiv Checkbox */}
      <div className="pt-2">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={handleArchiveToggle}
            className="rounded border-gray-300"
          />
          Archiv
        </label>
      </div>

      {/* User Selection Popup */}
      {showUserPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Zuständigkeit auswählen</h3>
              <button
                onClick={() => setShowUserPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAssignedUsers.includes(user.id)}
                    onChange={() => handleUserToggle(user.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{user.name}</span>
                </label>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowUserPopup(false)}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}