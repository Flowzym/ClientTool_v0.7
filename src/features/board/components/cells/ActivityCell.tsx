import React from 'react';

function daysLabel(iso?: string): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const now = Date.now();
  const days = Math.floor((now - t) / (24*3600*1000));
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  return `vor ${days} Tagen`;
}

export default function ActivityCell({ value }: { value?: string }) {
  return <div className="text-sm text-gray-700">{daysLabel(value)}</div>;
}
