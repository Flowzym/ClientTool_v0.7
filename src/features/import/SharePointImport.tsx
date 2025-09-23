/**
 * SharePoint-Import mit Microsoft Graph API
 * Nur verfügbar wenn Feature-Flag aktiviert ist
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { 
  Building, 
  FolderOpen, 
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  LogIn
} from 'lucide-react';
import { sharepointService, type SharePointFile } from '../../services/sharepointService';
import { configManager } from '../../data/config';

type SharePointStep = 'auth' | 'browse' | 'download' | 'process';

interface SharePointState {
  isAuthenticated: boolean;
  sites: Array<{ id: string; name: string; webUrl: string }>;
  selectedSite?: string;
  files: SharePointFile[];
  selectedFile?: SharePointFile;
  downloadedData?: ArrayBuffer;
}

export function SharePointImport() {
  const [step, setStep] = useState<SharePointStep>('auth');
  const [state, setState] = useState<SharePointState>({
    isAuthenticated: false,
    sites: [],
    files: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  // Konfiguration laden
  useEffect(() => {
    configManager.getConfig().then(setConfig);
  }, []);

  // Authentifizierung
  const handleAuthenticate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const enabled = await sharepointService.isEnabled();
      if (!enabled) {
        throw new Error('SharePoint-Integration ist deaktiviert');
      }

      await sharepointService.authenticate();
      
      setState(prev => ({ ...prev, isAuthenticated: true }));
      setStep('browse');
      
    } catch (error) {
      console.error('SharePoint auth failed:', error);
      setError(error instanceof Error ? error.message : 'Authentifizierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sites laden
  const loadSites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sites = await sharepointService.listSites();
      setState(prev => ({ ...prev, sites }));
    } catch (error) {
      console.error('Failed to load sites:', error);
      setError('Fehler beim Laden der SharePoint-Sites');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dateien laden
  const loadFiles = useCallback(async (siteId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const files = await sharepointService.listFiles(siteId);
      const excelFiles = files.filter(f => 
        f.mimeType.includes('spreadsheet') || 
        f.name.toLowerCase().endsWith('.xlsx') ||
        f.name.toLowerCase().endsWith('.xls') ||
        f.name.toLowerCase().endsWith('.csv')
      );
      
      setState(prev => ({ 
        ...prev, 
        selectedSite: siteId,
        files: excelFiles 
      }));
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Fehler beim Laden der Dateien');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Datei herunterladen
  const downloadFile = useCallback(async (file: SharePointFile) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await sharepointService.downloadFile(file);
      
      setState(prev => ({ 
        ...prev, 
        selectedFile: file,
        downloadedData: data 
      }));
      
      setStep('process');
      
    } catch (error) {
      console.error('Failed to download file:', error);
      setError('Fehler beim Herunterladen der Datei');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Render-Funktionen
  const renderAuthStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            SharePoint-Authentifizierung
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Externe Verbindung erforderlich</span>
            </div>
            <div className="text-sm text-yellow-700">
              Diese Funktion stellt eine Verbindung zu Microsoft SharePoint her und durchbricht 
              den Local-Only Modus. Ihre Anmeldedaten werden nicht gespeichert.
            </div>
          </div>
          
          {config?.sharepoint && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Konfiguration:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Client ID:</span>
                  <div className="font-mono bg-gray-50 p-1 rounded">
                    {config.sharepoint.clientId || 'Nicht konfiguriert'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Tenant ID:</span>
                  <div className="font-mono bg-gray-50 p-1 rounded">
                    {config.sharepoint.tenantId || 'Nicht konfiguriert'}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleAuthenticate}
            disabled={isLoading}
            className="w-full"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {isLoading ? 'Authentifiziere...' : 'Bei SharePoint anmelden'}
          </Button>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <div className="text-sm">{error}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderBrowseStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              SharePoint-Sites
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={loadSites} disabled={isLoading} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              {isLoading ? 'Lade Sites...' : 'Sites laden'}
            </Button>
            
            {state.sites.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Verfügbare Sites:</div>
                {state.sites.map(site => (
                  <div key={site.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{site.name}</div>
                        <div className="text-xs text-gray-500">{site.webUrl}</div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => loadFiles(site.id)}
                        disabled={isLoading}
                      >
                        Dateien anzeigen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {state.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Excel/CSV-Dateien
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.files.map(file => (
                <div key={file.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB • 
                        Geändert: {new Date(file.lastModified).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={file.webUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                        title="In SharePoint öffnen"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Button 
                        size="sm" 
                        onClick={() => downloadFile(file)}
                        disabled={isLoading}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Import
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderProcessStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success-500" />
            Datei heruntergeladen
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Download erfolgreich</span>
            </div>
            <div className="text-sm text-green-700 mt-1">
              Datei &quot;{state.selectedFile?.name}&quot; wurde erfolgreich von SharePoint heruntergeladen.
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Die Datei wird nun wie ein lokaler Upload verarbeitet. Sie können den normalen 
            Import-Workflow verwenden.
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => {
              // TODO: Weiterleitung zum Excel-Import mit heruntergeladenen Daten
              setMode('excel');
            }}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Weiter zum Import
            </Button>
            
            <Button variant="ghost" onClick={() => {
              setState(prev => ({ 
                ...prev, 
                selectedFile: undefined, 
                downloadedData: undefined 
              }));
              setStep('browse');
            }}>
              Andere Datei wählen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">SharePoint Import</h2>
        <div className="flex items-center gap-2">
          <Badge variant="error" size="md">
            <ExternalLink className="w-3 h-3 mr-1" />
            Externe Verbindung
          </Badge>
          {['auth', 'browse', 'download', 'process'].map((s, index) => (
            <Badge 
              key={s} 
              variant={s === step ? 'success' : index < ['auth', 'browse', 'download', 'process'].indexOf(step) ? 'default' : 'default'}
              size="sm"
            >
              {index + 1}
            </Badge>
          ))}
        </div>
      </div>

      {step === 'auth' && renderAuthStep()}
      {step === 'browse' && renderBrowseStep()}
      {step === 'process' && renderProcessStep()}

      {error && step !== 'auth' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}