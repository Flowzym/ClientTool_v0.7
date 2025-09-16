import React from 'react';
import { ResultChip } from '../../StatusChips';

export default function ResultCell({ 
  id: _id, 
  value, 
  onChange 
}: { 
  id: string;
  value?: string; 
  onChange?: (result?: string) => void;
}) {
  return (
    <ResultChip 
      value={value as any} 
      onChange={(result) => onChange?.(result)} 
      disabled={!onChange}
    />
  );
}