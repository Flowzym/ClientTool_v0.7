import React from 'react';
import { formatDDMMYYYY } from '../../utils/date';

export default function BookingDateCell({ value }: { value?: string }) {
  const disp = value ? (formatDDMMYYYY(value) ?? value) : '—';
  return <div className="text-sm">{disp}</div>;
}
