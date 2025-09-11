import { getEncryptionMode } from '../../utils/env';
import React from 'react';
import { useAuth } from './AuthProvider';
import type { Permission } from '../../domain/auth';

interface RequireProps {
  perms: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Require({ perms, children, fallback }: RequireProps) {
  const { canAny } = useAuth();

  // Listener für Auth-Änderungen (falls Component memoisiert)
  React.useEffect(() => {
    const handleAuthChange = () => {
      // Force re-render durch leeren State-Update
      // In der Praxis reicht der Context-Update meist aus
    };
    
    document.addEventListener('auth:user-changed', handleAuthChange);
    return () => document.removeEventListener('auth:user-changed', handleAuthChange);
  }, []);

  if (!canAny(perms)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-gray-400 mb-2">🔒</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Kein Zugriff
          </h3>
          <p className="text-gray-600 text-sm">
            Diese Funktion ist für Ihre Rolle nicht verfügbar.
          </p>
          {fallback}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}