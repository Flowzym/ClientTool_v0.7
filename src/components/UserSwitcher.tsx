import React, { useState, useEffect } from 'react';
import { ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../app/auth/AuthProvider';
import { db } from '../data/db';
import { ensureDemoUsersIfEmpty } from '../data/seed';
import type { User as UserType } from '../domain/models';

export function UserSwitcher() {
  const { currentUser, switchUserById, impersonateRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const count = await db.users.count();
        if (count === 0) {
          await ensureDemoUsersIfEmpty();
        }
        const all = await db.users.toArray();
        setUsers((all as any) || []);
      } catch (e) {
        console.warn('UserSwitcher: load failed', e);
        setUsers([]);
      }
    })();
  }, [isOpen]);

  const available = users.filter(u => (u as any)?.active !== false);

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
        <div className="absolute right-0 mt-1 w-64 bg-white border rounded shadow-lg z-50">
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
              <div className="px-3 py-2 text-xs text-gray-600 space-y-2">
                <div className="italic">Keine Benutzer gefunden.</div>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                    onClick={async () => {
                      try { await ensureDemoUsersIfEmpty(); } catch {}
                      try {
                        const all = await db.users.toArray();
                        setUsers((all as any) || []);
                      } catch {}
                    }}
                  >Demo-User anlegen</button>
                  <button
                    className="px-2 py-1 border rounded text-xs flex items-center gap-1 hover:bg-gray-50"
                    onClick={async () => {
                      await impersonateRole('admin');
                      setIsOpen(false);
                    }}
                    title="Notausstieg: Sofort als Admin anmelden"
                  >
                    <Shield className="w-3 h-3" /> Admin jetzt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
