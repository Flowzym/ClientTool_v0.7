import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { 
  Users, 
  Shield, 
  Database, 
  Cloud, 
  HardDrive, 
  Building, 
  Globe,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  Key,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Upload,
  Image,
  BarChart3
} from 'lucide-react';
import { db } from '../../data/db';
import { useAuth } from '../../app/auth/AuthProvider';
import { configManager, type FeatureConfig } from '../../data/config';
import { networkGuard } from '../../utils/fetchGuard';
import { Avatar } from '../../components/Avatar';
import { ROLE_PERMS } from '../../domain/auth';
import type { User, Role } from '../../domain/models';
import type { Permission } from '../../domain/auth';

type CloudProvider = 'local' | 'sharepoint' | 'onedrive' | 'googledrive' | 'dropbox' | 'intranet';

interface CloudConfig {
  provider: CloudProvider;
  enabled: boolean;
  config: {
    url?: string;
    clientId?: string;
    tenantId?: string;
    path?: string;
    credentials?: string;
  };
}

interface UserFormData {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  avatar?: string;
  initials?: string;
}

export function Admin() {
  const { currentUser, role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [featureConfig, setFeatureConfig] = useState<FeatureConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserFormData | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [cloudConfigs, setCloudConfigs] = useState<CloudConfig[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editablePerms, setEditablePerms] = useState<Record<string, Permission[]>>({
    editor: [...ROLE_PERMS.editor],
    user: [...ROLE_PERMS.user]
  });

  // Benutzer laden
  useEffect(() => {
    loadUsers();
    loadFeatureConfig();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const userData = await Promise.all((await db.users.toArray()) as any);
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
      showMessage('error', 'Fehler beim Laden der Benutzer');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeatureConfig = async () => {
    try {
      const config = await configManager.getConfig();
      setFeatureConfig(config);
    } catch (error) {
      console.error('Failed to load feature config:', error);
      showMessage('error', 'Fehler beim Laden der Konfiguration');
    }
  };

  const getDefaultCloudConfigs = (): CloudConfig[] => [
    { provider: 'local', enabled: true, config: { path: '/local/data' } },
    { provider: 'sharepoint', enabled: false, config: { url: '', clientId: '', tenantId: '' } },
    { provider: 'onedrive', enabled: false, config: { clientId: '', path: '/Apps/ClientTool' } },
    { provider: 'googledrive', enabled: false, config: { clientId: '', path: '/ClientTool' } },
    { provider: 'dropbox', enabled: false, config: { clientId: '', path: '/Apps/ClientTool' } },
    { provider: 'intranet', enabled: false, config: { url: '', credentials: '' } }
  ];

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Benutzer-CRUD
  const handleCreateUser = () => {
    setEditingUser({
      id: '',
      name: '',
      role: 'user',
      active: true,
      avatar: '',
      initials: ''
    });
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
      avatar: user.avatar || '',
      initials: user.initials || ''
    });
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const userData: User = {
        id: editingUser.id || `user-${Date.now()}`,
        name: editingUser.name.trim(),
        role: editingUser.role,
        active: editingUser.active,
        avatar: editingUser.avatar?.trim() || undefined,
        initials: editingUser.initials?.trim() || undefined
      };

      if (!userData.name) {
        showMessage('error', 'Name ist erforderlich');
        return;
      }

      await db.users.put(userData);
      await loadUsers();
      setShowUserForm(false);
      setEditingUser(null);
      showMessage('success', 'Benutzer gespeichert');
    } catch (error) {
      console.error('Failed to save user:', error);
      showMessage('error', 'Fehler beim Speichern');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      showMessage('error', 'Sie können sich nicht selbst löschen');
      return;
    }

    if (!confirm('Benutzer wirklich löschen?')) return;

    try {
      await db.users.delete(userId);
      await loadUsers();
      showMessage('success', 'Benutzer gelöscht');
    } catch (error) {
      console.error('Failed to delete user:', error);
      showMessage('error', 'Fehler beim Löschen');
    }
  };

  // Cloud-Konfiguration
  const handleSharePointToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Aktivierung erfordert Konfiguration
        const clientId = prompt('Microsoft App Client ID eingeben:');
        const tenantId = prompt('Microsoft Tenant ID eingeben:');
        
        if (!clientId || !tenantId) {
          showMessage('error', 'Client ID und Tenant ID sind erforderlich');
          return;
        }
        
        await configManager.enableSharePoint(clientId, tenantId);
        showMessage('success', 'SharePoint-Integration aktiviert');
      } else {
        await configManager.disableSharePoint();
        showMessage('success', 'SharePoint-Integration deaktiviert - Local-Only Modus wiederhergestellt');
      }
      
      // Network Guard aktualisieren
      await networkGuard.refreshAllowedDomains();
      
      // Config neu laden
      await loadFeatureConfig();
    } catch (error) {
      console.error('Failed to toggle SharePoint:', error);
      showMessage('error', 'Fehler beim Ändern der SharePoint-Einstellung');
    }
  };

  const getCloudProviderIcon = (provider: CloudProvider) => {
    switch (provider) {
      case 'local': return HardDrive;
      case 'sharepoint': return Building;
      case 'onedrive': return Cloud;
      case 'googledrive': return Cloud;
      case 'dropbox': return Cloud;
      case 'intranet': return Globe;
      default: return Database;
    }
  };

  const getCloudProviderLabel = (provider: CloudProvider) => {
    switch (provider) {
      case 'local': return 'Lokal';
      case 'sharepoint': return 'SharePoint';
      case 'onedrive': return 'OneDrive';
      case 'googledrive': return 'Google Drive';
      case 'dropbox': return 'Dropbox';
      case 'intranet': return 'Intranet';
      default: return provider;
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'editor': return 'Editor';
      case 'user': return 'Benutzer';
      default: return role;
    }
  };

  const getRoleVariant = (role: Role): 'default' | 'success' | 'warning' | 'error' => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'warning';
      case 'user': return 'default';
      default: return 'default';
    }
  };

  const handlePermissionToggle = (role: 'editor' | 'user', permission: Permission) => {
    setEditablePerms(prev => {
      const current = prev[role] || [];
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];
      
      return {
        ...prev,
        [role]: updated
      };
    });
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingUser) return;

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Nur Bilddateien sind erlaubt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setEditingUser(prev => prev ? { ...prev, avatar: result } : null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Administration</h2>
        <Badge variant="error" size="md">
          Nur für Administratoren
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
        {/* Benutzerverwaltung */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Benutzerverwaltung
                </div>
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={handleCreateUser}>
                <Plus className="w-4 h-4 mr-2" />
                Benutzer hinzufügen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Lade Benutzer...</div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size="md" />
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.id}</div>
                      </div>
                      <Badge variant={getRoleVariant(user.role)} size="sm">
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge variant={user.active ? 'success' : 'default'} size="sm">
                        {user.active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === currentUser?.id}
                        className="text-error-500 hover:text-error-700 disabled:text-gray-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Berechtigungen */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Berechtigungsmatrix
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Übersicht der Berechtigungen pro Rolle:
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4">Berechtigung</th>
                      <th className="text-center py-2 px-2">Admin</th>
                      <th className="text-center py-2 px-2">Editor</th>
                      <th className="text-center py-2 px-2">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'view_board', label: 'Board anzeigen' },
                      { key: 'update_status', label: 'Status ändern' },
                      { key: 'assign', label: 'Zuweisungen' },
                      { key: 'edit_followup', label: 'Follow-up bearbeiten' },
                      { key: 'import_data', label: 'Daten importieren' },
                      { key: 'export_data', label: 'Daten exportieren' },
                      { key: 'view_stats', label: 'Statistiken' },
                      { key: 'view_security', label: 'Sicherheit' },
                      { key: 'run_migration', label: 'DB-Migration' },
                      { key: 'manage_users', label: 'Benutzer verwalten' }
                    ].map(perm => (
                      <tr key={perm.key} className="border-b border-gray-100">
                        <td className="py-2 pr-4">{perm.label}</td>
                        <td className="text-center py-2 px-2">
                          {ROLE_PERMS.admin.includes(perm.key as Permission) ? '✅' : '❌'}
                        </td>
                        <td className="text-center py-2 px-2">
                          <input
                            type="checkbox"
                            checked={editablePerms.editor.includes(perm.key as Permission)}
                            onChange={() => handlePermissionToggle('editor', perm.key as Permission)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="text-center py-2 px-2">
                          <input
                            type="checkbox"
                            checked={editablePerms.user.includes(perm.key as Permission)}
                            onChange={() => handlePermissionToggle('user', perm.key as Permission)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datenbank-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Datenbank-Verwaltung
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">Clients</div>
                  <div className="text-xl font-semibold">{users.length}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500">Benutzer</div>
                  <div className="text-xl font-semibold">{users.length}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Datenbank-Backup erstellen
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Datenbank-Einstellungen
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-error-500">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Datenbank zurücksetzen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cloud-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                External Services
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Externe Services können aktiviert werden, durchbrechen aber den Local-Only Modus:
              </div>
              
              {/* SharePoint Integration */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">SharePoint Integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={featureConfig?.sharepoint.enabled ? 'error' : 'success'} size="sm">
                      {featureConfig?.sharepoint.enabled ? 'Extern aktiv' : 'Local-Only'}
                    </Badge>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={featureConfig?.sharepoint.enabled || false}
                        onChange={(e) => handleSharePointToggle(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </label>
                  </div>
                </div>
                
                {featureConfig?.sharepoint.enabled && (
                  <div className="space-y-2 text-sm">
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Sicherheitshinweis</span>
                      </div>
                      <div className="text-yellow-700 text-xs mt-1">
                        SharePoint-Integration durchbricht den Local-Only Modus. 
                        Externe Netzwerkverbindungen werden zugelassen.
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500">Client ID</div>
                        <div className="font-mono text-xs bg-gray-50 p-1 rounded">
                          {featureConfig.sharepoint.clientId || 'Nicht konfiguriert'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Tenant ID</div>
                        <div className="font-mono text-xs bg-gray-50 p-1 rounded">
                          {featureConfig.sharepoint.tenantId || 'Nicht konfiguriert'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!featureConfig?.sharepoint.enabled && (
                  <div className="text-xs text-gray-500 bg-green-50 p-2 rounded">
                    ✅ Local-Only Modus aktiv - Keine externen Verbindungen erlaubt
                  </div>
                )}
              </div>
              
              {/* Network Guard Status */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Network Guard Status</span>
                  </div>
                  <Badge variant="success" size="sm">Aktiv</Badge>
                </div>
                
                <div className="text-xs text-gray-600">
                  <div>Erlaubte externe Domains: {networkGuard.getAllowedDomains().length}</div>
                  {networkGuard.getAllowedDomains().length > 0 && (
                    <div className="mt-1 font-mono bg-gray-50 p-1 rounded">
                      {networkGuard.getAllowedDomains().join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System-Einstellungen */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System-Einstellungen
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Sicherheit</h4>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Key className="w-4 h-4 mr-2" />
                  Verschlüsselungsschlüssel verwalten
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Audit-Logs anzeigen
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => networkGuard.refreshAllowedDomains()}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Network Guard aktualisieren
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Wartung</h4>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Datenbank optimieren
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Cache leeren
                </Button>
                {import.meta.env.DEV && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => window.open('/dev/perf', '_blank')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Performance Playground
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aktuelle Session-Info */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Aktuelle Session
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span>Angemeldeter Benutzer:</span>
                <Badge variant="success" size="sm">{currentUser?.name}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Rolle:</span>
                <Badge variant={getRoleVariant(role)} size="sm">{getRoleLabel(role)}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Session-Start:</span>
                <span className="text-gray-600">{new Date().toLocaleTimeString('de-DE')}</span>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <Button variant="ghost" size="sm" className="w-full text-error-500">
                  Session beenden
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benutzer-Formular Modal */}
      {showUserForm && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingUser.id ? 'Benutzer bearbeiten' : 'Neuen Benutzer erstellen'}
              </h3>
              <button
                onClick={() => setShowUserForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Avatar</label>
                <div className="flex items-center gap-4">
                  <Avatar 
                    user={editingUser.avatar ? editingUser : { 
                      name: editingUser.name || 'Neuer Benutzer',
                      initials: editingUser.initials 
                    }} 
                    size="lg" 
                  />
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="block text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                    />
                    <div className="text-xs text-gray-500">
                      Bild hochladen oder Initialen verwenden
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Benutzer-ID</label>
                <input
                  type="text"
                  value={editingUser.id}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, id: e.target.value } : null)}
                  placeholder="z.B. max.mustermann@firma.at"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!!editingUser.id} // ID nicht änderbar bei bestehenden Benutzern
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Max Mustermann"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Initialen (Fallback)</label>
                <input
                  type="text"
                  value={editingUser.initials}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, initials: e.target.value.toUpperCase().slice(0, 2) } : null)}
                  placeholder="z.B. MM"
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Werden automatisch aus dem Namen generiert, falls leer
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Rolle</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as Role } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="user">Benutzer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingUser.active}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, active: e.target.checked } : null)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Aktiv</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowUserForm(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveUser}>
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}