import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Shield, Lock, Eye, Database, User } from 'lucide-react';
import { networkGuard } from '../../utils/fetchGuard';
import { getEncryptionMode } from '../../utils/env';
import { configManager } from '../../data/config';
import { getDevKeySource, generateNewDevKey, isValidDevKey } from '../../utils/devKey';
import { db } from '../../data/db';
import { cryptoManager } from '../../data/crypto';
import { useAuth } from '../../app/auth/AuthProvider';
import { isAuthBypassEnabled, setAuthBypass } from '../auth/PassphraseGate';
import { Can } from '../../components/auth/Can';
import { Button } from '../../components/Button';

export function Sicherheit() {
  const isDev = import.meta.env.DEV;
  const { currentUser, role, setCurrentUser } = useAuth();
  const encryptionMode = getEncryptionMode();
  const __isDev = (import.meta as any).env?.DEV ?? false;
  // DEV: Benutzerliste (aufgelöst) und Schnellwechsel
  const [devUsers, setDevUsers] = React.useState<any[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const all = await Promise.all((await db.users.toArray()) as any);
        setDevUsers(all);
      } catch (e) {
        console.warn('Sicherheit: Users laden fehlgeschlagen', e);
      }
    })();
  }, []);

  const switchUserById = async (id: string) => {
    try {
      await db.setKV('auth:currentUserId', id);
      const u = await db.users.get(id);
      if (u) setCurrentUser({ id: (u as any).id, name: (u as any).name, role: (u as any).role });
      document.dispatchEvent(new CustomEvent('auth:user-changed'));
    } catch (e) {
      console.warn('Sicherheit: switchUserById fehlgeschlagen', e);
    }
  };

  // DEV: Login-Bypass zustand/handler
  const [bypass, setBypass] = React.useState<boolean>(isAuthBypassEnabled());
  const toggleBypass = () => {
    if (!isDev) { alert('Bypass ist nur im DEV-Modus verfügbar.'); return; }
    setAuthBypass(!bypass);
    setBypass(!bypass);
  };
  const forceLogout = () => {
    try { cryptoManager.clearKey(); } catch {}
    setAuthBypass(false);
    location.reload();
  };

  const blockedRequests = networkGuard.getBlockedRequests();
  const [isReencrypting, setIsReencrypting] = React.useState(false);
  const [reencryptStats, setReencryptStats] = React.useState<any>(null);
  const [devKeyInfo, setDevKeyInfo] = React.useState<{
    source: 'env' | 'localStorage' | 'none';
    isValid: boolean;
  } | null>(null);
  const [sharepointEnabled, setSharepointEnabled] = React.useState(false);
  const [allowedDomains, setAllowedDomains] = React.useState<string[]>([]);
  
  // SharePoint-Status laden
  React.useEffect(() => {
    configManager.isSharePointEnabled().then(setSharepointEnabled);
    setAllowedDomains(networkGuard.getAllowedDomains());
    
    const handleConfigUpdate = () => {
      configManager.isSharePointEnabled().then(setSharepointEnabled);
      setAllowedDomains(networkGuard.getAllowedDomains());
    };
    
    document.addEventListener('config:updated', handleConfigUpdate);
    return () => document.removeEventListener('config:updated', handleConfigUpdate);
  }, []);

  // DEV-Key Info laden
  React.useEffect(() => {
    if (encryptionMode === 'dev-enc') {
      const source = getDevKeySource();
      let isValid = false;
      
      if (source === 'env') {
        isValid = isValidDevKey(import.meta.env.VITE_DEV_MASTER_KEY || '');
      } else if (source === 'localStorage') {
        isValid = isValidDevKey(localStorage.getItem('dev_master_key_b64') || '');
      }
      
      setDevKeyInfo({ source, isValid });
    }
  }, [encryptionMode]);
  
  const testExternalRequest = () => {
    // Test für Network Guard - wird blockiert
    fetch('https://example.com/api/test')
      .catch(() => {
        console.log('✅ Test erfolgreich: External request wurde blockiert');
      });
  };
  
  const handleReencryptAll = async () => {
    if (!confirm('Alle Datensätze nachträglich verschlüsseln? Dies kann einige Sekunden dauern.')) {
      return;
    }
    
    setIsReencrypting(true);
    try {
      const stats = await db.reencryptAll();
      setReencryptStats(stats);
      console.log('✅ Re-encryption completed:', stats);
    } catch (error) {
      console.error('❌ Re-encryption failed:', error);
      alert('Fehler bei der Nachverschlüsselung: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    } finally {
      setIsReencrypting(false);
    }
  };
  
  const repairClientMeta = async () => {
    if (!confirm('Client-Datensätze für Meta-Daten außen reparieren?')) return;

    setIsReencrypting(true);
    try {
      const rewrapped = await db.rewrapClients();
      alert(`${rewrapped} Client-Datensätze wurden repariert.`);
      console.log('✅ Rewrap completed:', rewrapped);
    } catch (error) {
      console.error('❌ Rewrap failed:', error);
      alert('Fehler beim Rewrap: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    } finally {
      setIsReencrypting(false);
    }
  };
  
  const handleGenerateNewDevKey = () => {
    if (!confirm(
      'Neuen DEV-Key generieren?\n\n' +
      'WARNUNG: Bestehende dev-enc-Daten, die mit dem alten Key verschlüsselt wurden, ' +
      'sind danach nicht mehr lesbar. Erwägen Sie vorher ein DB-Reset.'
    )) {
      return;
    }
    
    try {
      generateNewDevKey();
      setDevKeyInfo({
        source: 'localStorage',
        isValid: true
      });
      alert('Neuer DEV-Key wurde generiert und in localStorage gespeichert.');
    } catch (error) {
      alert('Fehler beim Generieren: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };
  
  const handleUseEnvKey = () => {
    const envKey = import.meta.env.VITE_DEV_MASTER_KEY;
    if (!envKey) {
      alert('VITE_DEV_MASTER_KEY ist nicht gesetzt in .env.development');
      return;
    }
    
    if (!isValidDevKey(envKey)) {
      alert('VITE_DEV_MASTER_KEY ist ungültig (muss 32 Bytes Base64 sein)');
      return;
    }
    
    // localStorage-Key entfernen, damit ENV Vorrang hat
    localStorage.removeItem('dev_master_key_b64');
    setDevKeyInfo({
      source: 'env',
      isValid: true
    });
    alert('ENV-Key wird nun verwendet. Seite neu laden für Aktivierung.');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Sicherheit</h2>
        <Badge variant="success">Local-Only Modus aktiv</Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success-500" />
                Network Guard Status
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span>Fetch-Guard:</span>
                <Badge variant="success" size="sm">Aktiv</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>XMLHttpRequest-Guard:</span>
                <Badge variant="success" size="sm">Aktiv</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Externe Domains erlaubt:</span>
                <Badge variant={allowedDomains.length > 0 ? 'warning' : 'success'} size="sm">
                  {allowedDomains.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Blockierte Requests:</span>
                <Badge variant="default" size="sm">{blockedRequests.length}</Badge>
              </div>
              
              {allowedDomains.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Erlaubte externe Domains:</div>
                  <div className="text-xs font-mono bg-gray-50 p-2 rounded">
                    {allowedDomains.join(', ')}
                  </div>
                </div>
              )}
              
              {sharepointEnabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <div className="text-xs text-yellow-800">
                    ⚠️ SharePoint-Integration aktiv - Local-Only Modus durchbrochen
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={testExternalRequest}
                  className="text-xs text-accent-600 hover:text-accent-700 underline"
                >
                  Network Guard testen →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-success-500" />
                Content Security Policy
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Strikte CSP verhindert externe Ressourcen:
              </div>
              <ul className="text-xs text-gray-500 space-y-1 ml-4 list-disc">
                <li>default-src 'self'</li>
                <li>connect-src 'self'</li>
                <li>img-src 'self' blob: data:</li>
                <li>object-src 'none'</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-accent-500" />
                Benutzer & Rollen
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">Aktueller Benutzer</div>
                  <div className="text-xs text-gray-500">
                    {currentUser?.name} ({role}) - ID: {currentUser?.id}
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  Aktiv
                </Badge>
              </div>
              
              {__isDev && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    DEV: Benutzer in DB
                  </div>
                  <div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">
                    {devUsers.filter(u => u.active).map(u => `${u.id} (${u.role})`).join(', ') || 'Keine aktiven User'}
                  </div>
                </div>
              )}
              
              {__isDev && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    DEV: Schneller User-Wechsel
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => switchUserById('admin@local')}
                      className={currentUser?.id === 'admin@local' ? 'bg-accent-50' : ''}
                    >
                      Admin
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => switchUserById('editor@local')}
                      className={currentUser?.id === 'editor@local' ? 'bg-accent-50' : ''}
                    >
                      Editor
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => switchUserById('user@local')}
                      className={currentUser?.id === 'user@local' ? 'bg-accent-50' : ''}
                    >
                      User
                    </Button>
                  </div>
                </div>
              )}
              
              
              
              {__isDev && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">DEV: Authentifizierung</div>
                  <div className="flex items-center gap-3">
                    <Badge variant={bypass ? "success" : "default"} size="sm">
                      {bypass ? "Bypass aktiv" : "Bypass aus"}
                    </Badge>
                    <Button variant="secondary" size="sm" onClick={toggleBypass}>
                      {bypass ? "Bypass deaktivieren" : "Bypass aktivieren"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={forceLogout}>
                      Abmelden (Sperren)
                    </Button>
                  </div>
                </div>
              )}
        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                ℹ️ Rollen steuern die Sichtbarkeit von Funktionen. 
                Fehlende Berechtigungen führen zu ausgeblendeten UI-Elementen.
                {__isDev && (
                  <span> User-Wechsel auch über das Menü oben rechts möglich.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {encryptionMode === 'dev-enc' && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-warning-500" />
                  DEV-ENC Key Management
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  DEV-Key wird automatisch verwaltet für Entwicklung.
                  Für Produktion verwenden Sie ausschließlich prod-enc mit Passphrase.
                </div>
                
                {devKeyInfo && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span>Key-Quelle:</span>
                      <Badge variant={devKeyInfo.source === 'env' ? 'success' : 'default'} size="sm">
                        {devKeyInfo.source === 'env' ? 'ENV-Variable' : 
                         devKeyInfo.source === 'localStorage' ? 'localStorage' : 'Keine'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Key-Status:</span>
                      <Badge variant={devKeyInfo.isValid ? 'success' : 'error'} size="sm">
                        {devKeyInfo.isValid ? '32 Bytes OK' : 'Ungültig'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <Can perm="run_migration">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateNewDevKey}
                      disabled={import.meta.env.MODE !== 'development'}
                      className="w-full"
                    >
                      DEV-Key neu erzeugen
                    </Button>
                  </Can>
                  
                  <Can perm="run_migration">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleUseEnvKey}
                      disabled={!import.meta.env.VITE_DEV_MASTER_KEY}
                      className="w-full"
                    >
                      DEV-Key aus ENV verwenden
                    </Button>
                  </Can>
                </div>
                
                <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                  ⚠️ Risiko: Beim Neuerzeugen werden Alt-Daten mit dem vorherigen Key unlesbar.
                  Erwägen Sie vorher ein DB-Reset in der Entwicklung.
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-accent-500" />
                Datenverschlüsselung
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Alle Daten werden automatisch verschlüsselt gespeichert. 
                Bei Bedarf können bestehende Daten nachträglich verschlüsselt werden.
              </div>
              
              {reencryptStats && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="text-sm text-green-800">
                    ✅ Nachverschlüsselung abgeschlossen:
                    <ul className="mt-1 ml-4 list-disc">
                      <li>{reencryptStats.clients} Clients</li>
                      <li>{reencryptStats.users} Users</li>
                      <li>{reencryptStats.sessions} Import-Sessions</li>
                    </ul>
                  </div>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReencryptAll}
                disabled={isReencrypting}
                className="w-full"
              >
                <Database className="w-4 h-4 mr-2" />
                {isReencrypting ? 'Verschlüssele...' : 'Alle Daten nachträglich verschlüsseln'}
              </Button>
              
              <Can perm="run_migration">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={repairClientMeta}
                  disabled={isReencrypting}
                  className="w-full"
                >
                  <Database className="w-4 h-4 mr-2" />
                  {isReencrypting ? 'Repariere...' : 'Client Meta-Daten reparieren'}
                </Button>
              </Can>
            </div>
          </CardContent>
        </Card>
        
        {blockedRequests.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-warning-500" />
                  Blockierte Netzwerk-Requests
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {blockedRequests.slice(-10).reverse().map((request, index) => (
                  <div key={index} className="text-sm border border-gray-200 rounded-md p-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-gray-500 truncate">
                          {request.url}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="error" size="sm">{request.method}</Badge>
                          <Badge variant="default" size="sm">{request.source}</Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {request.timestamp.toLocaleTimeString('de-DE')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Zeigt die letzten 10 von {blockedRequests.length} blockierten Requests
                </span>
                <button
                  onClick={() => networkGuard.clearLog()}
                  className="text-xs text-accent-600 hover:text-accent-700 underline"
                >
                  Log leeren
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}