import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ChevronDown, User } from 'lucide-react';
import { useAuth } from '../app/auth/AuthProvider';
import { db } from '../data/db';
import { ensureDemoUsersTrio } from '../data/seed';
import type { User as UserType } from '../domain/models';

export function UserSwitcher() {
  const { currentUser, switchUserById } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  // Verberge Switcher, wenn kein Wechsel sinnvoll ist
  const hide = users.length <= 1;
  if (hide) return null;
// Users laden beim Öffnen des Menüs
  const handleMenuOpen = async () => {
  if (isOpen) {
    setIsOpen(false);
    return;
  }
  try {
    const created = await ensureDemoUsersTrio();
    if (created > 0) console.debug('UserSwitcher: seeded demo users:', created);
  } catch (err) {
    console.warn('UserSwitcher: ensureDemoUsersTrio failed', err);
  }
  try {
    const all = await Promise.all(((await Promise.all((await db.users.toArray()) as any))) as any);
    console.debug('UserSwitcher: users in DB:', all.length);
    const normalized = all.map(u => ({ ...u, active: !!(u as any)?.active }));
    const list = normalized.filter(u => u.active === true);
    const roleOrder: Record<string, number> = { admin: 1, editor: 2, user: 3 };
    const sortedUsers = list.sort((a, b) =>
      (roleOrder[a.role as keyof typeof roleOrder] || 999) -
      (roleOrder[b.role as keyof typeof roleOrder] || 999)
    );
    setUsers(sortedUsers);
  } catch (err) {
    console.warn('UserSwitcher: loading users failed', err);
    setUsers([]);
  }
  setIsOpen(true);
};;;

  const handleUserSelect = async (userId: string) => {
    await switchUserById(userId);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-user-switcher]')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Verfügbare User (alle außer aktuellem)
  const availableUsers = users.filter(user => user.id !== currentUser?.id);

  return (
    <div className="relative" data-user-switcher>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMenuOpen}
        className="flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        <span className="text-xs">{currentUser?.name || 'User'}</span>
        <ChevronDown className="w-3 h-3" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-48">
          <div className="py-1">
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200">
              {currentUser?.role?.toUpperCase?.() || 'USER'}: User wechseln
            </div>
            {availableUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user.id)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.role}</div>
                </div>
              </button>
            ))}
            {availableUsers.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                Keine anderen User verfügbar
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}