import React from 'react';

type Props = {
  id: string;
  phone?: number;
  sms?: number;
  email?: number;
  proxy?: number;
  onAdd?: (channel: 'phone'|'sms'|'email'|'proxy') => void;
};

export default function ContactAttemptsCell({ id, phone=0, sms=0, email=0, proxy=0, onAdd }: Props) {
  const Btn = ({ label, count, ch }: { label: string; count: number; ch: 'phone'|'sms'|'email'|'proxy' }) => (
    <button
      className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
      onClick={()=>onAdd?.(ch)}
      title={`${label}: ${count}`}
    >
      {label} {count > 0 ? `(${count})` : ''}
    </button>
  );
  return (
    <div className="flex items-center gap-1">
      <Btn label="☎︎" count={phone} ch="phone" />
      <Btn label="✉︎" count={sms} ch="sms" />
      <Btn label="＠" count={email} ch="email" />
      <Btn label="👥" count={proxy} ch="proxy" />
    </div>
  );
}
