/**
 * Sync-Einstellungen-Panel
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { 
  FolderOpen, 
  Settings, 
  RefreshCw,
  Crown,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { syncManager, type SyncHealth } from './SyncManager';
import { useAuth } from '../../app/auth/AuthProvider';
import { supportsFSAccess } from '../../utils/env';
import { db } from '../../data/db';

export function SyncSettings() {
  const { currentUser } = useAuth();
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [syncFolderName, setSyncFolderName] = useState<string | null>(null);
  const [autoSyncInterval, setAutoSyncInterval] = useState(5); // Minuten
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Einstellungen laden
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [coordinatorFlag, folderName, interval, syncHealth] = await Promise.all([
        db.getKV('sync:isCoordinator'),
        db.getKV('sync:folderName'),
        db.getKV('sync:autoInterval'),
        syncManager.getSyncStatus()
      ]);

      setIsCoordinator(!!coordinatorFlag);
      setSyncFolderName(folderName as string);
      setAutoSyncInterval(interval as number || 5);
      setHealth(syncHealth.health);
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSetupSyncFolder = async () => {
    if (!supportsFSAccess()) {
      showMessage('error', 'File System Access API nicht unterstützt in dieser Umgebung');
      return;
    }

    setIsLoading(true);
    try {
      await syncManager.setupSyncFolder();
      await loadSettings();
      showMessage('success', 'Sync-Ordner erfolgreich konfiguriert');
    } catch (error) {
      console.error('Sync folder setup failed:', error);
      showMessage('error', 'Fehler beim Konfigurieren des Sync-Ordners');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBecomeCoordinator = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      await syncManager.becomeCoordinator(currentUser.id);
      setIsCoordinator(true);
      showMessage('success', 'Coordinator-Rolle übernommen');
    } catch (error) {
      console.error('Become coordinator failed:', error);
      showMessage('error', 'Fehler beim Übernehmen der Coordinator-Rolle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!isCoordinator) return;

    setIsLoading(true);
    try {
      await syncManager.createSnapshot();
      showMessage('success', 'Snapshot für Team erstellt');
    } catch (error) {
      console.error('Create snapshot failed:', error);
      showMessage('error', 'Fehler beim Erstellen des Snapshots');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullUpdates = async () => {
    setIsLoading(true);
    try {
      const result = await syncManager.pullUpdates();
      if (result.success) {
        const total = result.applied.created + result.applied.updated + result.applied.archived;
        showMessage('success', `${total} Änderungen angewendet`);
      } else {
        showMessage('error', `Sync-Fehler: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Pull updates failed:', error);
      showMessage('error', 'Fehler beim Abrufen der Updates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAutoInterval = async () => {
    try {
      await db.setKV('sync:autoInterval', autoSyncInterval);
      showMessage('success', 'Auto-Sync-Intervall gespeichert');
    } catch (error) {
      showMessage('error', 'Fehler beim Speichern des Intervalls');
    }
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="w-4 h-4 text-success-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-error-500" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Team-Synchronisation</h2>
        <Badge variant="default" size="md">
          OneDrive/SharePoint Sync-Ordner
        </Badge>
      </div>

      {/* Nachrichten */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync-Ordner-Konfiguration */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Sync-Ordner
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">Aktueller Ordner</div>
                  <div className="text-xs text-gray-500">
                    {syncFolderName || 'Nicht konfiguriert'}
                  </div>
                </div>
                <Badge variant={syncFolderName ? 'success' : 'default'} size="sm">
                  {syncFolderName ? 'Konfiguriert' : 'Nicht konfiguriert'}
                </Badge>
              </div>
              
              <Button
                onClick={handleSetupSyncFolder}
                disabled={isLoading || !supportsFSAccess()}
                className="w-full"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {syncFolderName ? 'Ordner ändern' : 'Sync-Ordner auswählen'}
              </Button>
              
              {!supportsFSAccess() && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  File System Access API nicht verfügbar in dieser Umgebung
                </div>
              )}
              
              <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                💡 Wählen Sie einen Ordner, der von OneDrive/SharePoint synchronisiert wird
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coordinator-Rolle */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Coordinator-Rolle
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">Status</div>
                  <div className="text-xs text-gray-500">
                    {isCoordinator ? 'Sie sind Coordinator' : 'Sie sind Teilnehmer'}
                  </div>
                </div>
                <Badge variant={isCoordinator ? 'success' : 'default'} size="sm">
                  {isCoordinator ? 'Coordinator' : 'Teilnehmer'}
                </Badge>
              </div>
              
              <div className="text-xs text-gray-600">
                {isCoordinator ? (
                  'Als Coordinator erstellen Sie Snapshots nach CSV-Importen und koordinieren die Datenverteilung.'
                ) : (
                  'Als Teilnehmer erhalten Sie automatisch Updates vom Coordinator.'
                )}
              </div>
              
              {!isCoordinator && (
                <Button
                  onClick={handleBecomeCoordinator}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Coordinator werden
                </Button>
              )}
              
              {isCoordinator && (
                <Button
                  onClick={handleCreateSnapshot}
                  disabled={isLoading || !syncFolderName}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Snapshot für Team erstellen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Sync-Einstellungen */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Auto-Sync
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sync-Intervall (Minuten)
                </label>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={1}>1 Minute</option>
                  <option value={5}>5 Minuten</option>
                  <option value={15}>15 Minuten</option>
                  <option value={30}>30 Minuten</option>
                  <option value={60}>1 Stunde</option>
                </select>
              </div>
              
              <Button
                onClick={handleSaveAutoInterval}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Intervall speichern
              </Button>
              
              <Button
                onClick={handlePullUpdates}
                disabled={isLoading || !syncFolderName}
                variant="secondary"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Jetzt synchronisieren
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sync-Gesundheit */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Sync-Gesundheit
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Ordner-Zugriff:</span>
                  <div className="flex items-center gap-1">
                    {getHealthIcon(health.folderAccessible)}
                    <span>{health.folderAccessible ? 'OK' : 'Fehler'}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span>Manifest gültig:</span>
                  <div className="flex items-center gap-1">
                    {getHealthIcon(health.manifestValid)}
                    <span>{health.manifestValid ? 'OK' : 'Fehler'}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span>Verschlüsselung:</span>
                  <div className="flex items-center gap-1">
                    {getHealthIcon(health.encryptionWorking)}
                    <span>{health.encryptionWorking ? 'OK' : 'Fehler'}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span>Speicherplatz:</span>
                  <div className="flex items-center gap-1">
                    {getHealthIcon(health.diskSpaceOk)}
                    <span>{health.diskSpaceOk ? 'OK' : 'Knapp'}</span>
                  </div>
                </div>
                
                {health.lastSuccessfulSync && (
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                    Letzter erfolgreicher Sync: {new Date(health.lastSuccessfulSync).toLocaleString('de-DE')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Lade Gesundheitsstatus...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup-Anleitung */}
      {!syncFolderName && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Setup-Anleitung
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="font-medium text-blue-800">
                So richten Sie die Team-Synchronisation ein:
              </div>
              
              <ol className="list-decimal ml-4 space-y-2 text-blue-700">
                <li>
                  <strong>OneDrive-Client installieren:</strong> Stellen Sie sicher, dass der Microsoft 365 Sync Client 
                  auf allen drei PCs installiert und mit dem gleichen Tenant verbunden ist.
                </li>
                <li>
                  <strong>Gemeinsamen Ordner erstellen:</strong> Erstellen Sie in OneDrive/SharePoint einen Ordner 
                  namens "KlientenTool-Sync\" und stellen Sie sicher, dass alle drei Nutzer Zugriff haben.
                </li>
                <li>
                  <strong>Lokale Synchronisation:</strong> Synchronisieren Sie diesen Ordner auf allen drei PCs 
                  (Rechtsklick → "Immer auf diesem Gerät behalten").
                </li>
                <li>
                  <strong>Sync-Ordner in App auswählen:</strong> Klicken Sie oben auf "Sync-Ordner auswählen" 
                  und wählen Sie den lokalen Sync-Ordner aus.
                </li>
                <li>
                  <strong>Coordinator bestimmen:</strong> Ein Nutzer (derjenige, der die CSV-Dateien importiert) 
                  übernimmt die Coordinator-Rolle.
                </li>
              </ol>
              
              <div className="bg-white border border-blue-200 rounded p-2 mt-3">
                <div className="text-xs text-blue-600">
                  💡 <strong>Tipp:</strong> Der Sync-Ordner sollte sich in einem OneDrive/SharePoint-Pfad befinden, 
                  der automatisch synchronisiert wird (erkennbar am grünen Häkchen-Symbol im Windows Explorer).
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erweiterte Einstellungen */}
      {syncFolderName && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Erweiterte Einstellungen
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Zusätzliche Konfigurationsoptionen für die Team-Synchronisation.
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Automatische Snapshots:</span>
                  <Badge variant="success" size="sm">Nach CSV-Import</Badge>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span>Verschlüsselung:</span>
                  <Badge variant="success" size="sm">AES-GCM-256</Badge>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span>Konfliktlösung:</span>
                  <Badge variant="default" size="sm">Coordinator-Wins</Badge>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: Sync-Ordner zurücksetzen
                    console.log('Reset sync folder');
                  }}
                  className="w-full text-error-500"
                >
                  Sync-Konfiguration zurücksetzen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}