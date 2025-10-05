import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Shield, Lock, Eye, User } from 'lucide-react';
import { networkGuard } from '../../utils/fetchGuard';
import { configManager } from '../../data/config';
import { useAuth } from '../../app/auth/AuthProvider';
import { Button } from '../../components/Button';

export function Sicherheit() {
  const isDev = import.meta.env.DEV;
  const { currentUser, role, setCurrentUser } = useAuth();

  const [devUsers, setDevUsers] = React.useState<any[]>([]);
  React.useEffect(() => {
    if (!isDev) return;
    (async () => {
      try {
        const { db } = await import('../../data/db');
        const all = await Promise.all((await db.users.toArray()) as any);
        setDevUsers(all);
      } catch (e) {
        console.warn('Sicherheit: Users laden fehlgeschlagen', e);
      }
    })();
  }, [isDev]);

  const switchUserById = async (id: string) => {
    try {
      const { db } = await import('../../data/db');
      await db.setKV('auth:currentUserId', id);
      const u = await db.users.get(id);
      if (u) setCurrentUser({ id: (u as any).id, name: (u as any).name, role: (u as any).role });
      document.dispatchEvent(new CustomEvent('auth:user-changed'));
    } catch (e) {
      console.warn('Sicherheit: switchUserById fehlgeschlagen', e);
    }
  };

  const blockedRequests = networkGuard.getBlockedRequests();
  const [sharepointEnabled, setSharepointEnabled] = React.useState(false);
  const [allowedDomains, setAllowedDomains] = React.useState<string[]>([]);

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

  const testExternalRequest = () => {
    fetch('https://example.com/api/test')
      .catch(() => {
        console.log('✅ Test erfolgreich: External request wurde blockiert');
      });
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

              {isDev && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    DEV: Benutzer in DB
                  </div>
                  <div className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">
                    {devUsers.filter(u => u.active).map(u => `${u.id} (${u.role})`).join(', ') || 'Keine aktiven User'}
                  </div>
                </div>
              )}

              {isDev && (
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

              <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                ℹ️ Rollen steuern die Sichtbarkeit von Funktionen.
                Fehlende Berechtigungen führen zu ausgeblendeten UI-Elementen.
                {isDev && (
                  <span> User-Wechsel auch über das Menü oben rechts möglich.</span>
                )}
              </div>
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
