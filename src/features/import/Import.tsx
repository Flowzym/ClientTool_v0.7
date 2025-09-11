import { useNavigate } from 'react-router-dom';
/**
 * Unified Import-Seite mit Excel, PDF und SharePoint-Optionen
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { 
  FileSpreadsheet, 
  FileText, 
  Building, 
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { ImportExcel } from '../import-excel/ImportExcel';
import { ImportPdf } from '../import-pdf/ImportPdf';
import { SharePointImport } from './SharePointImport';
import { configManager } from '../../data/config';

type ImportMode = 'select' | 'excel' | 'pdf' | 'sharepoint';

export function Import() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ImportMode>('select');
  const [sharepointEnabled, setSharepointEnabled] = useState(false);

  useEffect(() => {
    // SharePoint-Status laden
    configManager.isSharePointEnabled().then(setSharepointEnabled);
    
    // Config-Updates abonnieren
    const handleConfigUpdate = () => {
      configManager.isSharePointEnabled().then(setSharepointEnabled);
    };
    
    document.addEventListener('config:updated', handleConfigUpdate);
    return () => document.removeEventListener('config:updated', handleConfigUpdate);
  }, []);

  if (mode === 'excel') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('select')}>
          ← Zurück zur Auswahl
        </Button>
        <ImportExcel />
      </div>
    );
  }

  if (mode === 'pdf') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('select')}>
          ← Zurück zur Auswahl
        </Button>
        <ImportPdf />
      </div>
    );
  }

  if (mode === 'sharepoint') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('select')}>
          ← Zurück zur Auswahl
        </Button>
        <SharePointImport />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Daten Import</h2>
        <div className="flex items-center gap-2">
          <Badge variant={sharepointEnabled ? 'error' : 'success'} size="md">
            {sharepointEnabled ? 'Externe Services aktiv' : 'Local-Only Modus'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Excel/CSV Import */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                Excel/CSV Import
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Importieren Sie Klient:innendaten aus Excel- oder CSV-Dateien mit automatischem Mapping und Delta-Sync.
              </p>
              
              <div className="space-y-1 text-xs text-gray-500">
                <div>✅ .xlsx, .xls, .csv Dateien</div>
                <div>✅ Automatisches Spalten-Mapping</div>
                <div>✅ Delta-Synchronisation</div>
                <div>✅ Validierung & Dubletten-Check</div>
              </div>
              
              <Button variant="primary" size="sm" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Excel/CSV auswählen
              </Button>
            </div>
          </CardContent>
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => navigate('/import/excel')}
            aria-label="Excel/CSV Import auswählen"
          />
        </Card>

        {/* PDF Import */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-red-600" />
                PDF Import
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Extrahieren Sie strukturierte Daten aus PDF-Dokumenten mit automatischer Regex-Erkennung.
              </p>
              
              <div className="space-y-1 text-xs text-gray-500">
                <div>✅ Text-PDFs (keine Scans)</div>
                <div>✅ Automatische Feld-Erkennung</div>
                <div>✅ AMS-ID, Namen, Kontaktdaten</div>
                <div>✅ Manuelles Mapping</div>
              </div>
              
              <Button variant="primary" size="sm" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                PDF auswählen
              </Button>
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={() => navigate('/import/pdf')}
                aria-label="PDF Import auswählen"
              />
            </div>
          </CardContent>
        </Card>

        {/* SharePoint Import */}
        <Card 
          className={`transition-all ${
            sharepointEnabled 
              ? 'cursor-pointer hover:shadow-md border-yellow-300 bg-yellow-50 relative' 
              : 'opacity-50 cursor-not-allowed bg-gray-50'
          }`}
        >
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Building className="w-6 h-6 text-blue-600" />
                SharePoint Import
                {sharepointEnabled && <ExternalLink className="w-4 h-4 text-yellow-600" />}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sharepointEnabled ? (
                <>
                  <p className="text-sm text-gray-600">
                    Importieren Sie Dateien direkt aus SharePoint-Bibliotheken über Microsoft Graph API.
                  </p>
                  
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>🌐 Microsoft Graph API</div>
                    <div>🔐 OAuth 2.0 Authentifizierung</div>
                    <div>📁 SharePoint-Bibliotheken durchsuchen</div>
                    <div>⚠️ Externe Netzwerkverbindung</div>
                  </div>
                  
                  <Button variant="primary" size="sm" className="w-full">
                    <Building className="w-4 h-4 mr-2" />
                    SharePoint öffnen
                  </Button>
                  <div 
                    className="absolute inset-0 cursor-pointer" 
                    onClick={() => setMode('sharepoint')}
                    aria-label="SharePoint Import auswählen"
                  />
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    SharePoint-Integration ist deaktiviert. Aktivieren Sie sie in den Admin-Einstellungen.
                  </p>
                  
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>🔒 Local-Only Modus aktiv</div>
                    <div>🛡️ Keine externen Verbindungen</div>
                    <div>⚙️ Aktivierung in Admin-Panel</div>
                  </div>
                  
                  <Button variant="secondary" size="sm" className="w-full" disabled>
                    <Building className="w-4 h-4 mr-2" />
                    Deaktiviert
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sicherheitshinweis */}
      {sharepointEnabled && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="font-medium text-yellow-800">
                  Externe Services aktiv
                </div>
                <div className="text-sm text-yellow-700">
                  Die SharePoint-Integration ist aktiviert und erlaubt externe Netzwerkverbindungen zu Microsoft-Services. 
                  Dies durchbricht den Local-Only Modus der Anwendung. Alle importierten Daten werden weiterhin 
                  lokal verschlüsselt gespeichert.
                </div>
                <div className="text-xs text-yellow-600">
                  Zum Deaktivieren: Admin → External Services → SharePoint ausschalten
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}