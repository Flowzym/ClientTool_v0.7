import React, { createContext, useContext } from 'react';
import { db } from '../../data/db';
import { ensureDemoUsersIfEmpty } from '../../data/seed';
import { hasPerm, hasAny, type Role, type Permission } from '../../domain/auth';

export type AuthUser = { id: string; name: string; role: Role };

export type AuthContextType = {
  currentUser: AuthUser | null;
  currentUserId: string | null;
  setCurrentUser: (u: AuthUser | null) => Promise<void>;
  switchUserById: (id: string) => Promise<void>;
  impersonateRole: (role: Role) => Promise<void>;
  role: Role;
  can: (perm: Permission) => boolean;
  canAny: (perms: Permission[]) => boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export async function initializeAuth(): Promise<AuthUser | null> {
  try {
    const params = new URLSearchParams(window.location.search);
    const asRole = params.get('as');
    const asUser = params.get('user');
    
    if (asRole === 'admin' || asRole === 'editor' || asRole === 'user') {
      return await impersonateRoleHelper(asRole as Role);
    }
    
    if (asUser) {
      return await switchUserByIdHelper(asUser);
    }

    const saved = (await db.getKV('auth:currentUserId')) as any as string | null;
    if (saved) {
      const u = await db.users.get(saved).catch(() => null);
      if (u) {
        const p = u as any;
        return { id: p.id, name: p.name, role: p.role as Role };
      }
    }

    const all = await db.users.toArray().catch(() => []);
    if (all && all.length > 0) {
      const first = all[0] as any;
      return { id: first.id, name: first.name, role: first.role as Role };
    } else {
      return { id: 'admin@local', name: 'Admin (Demo)', role: 'admin' as Role };
    }
  } catch (e) {
    console.warn('AuthProvider init failed', e);
    return { id: 'admin@local', name: 'Admin (Demo)', role: 'admin' as Role };
  }
}

export async function switchUserByIdHelper(id: string): Promise<AuthUser | null> {
  try {
    const u = await db.users.get(id);
    if (u) {
      const p = u as any;
      return { id: p.id, name: p.name, role: p.role as Role };
    } else {
      await ensureDemoUsersIfEmpty().catch(() => {});
      const again = await db.users.get(id);
      if (again) {
        const p = again as any;
        return { id: p.id, name: p.name, role: p.role as Role };
      }
    }
  } catch (e) {
    console.warn('AuthProvider: switchUserById failed', e);
  }
  return null;
}

export async function impersonateRoleHelper(role: Role): Promise<AuthUser | null> {
  try {
    const found = await db.users.where('role').equals(role).first();
    if (found) {
      const p = found as any;
      return { id: p.id, name: p.name, role: p.role as Role };
    }
    await ensureDemoUsersIfEmpty().catch(() => {});
    const again = await db.users.where('role').equals(role).first();
    if (again) {
      const p = again as any;
      return { id: p.id, name: p.name, role: p.role as Role };
    }
  } catch (e) {
    console.warn('AuthProvider: impersonateRole failed', e);
  }
  const name = role === 'admin' ? 'Admin (Demo)' : role === 'editor' ? 'Editor (Demo)' : 'User (Demo)';
  return { id: `${role}@local`, name, role };
}

export async function persistCurrentUser(user: AuthUser | null): Promise<void> {
  try {
    await db.setKV('auth:currentUserId', user ? new TextEncoder().encode(user.id) : null);
    document.dispatchEvent(new CustomEvent('auth:user-changed'));
  } catch (e) {
    console.warn('AuthProvider: persist failed', e);
  }
}

export function createAuthContextValue(
  currentUser: AuthUser | null,
  currentUserId: string | null,
  setCurrentUser: (u: AuthUser | null) => Promise<void>,
  switchUserById: (id: string) => Promise<void>,
  impersonateRole: (role: Role) => Promise<void>
): AuthContextType {
  const role: Role = currentUser?.role ?? 'user';
  const can = (perm: Permission) => hasPerm(role, perm);
  const canAny = (perms: Permission[]) => hasAny(role, perms);

  return {
    currentUser,
    currentUserId,
    setCurrentUser,
    switchUserById,
    impersonateRole,
    role,
    can,
    canAny
  };
}