/**
 * Development page for testing Importer V2
 * Only accessible when FEATURES.IMPORTER_V2 is enabled
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { 
  FileSpreadsheet, 
  Settings, 
  TestTube,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { MappingWizard } from '../features/importer-v2/ui/MappingWizard';
import { FEATURES } from '../config/featureFlags';

export function ImporterV2Page() {
  const [showWizard, setShowWizard] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Guard: Only show if feature flag is enabled
  if (!FEATURES.IMPORTER_V2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Importer V2 (Development)</h2>
          <Badge variant="error" size="md">
            Feature deaktiviert
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-error-500" />
                Feature-Flag erforderlich
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Importer V2 ist derzeit deaktiviert. Um die neue Import-Pipeline zu testen:
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-mono">
                  <div className="text-gray-500 mb-2">// In Browser-Konsole:</div>
                  <div className="text-blue-600">
                    import('{window.location.origin}/src/config/featureFlags.js')<br />
                    .then(m => m.setFeatureFlag('IMPORTER_V2', true))<br />
                    .then(() => location.reload())
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Oder setzen Sie <code>FEATURES.IMPORTER_V2 = true</code> in <code>src/config/featureFlags.ts</code> 
                und laden Sie die Seite neu.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleWizardComplete = (mappings: Record<string, string>) => {
    console.log('🎉 Importer V2 Wizard completed:', mappings);
    setTestResults({
      success: true,
      mappings,
      timestamp: new Date().toISOString(),
      note: 'Dry-run completed - no actual data persistence'
    });
    setShowWizard(false);
  };

  const handleWizardCancel = () => {
    console.log('❌ Importer V2 Wizard cancelled');
    setShowWizard(false);
  };

  if (showWizard) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => setShowWizard(false)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Dev-Übersicht
        </Button>
        
        <MappingWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Importer V2 (Development)</h2>
        <Badge variant="success" size="md">
          <TestTube className="w-3 h-3 mr-1" />
          Experimental
        </Badge>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Enhanced Import Pipeline
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Die neue Import-Pipeline bietet erweiterte Features für intelligentes Spalten-Mapping 
              und robuste Datenverarbeitung.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Neue Features:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✅ Intelligentes Auto-Mapping</li>
                  <li>✅ Mojibake-Reparatur (Stra�e → Straße)</li>
                  <li>✅ Fuzzy Header-Matching</li>
                  <li>✅ Content-basierte Hints</li>
                  <li>✅ Custom-Field-Editor</li>
                  <li>✅ Template-System</li>
                  <li>✅ Erweiterte Validierung</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Verbesserungen:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>🔧 Robuste Header-Normalisierung</li>
                  <li>🔧 Österreich/Deutschland-spezifische Patterns</li>
                  <li>🔧 Mapping-Qualitäts-Scoring</li>
                  <li>🔧 Template-basierte Wiederverwendung</li>
                  <li>🔧 Interaktive Mapping-Korrektur</li>
                  <li>🔧 Comprehensive Validation</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Test-Umgebung
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Testen Sie die neue Import-Pipeline in einer sicheren Umgebung ohne Auswirkungen 
              auf bestehende Daten.
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => setShowWizard(true)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Mapping-Wizard starten
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => {
                  console.log('🔧 Importer V2 Core modules:', {
                    normalize: 'Header normalization with mojibake repair',
                    aliases: 'Comprehensive German/Austrian field aliases',
                    score: 'Intelligent column mapping scoring',
                    detect: 'Content-based field detection',
                    validate: 'Enhanced validation with domain rules'
                  });
                }}
              >
                Core-Module testen
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded">
              <div className="font-medium mb-1">⚠️ Development-Modus</div>
              <div>
                Alle Importer-V2-Operationen sind Dry-Runs ohne echte Datenpersistenz. 
                Bestehende Import-Funktionen bleiben unverändert.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success-500" />
                Letzter Test-Lauf
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium text-success-500">
                  Wizard erfolgreich abgeschlossen
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(testResults.timestamp).toLocaleString('de-DE')}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs font-mono">
                  <div className="text-gray-500 mb-1">Mapping-Ergebnis:</div>
                  <pre className="text-gray-700">
                    {JSON.stringify(testResults.mappings, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                {testResults.note}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Development Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Development Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <strong>Zugriff:</strong> Diese Seite ist nur in Development-Builds verfügbar 
              und erfordert das IMPORTER_V2 Feature-Flag.
            </div>
            <div>
              <strong>Testing:</strong> Alle Wizard-Schritte sind funktional, aber ohne 
              echte Datenpersistenz. Ideal für UI/UX-Testing.
            </div>
            <div>
              <strong>Integration:</strong> Nach erfolgreichem Testing kann die Pipeline 
              in den Haupt-Import-Flow integriert werden.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}