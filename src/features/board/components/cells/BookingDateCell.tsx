import React from 'react';
import { formatDDMMYYYY } from '../../utils/date';

export default function BookingDateCell({ id, value }: { id: string; value?: string }) {
  const disp = value ? (formatDDMMYYYY(value) ?? value) : '—';
  return <div className="text-sm">{disp}</div>;
}
