import React from 'react';
import { Badge } from './Badge';
import { getEncryptionMode } from '../utils/env';

export function ModeBadge() {
  const mode = getEncryptionMode();
  
  const config = {
    'plain': { label: 'PLAIN', variant: 'error' as const },
    'dev-enc': { label: 'DEV-ENC', variant: 'warning' as const },
    'prod-enc': { label: 'PROD-ENC', variant: 'success' as const }
  };
  
  const { label, variant } = config[mode];
  
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}