import React from 'react';
import type { OfferValue } from '../../types';
import { useBoardActions } from '../../hooks/useBoardActions';

const OFFERS: OfferValue[] = ['BAM', 'LL/B+', 'BwB', 'NB'];

export default function OfferCell({ id, value }: { 
  id: string;
  value?: OfferValue | null; 
}) {
  const { setOffer } = useBoardActions();
  
  const handleChange = (newValue: string) => {
    if (!newValue) {
      setOffer(id, undefined);
      return;
    }
    
    // Guard: nur erlaubte Werte akzeptieren
    if (OFFERS.includes(newValue as OfferValue)) {
      setOffer(id, newValue as OfferValue);
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