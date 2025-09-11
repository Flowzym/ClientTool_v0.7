/**
 * Zuweisung an Mitarbeitende
 */
import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '../../components/Badge';
import { Avatar } from '../../components/Avatar';
import { ChevronDown, User } from 'lucide-react';
import type { User as UserType } from '../../domain/models';

interface AssignDropdownProps {
  value?: string;
  onChange: (userId?: string) => void;
  users: UserType[];
  disabled?: boolean;
}

export function AssignDropdown({ value, onChange, users, disabled }: AssignDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentUser = value ? users.find(u => u.id === value) : null;
  const activeUsers = users.filter(u => u.active);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (userId?: string) => {
    onChange(userId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className={`flex items-center gap-1 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}`}
      >
        {currentUser ? (
          <div className="flex items-center gap-1">
            <Avatar user={currentUser} size="sm" />
            <span className="text-xs font-medium">{currentUser.name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 px-2 py-1 border border-dashed border-gray-300 rounded">
            Nicht zugewiesen
          </span>
        )}
        {!disabled && <ChevronDown className="w-3 h-3 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
          <div className="py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(undefined);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-500"
            >
              Nicht zugewiesen
            </button>
            {activeUsers.map(user => (
              <button
                key={user.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(user.id);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Avatar user={user} size="sm" />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">
                    {user.role === 'admin' ? 'Administrator' : 
                     user.role === 'editor' ? 'Editor' : 'Benutzer'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}