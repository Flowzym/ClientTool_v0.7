import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../../data/db';
import { ensureDemoUsersIfEmpty } from '../../data/seed';
import { hasPerm, hasAny, type Role, type Permission } from '../../domain/auth';

type AuthUser = { id: string; name: string; role: Role };

type AuthContextType = {
  currentUser: AuthUser | null;
  currentUserId: string | null;
  setCurrentUser: (u: AuthUser | null) => Promise<void>;
  switchUserById: (id: string) => Promise<void>;
  impersonateRole: (role: Role) => Promise<void>;
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

  useEffect(() => {
    ensureDemoUsersIfEmpty().catch(() => {});
  }, []);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const asRole = params.get('as');
        const asUser = params.get('user');
        if (asRole === 'admin' || asRole === 'editor' || asRole === 'user') {
          await impersonateRole(asRole as Role);
          return;
        }
        if (asUser) {
          await switchUserById(asUser);
          return;
        }

        const saved = (await db.getKV('auth:currentUserId')) as any as string | null;
        if (saved) {
          const u = await db.users.get(saved).catch(() => null);
          if (u && !disposed) {
            const p = u as any;
            await setCurrentUser({ id: p.id, name: p.name, role: p.role as Role });
            return;
          }
        }

        const all = await db.users.toArray().catch(() => []);
        if (all && all.length > 0) {
          const first = all[0] as any;
          if (!disposed) await setCurrentUser({ id: first.id, name: first.name, role: first.role as Role });
        } else {
          if (!disposed) await setCurrentUser({ id: 'admin@local', name: 'Admin (Demo)', role: 'admin' as Role });
        }
      } catch (e) {
        console.warn('AuthProvider init failed', e);
        await setCurrentUser({ id: 'admin@local', name: 'Admin (Demo)', role: 'admin' as Role });
      }
    })();
    return () => { disposed = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setCurrentUser(u: AuthUser | null) {
    setCurrentUserState(u);
    setCurrentUserId(u ? u.id : null);
    try {
      await db.setKV('auth:currentUserId', u ? u.id : null);
      document.dispatchEvent(new CustomEvent('auth:user-changed'));
    } catch (e) {
      console.warn('AuthProvider: persist failed', e);
    }
  }

  const switchUserById = async (id: string) => {
    try {
      const u = await db.users.get(id);
      if (u) {
        const p = u as any;
        await setCurrentUser({ id: p.id, name: p.name, role: p.role as Role });
      } else {
        await ensureDemoUsersIfEmpty().catch(() => {});
        const again = await db.users.get(id);
        if (again) {
          const p = again as any;
          await setCurrentUser({ id: p.id, name: p.name, role: p.role as Role });
        }
      }
    } catch (e) {
      console.warn('AuthProvider: switchUserById failed', e);
    }
  };

  const impersonateRole = async (role: Role) => {
    try {
      const found = await db.users.where('role').equals(role).first();
      if (found) {
        const p = found as any;
        await setCurrentUser({ id: p.id, name: p.name, role: p.role as Role });
        return;
      }
      await ensureDemoUsersIfEmpty().catch(() => {});
      const again = await db.users.where('role').equals(role).first();
      if (again) {
        const p = again as any;
        await setCurrentUser({ id: p.id, name: p.name, role: p.role as Role });
        return;
      }
    } catch (e) {
      console.warn('AuthProvider: impersonateRole failed', e);
    }
    const name = role === 'admin' ? 'Admin (Demo)' : role === 'editor' ? 'Editor (Demo)' : 'User (Demo)';
    await setCurrentUser({ id: `${role}@local`, name, role });
  };

  const role: Role = currentUser?.role ?? 'user';
  const can = (perm: Permission) => hasPerm(role, perm);
  const canAny = (perms: Permission[]) => hasAny(role, perms);

  return (
    <AuthContext.Provider value={{ currentUser, currentUserId, setCurrentUser, switchUserById, impersonateRole, role, can, canAny }}>
      {children}
    </AuthContext.Provider>
  );
}
