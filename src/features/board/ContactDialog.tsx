/**
 * Kontakt +1 Dialog
 */
import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Phone, Mail, MessageSquare, FileText, Video, Users, X } from 'lucide-react';
import type { Channel } from '../../domain/models';

interface ContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (channel: Channel, note?: string) => void;
  clientName: string;
  currentStatus: string;
}

const channelOptions: Array<{ key: Channel; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'telefon', label: 'Telefon', icon: Phone },
  { key: 'email', label: 'E-Mail', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'brief', label: 'Brief', icon: FileText },
  { key: 'video', label: 'Video-Call', icon: Video },
  { key: 'vorOrt', label: 'Vor Ort', icon: Users },
  { key: 'dritt', label: 'Dritte Person', icon: Users }
];

export function ContactDialog({ isOpen, onClose, onConfirm, clientName, currentStatus }: ContactDialogProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [note, setNote] = useState('');
  const [showQuickStatus, setShowQuickStatus] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedChannel(null);
      setNote('');
      setShowQuickStatus(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    // Quick-Status-Vorschlag bei Telefon + offen
    if (selectedChannel === 'telefon' && currentStatus === 'offen') {
      setShowQuickStatus(true);
    } else {
      setShowQuickStatus(false);
    }
  }, [selectedChannel, currentStatus]);

  const handleConfirm = () => {
    if (!selectedChannel) return;
    onConfirm(selectedChannel, note.trim() || undefined);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey && selectedChannel) {
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Kontakt hinzufügen
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            Klient:in: <span className="font-medium">{clientName}</span>
          </div>
          <Badge variant="default" size="sm">
            Status: {currentStatus}
          </Badge>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kontaktkanal *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {channelOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    onClick={() => setSelectedChannel(option.key)}
                    className={`flex items-center gap-2 p-3 rounded-md border text-sm transition-colors ${
                      selectedChannel === option.key
                        ? 'border-accent-500 bg-accent-50 text-accent-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {showQuickStatus && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="text-sm text-yellow-800">
                💡 Tipp: Bei Telefonanrufen ohne Erfolg Status auf &quot;nicht erreichbar&quot; setzen?
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notiz (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kurze Notiz zum Kontakt..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1">
              {note.length}/500 Zeichen
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedChannel}
          >
            Kontakt hinzufügen
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-3">
          Tipp: Strg+Enter zum schnellen Bestätigen
        </div>
      </div>
    </div>
  );
}