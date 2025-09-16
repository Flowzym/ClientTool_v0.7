/**
 * Development playground for Importer V2
 * Accessible via /dev/importer-v2 when feature flag is enabled
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Badge } from '../components/Badge';
import { Wand2, AlertCircle } from 'lucide-react';
import { MappingWizard } from '../features/importer-v2';
import { FEATURES } from '../config/featureFlags';

export function ImporterV2Playground() {
  const handleImport = async (data: any[], mapping: any) => {
    console.log('🚀 Import V2 executed:', { 
      records: data.length, 
      mappings: Object.keys(mapping).length 
    });
    
    // TODO: Integrate with actual import pipeline
    alert(`Import V2: ${data.length} Datensätze verarbeitet`);
  };

  const handleCancel = () => {
    console.log('Import V2 cancelled');
  };

  if (!FEATURES.IMPORTER_V2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Importer V2 Playground</h2>
          <Badge variant="error" size="md">Feature deaktiviert</Badge>
        </div>
        
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 text-gray-600">
              <AlertCircle className="w-5 h-5" />
              <div>
                <div className="font-medium">Importer V2 ist deaktiviert</div>
                <div className="text-sm mt-1">
                  Aktivieren Sie das Feature in <code>src/config/featureFlags.ts</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Importer V2 Playground</h2>
        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">
            <Wand2 className="w-3 h-3 mr-1" />
            Enhanced Import
          </Badge>
          <Badge variant="warning" size="md">Development Only</Badge>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium">Intelligentes Mapping</div>
              <ul className="text-gray-600 space-y-1 ml-4 list-disc">
                <li>Automatische Spalten-Erkennung</li>
                <li>Reparatur kaputter Umlaute (Stra�e → Straße)</li>
                <li>Fuzzy-Matching für ähnliche Namen</li>
                <li>Content-Analyse für bessere Zuordnung</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Enhanced Validation</div>
              <ul className="text-gray-600 space-y-1 ml-4 list-disc">
                <li>Österreichische Telefon/PLZ-Formate</li>
                <li>SV-Nummer-Validierung</li>
                <li>Cross-Field-Konsistenz</li>
                <li>Bulk-Fix-Vorschläge</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Template-System</div>
              <ul className="text-gray-600 space-y-1 ml-4 list-disc">
                <li>Mapping-Vorlagen speichern</li>
                <li>Eigene Felder definieren</li>
                <li>Import/Export von Konfigurationen</li>
                <li>Wiederverwendbare Setups</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Transform-Optionen</div>
              <ul className="text-gray-600 space-y-1 ml-4 list-disc">
                <li>Flexible Datumsformate</li>
                <li>Telefonnummer-Aufspaltung</li>
                <li>Geschlecht-Mapping</li>
                <li>Encoding-Reparatur</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <MappingWizard
        onImport={handleImport}
        onCancel={handleCancel}
      />
    </div>
  );
}