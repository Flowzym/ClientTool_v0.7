/**
 * CSV-Export-Dialog für ausgewählte Kunden
 */
import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { X, Download } from 'lucide-react';
import { formatDDMMYYYY } from '../../utils/date';
import { supportsFSAccess } from '../../utils/env';
import type { Client, User } from '../../domain/models';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: Client[];
  users: User[];
}

interface ExportField {
  key: keyof Client | 'assignedToName' | 'fullName' | 'fullAddress';
  label: string;
  category: 'basic' | 'contact' | 'ams' | 'internal';
}

const exportFields: ExportField[] = [
  // Basis-Daten
  { key: 'amsId', label: 'AMS-ID', category: 'basic' },
  { key: 'fullName', label: 'Vollständiger Name', category: 'basic' },
  { key: 'firstName', label: 'Vorname', category: 'basic' },
  { key: 'lastName', label: 'Nachname', category: 'basic' },
  { key: 'title', label: 'Titel', category: 'basic' },
  { key: 'gender', label: 'Geschlecht', category: 'basic' },
  { key: 'birthDate', label: 'Geburtsdatum', category: 'basic' },
  { key: 'svNumber', label: 'SV-Nummer', category: 'basic' },
  
  // Kontakt-Daten
  { key: 'phone', label: 'Telefon', category: 'contact' },
  { key: 'email', label: 'E-Mail', category: 'contact' },
  { key: 'fullAddress', label: 'Vollständige Adresse', category: 'contact' },
  { key: 'address', label: 'Adresse', category: 'contact' },
  { key: 'zip', label: 'PLZ', category: 'contact' },
  { key: 'city', label: 'Ort', category: 'contact' },
  
  // AMS-Daten
  { key: 'amsBookingDate', label: 'Zubuchungsdatum', category: 'ams' },
  { key: 'entryDate', label: 'Eintritt', category: 'ams' },
  { key: 'exitDate', label: 'Austritt', category: 'ams' },
  { key: 'amsAgentFirstName', label: 'AMS-Betreuer Vorname', category: 'ams' },
  { key: 'amsAgentLastName', label: 'AMS-Betreuer Nachname', category: 'ams' },
  
  // Interne Daten
  { key: 'internalCode', label: 'Interner Code', category: 'internal' },
  { key: 'assignedToName', label: 'Zugewiesen an', category: 'internal' },
  { key: 'priority', label: 'Priorität', category: 'internal' },
  { key: 'status', label: 'Status', category: 'internal' },
  { key: 'result', label: 'Ergebnis', category: 'internal' },
  { key: 'contactCount', label: 'Kontaktversuche', category: 'internal' },
  { key: 'followUp', label: 'Follow-up Termin', category: 'internal' },
  { key: 'lastActivity', label: 'Letzte Aktivität', category: 'internal' },
  { key: 'note', label: 'Anmerkung', category: 'internal' },
  { key: 'isPinned', label: 'Angepinnt', category: 'internal' }
];

const categoryLabels = {
  basic: 'Basis-Daten',
  contact: 'Kontakt-Daten', 
  ams: 'AMS-Daten',
  internal: 'Interne Daten'
};

