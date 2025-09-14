import React from 'react';
import { X, Phone, Mail, MapPin, Copy } from 'lucide-react';
import type { Client } from '../../domain/models';
import { formatDDMMYYYY } from '../../utils/date';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value || value === '—') return;
    
    try {
      await navigator.clipboard.writeText(value);
      // Kurzes visuelles Feedback
      const button = e.currentTarget as HTMLElement;
      const originalColor = button.style.color;
      button.style.color = '#10b981';
      setTimeout(() => {
        button.style.color = originalColor;
      }, 200);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
      title={`${label} kopieren`}
      aria-label={`${label} kopieren`}
    >
      <Copy className="w-3 h-3" />
    </button>
  );
}

function FieldRow({ 
  children, 
  value, 
  label 
}: { 
  children: React.ReactNode; 
  value: string; 
  label: string; 
}) {
  return (
    <div className="group flex items-center justify-between">
      <div className="flex-1">{children}</div>
      <CopyButton value={value} label={label} />
    </div>
  );
}

export default function ClientInfoDialog({ isOpen, onClose, client }: Props) {
  if (!isOpen || !client) return null;

  const fmt = (v?: string) => (v ? String(v) : '—');
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ');
  const genderSymbol = client.gender === 'M' ? '♂' : client.gender === 'F' ? '♀' : '';
  const amsAgent = [client.amsAgentFirstName, client.amsAgentLastName].filter(Boolean).join(' ');
  const fullAddress = [
    client.address,
    [client.zip, client.city].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-info-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-[500px] max-w-[95vw] p-6">
        <button
          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100"
          onClick={onClose}
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div id="client-info-title" className="text-lg font-semibold mb-6">
            Kundendaten
          </div>

          {/* Name, Titel, Geschlecht */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <FieldRow value={name} label="Name">
              <div>
                <div className="text-gray-500 text-xs">Name</div>
                <div className="font-medium">{name || '—'}</div>
              </div>
            </FieldRow>
            
            <FieldRow value={genderSymbol} label="Geschlecht">
              <div>
                <div className="text-gray-500 text-xs">Geschlecht</div>
                <div className="text-lg">
                  {genderSymbol && (
                    <span className={genderSymbol === '♂' ? 'text-blue-600' : 'text-pink-600'}>
                      {genderSymbol}
                    </span>
                  )}
                  {!genderSymbol && '—'}
                </div>
              </div>
            </FieldRow>
          </div>

          {/* Geburtsdatum, SV-Nummer */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <FieldRow value={fmt(client.birthDate)} label="Geburtsdatum">
              <div>
                <div className="text-gray-500 text-xs">Geburtsdatum</div>
                <div>{fmt(client.birthDate)}</div>
              </div>
            </FieldRow>
            
            <FieldRow value={fmt(client.svNumber)} label="SV-Nummer">
              <div>
                <div className="text-gray-500 text-xs">SV-Nummer</div>
                <div>{fmt(client.svNumber)}</div>
              </div>
            </FieldRow>
          </div>

          {/* Trennlinie */}
          <hr className="border-gray-200" />

          {/* Kontaktdaten */}
          <div className="space-y-3 text-sm">
            <FieldRow value={fmt(client.phone)} label="Telefonnummer">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>{fmt(client.phone)}</div>
              </div>
            </FieldRow>
            
            <FieldRow value={fmt(client.email)} label="E-Mail-Adresse">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>{fmt(client.email)}</div>
              </div>
            </FieldRow>
            
            <FieldRow value={fullAddress || '—'} label="Adresse">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>{fullAddress || '—'}</div>
              </div>
            </FieldRow>
          </div>

          {/* Trennlinie */}
          <hr className="border-gray-200" />

          {/* AMS-Daten */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <FieldRow value={formatDDMMYYYY(client.amsBookingDate)} label="Zubuchungsdatum">
              <div>
                <div className="text-gray-500 text-xs">Zubuchungsdatum</div>
                <div>{formatDDMMYYYY(client.amsBookingDate) || '—'}</div>
              </div>
            </FieldRow>
            
            <FieldRow value={fmt(client.entryDate)} label="Eintritt">
              <div>
                <div className="text-gray-500 text-xs">Eintritt</div>
                <div>{fmt(client.entryDate)}</div>
              </div>
            </FieldRow>
            
            <FieldRow value={amsAgent || '—'} label="AMS-Betreuer">
              <div>
                <div className="text-gray-500 text-xs">AMS-Betreuer</div>
                <div>{amsAgent || '—'}</div>
              </div>
            </FieldRow>
            
            <FieldRow value={fmt(client.exitDate)} label="Austritt">
              <div>
                <div className="text-gray-500 text-xs">Austritt</div>
                <div>{fmt(client.exitDate)}</div>
              </div>
            </FieldRow>
          </div>

          {/* Anmerkung */}
          <div className="text-sm">
            <FieldRow value={fmt(client.note)} label="Anmerkung">
              <div>
                <div className="text-gray-500 text-xs">Anmerkung</div>
                <div className="whitespace-pre-wrap">{fmt(client.note)}</div>
              </div>
            </FieldRow>
          </div>

          {/* Trennlinie */}
          <hr className="border-gray-200" />

          {/* Notizen-Feld (TODO: Implementierung folgt) */}
          <div className="text-sm">
            <div className="text-gray-500 text-xs mb-2">Notizen</div>
            <div className="text-gray-400 italic">
              Notizfeld folgt in nächster Phase
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}