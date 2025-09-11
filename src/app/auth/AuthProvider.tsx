import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../../data/db';
import { ensureDemoUsersTrio } from '../../data/seed';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Ensure demo users in development once
  useEffect(() => {
    ensureDemoUsersTrio().catch(() => {});
  }, []);

  // Initial load of current user from KV; fallback to first available
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const id = (await db.getKV('auth:currentUserId')) as any as string | null;
        let user: any = null;
        if (id) {
          user = await db.users.get(id).catch(() => null);
        }
        if (!user) {
          const all = await db.users.toArray();
          const list = await Promise.all(all as any); // users hook returns Promises
          user = list && list[0] ? list[0] : null;
        }
        
        if (!user && Array.isArray(list) && list.length === 0) {
          // Fallback: ensure a local admin exists so the app is usable out of the box (offline-first)
          const fallback = { id: 'admin@local', name: 'Admin (Local)', role: 'admin' as Role, active: true } as any;
          try { await db.users.put(fallback); user = fallback; } catch {}
        }
    
        if (!disposed) {
          if (user) {
            setCurrentUserId((user as any).id);
            setCurrentUserState({ id: (user as any).id, name: (user as any).name, role: (user as any).role as Role });
          } else {
            setCurrentUserId(null);
            setCurrentUserState(null);
          }
        }
      } catch (e) {
        console.warn('AuthProvider: failed to restore user', e);
      }
    })();
    const onChanged = () => {
      // External changes (e.g. Sicherheit page) notify us
      (async () => {
        try {
          const id = (await db.getKV('auth:currentUserId')) as any as string | null;
          if (id) {
            const u = await db.users.get(id);
            if (u) {
              setCurrentUserId((u as any).id);
              setCurrentUserState({ id: (u as any).id, name: (u as any).name, role: (u as any).role as Role });
            }
          }
        } catch {}
      })();
    };
    document.addEventListener('auth:user-changed', onChanged as any);
    const onSwitch = (ev: any) => { try { const id = ev?.detail as string; if (id) { switchUserById(id); } } catch {} };
    document.addEventListener('auth:switch', onSwitch as any);
    return () => { disposed = true; document.removeEventListener('auth:user-changed', onChanged as any); document.removeEventListener('auth:switch', onSwitch as any); };
  }, []);

  const setCurrentUser = async (u: AuthUser | null) => {
    setCurrentUserState(u);
    setCurrentUserId(u ? u.id : null);
    try {
      if (u?.id) {
        await db.setKV('auth:currentUserId', u.id);
      } else {
        await db.setKV('auth:currentUserId', null as any);
      }
      document.dispatchEvent(new CustomEvent('auth:user-changed'));
    } catch (e) {
      console.warn('AuthProvider: failed to persist current user', e);
    }
  };

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

  const ctxValue: AuthContextType = {
    currentUser,
    currentUserId,
    setCurrentUser,
    switchUserById,
    role,
    can,
    canAny,
  };

  return <AuthContext.Provider value={ctxValue}>{children}</AuthContext.Provider>;
}
