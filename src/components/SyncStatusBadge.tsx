/**
 * Sync-Status-Badge für Header-Anzeige
 */
import React, { useState, useEffect } from 'react';
import { Badge } from './Badge';
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { syncManager, type SyncStatus } from '../features/sync/SyncManager';

export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>('offline');
  const [lastSync, setLastSync] = useState<string | undefined>();
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status regelmäßig aktualisieren
  useEffect(() => {
    const updateStatus = async () => {
      try {
        const syncStatus = await syncManager.getSyncStatus();
        setStatus(syncStatus.status);
        setLastSync(syncStatus.lastSync);
        setPendingUpdates(syncStatus.pendingUpdates);
      } catch {
        setStatus('error');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Alle 30 Sekunden

    // Event-Listener für Sync-Updates
    const handleSyncUpdate = () => updateStatus();
    document.addEventListener('sync:dataUpdated', handleSyncUpdate);

    return () => {
      clearInterval(interval);
      document.removeEventListener('sync:dataUpdated', handleSyncUpdate);
    };
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await syncManager.pullUpdates();
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle,
          label: 'Synchronisiert',
          variant: 'success' as const,
          description: 'Alle Daten aktuell'
        };
      case 'pending':
        return {
          icon: Clock,
          label: `${pendingUpdates} Updates`,
          variant: 'warning' as const,
          description: 'Updates verfügbar'
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          label: 'Synchronisiert...',
          variant: 'default' as const,
          description: 'Sync läuft'
        };
      case 'offline':
        return {
          icon: CloudOff,
          label: 'Offline',
          variant: 'default' as const,
          description: 'Sync-Ordner nicht verfügbar'
        };
      case 'conflict':
        return {
          icon: AlertCircle,
          label: 'Konflikt',
          variant: 'error' as const,
          description: 'Manuelle Konfliktlösung erforderlich'
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Sync-Fehler',
          variant: 'error' as const,
          description: 'Sync-Problem'
        };
      default:
        return {
          icon: Cloud,
          label: 'Unbekannt',
          variant: 'default' as const,
          description: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <button
      onClick={handleManualSync}
      disabled={isRefreshing || status === 'offline'}
      className="flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
      title={`${config.description}${lastSync ? ` • Letzter Sync: ${new Date(lastSync).toLocaleTimeString('de-DE')}` : ''}`}
    >
      <Badge variant={config.variant} size="sm">
        <Icon className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    </button>
  );
}