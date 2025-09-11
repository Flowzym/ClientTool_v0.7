import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../../data/db';
import { ensureDemoUsersIfEmpty } from '../../data/seed';
import { hasPerm, hasAny, type Role, type Permission } from '../../domain/auth';
import type { User } from '../../domain/models';

type AuthUser = { id: string; name: string; role: Role };

type AuthContextType = {
  currentUser: AuthUser | null;
  currentUserId: string | null;
  setCurrentUser: (u: AuthUser | null) => void;
  switchUserById: (id: string) => Promise<void>;
  role: Role;
  can: (perm: Permission) => boolean;
  canAny: (perms: Permission[]) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Seed: sorge dafür, dass überhaupt User existieren (admin/editor/user)
  useEffect(() => {
    ensureDemoUsersIfEmpty().catch(() => {});
  }, []);

  // Initial load of current user + optional URL impersonation (?as=admin|editor|user or ?user=<id>)
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const asRole = params.get('as');
        const asUser = params.get('user');
        if (asRole && (asRole === 'admin' || asRole === 'editor' || asRole === 'user')) {
          const found = await db.users.where('role').equals(asRole as Role).first();
          if (found) {
            await setCurrentUser({ id: (found as any).id, name: (found as any).name, role: (found as any).role as Role });
            return;
          }
        }
        if (asUser) {
          const found = await db.users.get(asUser);
          if (found) {
            await setCurrentUser({ id: (found as any).id, name: (found as any).name, role: (found as any).role as Role });
            return;
          }
        }
        // Fallback: persistierter User oder erster verfügbarer
        const id = (await db.getKV('auth:currentUserId')) as any as string | null;
        let user: any = null;
        if (id) {
          user = await db.users.get(id).catch(() => null);
        }
        if (!user) {
          const all = await db.users.toArray();
          user = all?.[0] ?? null;
        }
        if (!disposed && user) {
          setCurrentUserState({ id: user.id, name: user.name, role: (user.role as Role) });
          setCurrentUserId(user.id);
        }
      } catch (e) {
        console.warn('AuthProvider: init failed', e);
      }
    })();
    return () => { disposed = true; };
  }, []);

  async function setCurrentUser(u: AuthUser | null) {
    setCurrentUserState(u);
    setCurrentUserId(u ? u.id : null);
    try {
      await db.setKV('auth:currentUserId', u ? new TextEncoder().encode(u.id) : null);
      document.dispatchEvent(new CustomEvent('auth:user-changed'));
    } catch (e) {
      console.warn('AuthProvider: failed to persist current user', e);
    }
  }

  const switchUserById = async (id: string) => {
    try {
      const u = await db.users.get(id);
      if (u) {
        await setCurrentUser({ id: (u as any).id, name: (u as any).name, role: (u as any).role as Role });
      }
    } catch (e) {
      console.warn('AuthProvider: switchUserById failed', e);
    }
  };

  const role: Role = currentUser?.role ?? 'user';
  const can = (perm: Permission) => hasPerm(role, perm);
  const canAny = (perms: Permission[]) => hasAny(role, perms);

  return (
    <AuthContext.Provider value={{ currentUser, currentUserId, setCurrentUser, switchUserById, role, can, canAny }}>
      {children}
    </AuthContext.Provider>
  );
}