export function ExportDialog({ isOpen, onClose, selectedClients, users }: ExportDialogProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'fullName', 'phone', 'email', 'status', 'assignedToName', 'contactCount'
  ]);
  const [exportMode, setExportMode] = useState<'single' | 'separate'>('single');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const toggleCategory = (category: string) => {
    const categoryFields = exportFields.filter(f => f.category === category).map(f => f.key);
    const allSelected = categoryFields.every(field => selectedFields.includes(field));
    
    if (allSelected) {
      setSelectedFields(prev => prev.filter(field => !categoryFields.includes(field)));
    } else {
      setSelectedFields(prev => [...new Set([...prev, ...categoryFields])]);
    }
  };

  const formatValue = (client: Client, field: string): string => {
    switch (field) {
      case 'fullName':
        return [client.lastName, client.firstName].filter(Boolean).join(', ') + 
               (client.title ? ` (${client.title})` : '');
      case 'fullAddress':
        return [
          client.address,
          [client.zip, client.city].filter(Boolean).join(' ')
        ].filter(Boolean).join(', ');
      case 'assignedToName':
        return users.find(u => u.id === client.assignedTo)?.name || '';
      case 'birthDate':
      case 'followUp':
      case 'amsBookingDate':
      case 'entryDate':
      case 'exitDate':
        return formatDDMMYYYY((client as any)[field]) || '';
      case 'isPinned':
        return client.isPinned ? 'Ja' : 'Nein';
      case 'contactCount':
        return String(client.contactCount || 0);
      default:
        const value = (client as any)[field];
        return value != null ? String(value) : '';
    }
  };

  const generateCSV = (clients: Client[], fields: string[]): string => {
    const headers = fields.map(field => 
      exportFields.find(f => f.key === field)?.label || field
    );
    
    const rows = clients.map(client => 
      fields.map(field => {
        const value = formatValue(client, field);
        // CSV-Escaping
        if (value.includes(';') || value.includes('\n') || value.includes('"')) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      })
    );
    
    return [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert('Bitte wählen Sie mindestens ein Feld aus');
      return;
    }

    setIsExporting(true);
    
    try {
      if (exportMode === 'single') {
        // Einzelne CSV-Datei
        const csv = generateCSV(selectedClients, selectedFields);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        
        if (supportsFSAccess()) {
          // @ts-expect-error File System Access API types
          const handle = await window.showSaveFilePicker({
            suggestedName: `kunden-export-${new Date().toISOString().split('T')[0]}.csv`,
            types: [{ description: 'CSV-Datei', accept: { 'text/csv': ['.csv'] } }]
          });
          // @ts-expect-error File System Access API types
          const stream = await handle.createWritable();
          await stream.write(blob);
          await stream.close();
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `kunden-export-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
      } else {
        // Separate CSV-Dateien pro Kunde
        for (const client of selectedClients) {
          const csv = generateCSV([client], selectedFields);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const fileName = `kunde-${client.amsId || client.id}-${new Date().toISOString().split('T')[0]}.csv`;
          
          if (supportsFSAccess()) {
            // @ts-expect-error File System Access API types
            const handle = await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{ description: 'CSV-Datei', accept: { 'text/csv': ['.csv'] } }]
            });
            // @ts-expect-error File System Access API types
            const stream = await handle.createWritable();
            await stream.write(blob);
            await stream.close();
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }
      }
      
      onClose();
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    } finally {
      setIsExporting(false);
    }
  };

  const groupedFields = exportFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ExportField[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            CSV-Export ({selectedClients.length} Kunden)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Export-Modus */}
          <div>
            <label className="block text-sm font-medium mb-3">Export-Modus</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="single"
                  checked={exportMode === 'single'}
                  onChange={(e) => setExportMode(e.target.value as 'single')}
                  className="rounded border-gray-300"
                />
                <span>Einzelne CSV-Datei (alle Kunden)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="separate"
                  checked={exportMode === 'separate'}
                  onChange={(e) => setExportMode(e.target.value as 'separate')}
                  className="rounded border-gray-300"
                />
                <span>Separate CSV-Dateien (pro Kunde)</span>
              </label>
            </div>
          </div>
          
          {/* Feld-Auswahl */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Zu exportierende Felder ({selectedFields.length} ausgewählt)
            </label>
            
            <div className="space-y-4">
              {Object.entries(groupedFields).map(([category, fields]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{categoryLabels[category as keyof typeof categoryLabels]}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategory(category)}
                      className="text-xs"
                    >
                      {fields.every(f => selectedFields.includes(f.key)) ? 'Alle abwählen' : 'Alle auswählen'}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {fields.map(field => (
                      <label key={field.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.key)}
                          onChange={() => toggleField(field.key)}
                          className="rounded border-gray-300"
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Vorschau */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Vorschau (erste 3 Zeilen)</h4>
            <div className="text-xs font-mono bg-white p-2 rounded border overflow-x-auto">
              {selectedFields.length > 0 ? (
                <div>
                  <div className="font-bold text-gray-700">
                    {selectedFields.map(field => 
                      exportFields.find(f => f.key === field)?.label || field
                    ).join(';')}
                  </div>
                  {selectedClients.slice(0, 3).map((client, index) => (
                    <div key={index} className="text-gray-600">
                      {selectedFields.map(field => formatValue(client, field)).join(';')}
                    </div>
                  ))}
                  {selectedClients.length > 3 && (
                    <div className="text-gray-400 italic">
                      ... und {selectedClients.length - 3} weitere
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 italic">Keine Felder ausgewählt</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleExport}
            disabled={selectedFields.length === 0 || isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportiere...' : 'CSV exportieren'}
          </Button>
        </div>
      </div>
    </div>
  );
}