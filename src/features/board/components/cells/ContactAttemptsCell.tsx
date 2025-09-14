import React from 'react';
import { Phone, Mail, MessageSquare, UsersRound } from 'lucide-react';
import CounterBadge from '../CounterBadge';

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
  
  const ContactButton = ({ 
    label, 
    count, 
    icon 
  }: { 
    label: 'phone' | 'sms' | 'email' | 'proxy'; 
    count: number; 
    icon: React.ReactNode; 
  }) => (
    <button
      className="relative p-2 rounded border hover:bg-gray-50 flex items-center justify-center"
      title={`${label} +1`}
      onClick={() => onAdd(label, payload)}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {icon}
      </div>
      <CounterBadge count={count} />
    </button>
  );

  return (
    <div className="flex items-center -space-x-1">
      <ContactButton label="phone" count={phone} icon={<Phone size={18} />} />
      <ContactButton label="sms" count={sms} icon={<MessageSquare size={18} />} />
      <ContactButton label="email" count={email} icon={<Mail size={18} />} />
      <ContactButton label="proxy" count={proxy} icon={<UsersRound size={18} />} />
    </div>
  );
}