import React from 'react';
import { Phone, Mail, MessageSquare, UsersRound } from 'lucide-react';

export default function ContactAttemptsCell({
  id, phone = 0, sms = 0, email = 0, proxy = 0, onAdd
}: {
  id: string;
  phone?: number;
  sms?: number;
  email?: number;
  proxy?: number;
  onAdd: (channel: 'phone'|'sms'|'email'|'proxy', current: { phone?: number; sms?: number; email?: number; proxy?: number }) => void;
}) {
  const payload = { phone, sms, email, proxy };
  const Btn = ({ label, count, icon }: { label: string; count: number; icon: React.ReactNode; }) => (
    <button
      className="px-2 py-1 rounded border hover:bg-gray-50 flex items-center gap-1"
      title={`${label} +1`}
      onClick={() => onAdd(label as any, payload)}
    >
      {icon}
      <span className="text-xs">{count}</span>
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <Btn label="phone" count={phone} icon={<Phone size={14} />} />
      <Btn label="sms" count={sms} icon={<MessageSquare size={14} />} />
      <Btn label="email" count={email} icon={<Mail size={14} />} />
      <Btn label="proxy" count={proxy} icon={<UsersRound size={14} />} />
    </div>
  );
}
