import React from 'react';
import { Badge } from './Badge';
import { useAuth } from '../app/auth/AuthProvider';

export function RoleBadge() {
  const { role } = useAuth();
  
  if (!role) return null;
  
  const config = {
    'admin': { label: 'ADMIN', variant: 'error' as const },
    'editor': { label: 'EDITOR', variant: 'warning' as const },
    'user': { label: 'USER', variant: 'default' as const }
  };
  
  const { label, variant } = config[role];
  
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}