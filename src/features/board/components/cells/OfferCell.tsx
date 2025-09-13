import React from 'react';
import type { OfferValue } from '../../types';

const OFFERS: OfferValue[] = ['BAM', 'LL/B+', 'BwB', 'NB'];

export default function OfferCell({ id: _id, value, onChange }: { 
  id: string;
  value?: OfferValue | null; 
  onChange?: (v?: OfferValue) => void;
}) {
  const handleChange = (newValue: string) => {
    if (!newValue) {
      onChange?.(undefined);
      return;
    }
    
    // Guard: nur erlaubte Werte akzeptieren
    if (OFFERS.includes(newValue as OfferValue)) {
      onChange?.(newValue as OfferValue);
    } else {
      console.warn('OfferCell: Invalid offer value ignored:', newValue);
    }
  };

  return (
    <select
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      value={value ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Angebot auswählen"
    >
      <option value="">—</option>
      {OFFERS.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}