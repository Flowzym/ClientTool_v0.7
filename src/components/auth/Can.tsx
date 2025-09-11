import React from 'react';
import { useAuth } from '../../app/auth/AuthProvider';
import type { Permission } from '../../domain/auth';

interface CanProps {
  perm: Permission;
  children: React.ReactNode;
}

export function Can({ perm, children }: CanProps) {
  const { can } = useAuth();
  
  if (!can(perm)) {
    return null;
  }
  
  return <>{children}</>;
}

interface CanAnyProps {
  perms: Permission[];
  children: React.ReactNode;
}

export function CanAny({ perms, children }: CanAnyProps) {
  const { canAny } = useAuth();
  
  if (!canAny(perms)) {
    return null;
  }
  
  return <>{children}</>;
}