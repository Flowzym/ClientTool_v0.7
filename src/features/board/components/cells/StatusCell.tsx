import React from 'react';
import { StatusChip } from '../../StatusChips';

export default function StatusCell({ 
  id: _id, 
  value, 
  onChange 
}: { 
  id: string;
  value?: string; 
  onChange?: (status?: string) => void;
}) {
  return (
    <StatusChip 
      value={value as any} 
      onChange={(status) => onChange?.(status)} 
      disabled={!onChange}
    />
  );
}