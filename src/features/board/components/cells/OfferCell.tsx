import React from 'react';

const OFFERS = ['BAM', 'LL/B+', 'BwB', 'NB'] as const;

export default function OfferCell({ id, value, onChange }: { id: string; value?: string; onChange?: (v?: string) => void }) {
  return (
    <select
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value || undefined)}
    >
      <option value="">—</option>
      {OFFERS.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}