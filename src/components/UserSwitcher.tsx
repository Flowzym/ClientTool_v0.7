import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../app/auth/AuthProvider';
import { db } from '../data/db';
import { ensureDemoUsersIfEmpty } from '../data/seed';
import type { User as UserType } from '../domain/models';

export function UserSwitcher() {
  const { currentUser, switchUserById } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);

  const loadUsers = useCallback(async () => {
    const all = await db.users.toArray();
    setUsers((all as any) || []);
  }, []);

  useEffect(() => {
    (async () => {
      await ensureDemoUsersIfEmpty();
      await loadUsers();
    })();
  }, [loadUsers]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const count = await db.users.count();
      if (count === 0) {
        await ensureDemoUsersIfEmpty();
      }
      await loadUsers();
    })();
  }, [isOpen, loadUsers]);

  const available = users.filter(u => u && (u as any).active !== false);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-2 py-1 border rounded text-sm"
        onClick={() => setIsOpen(v => !v)}
        title={currentUser ? `Angemeldet: ${currentUser.name}` : 'Benutzer wechseln'}
      >
        <span>{currentUser?.name ?? 'Benutzer'}</span>
        <ChevronDown className="w-4 h-4 opacity-70" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white border rounded shadow-lg z-50">
          <div className="max-h-72 overflow-auto py-1">
            {available.map((user) => (
              <button
                key={(user as any).id}
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={async () => {
                  await switchUserById((user as any).id);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium text-sm">{(user as any).name}</div>
                <div className="text-xs text-gray-500">{(user as any).role}</div>
              </button>
            ))}
            {available.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500 italic">
                Keine User gefunden – wurden Demo-User angelegt?
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
