import React, { useState, useContext, createContext, useEffect } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cryptoManager } from '../../data/crypto';
import { EnvelopeError } from '../../data/envelope';
import { getEncryptionMode } from '../../utils/env';
import { db } from '../../data/db';
import { seedTestData } from '../../data/seed';

// Development-Helper für Passphrase-Bypass
const BYPASS_KEY = 'klient-tool-bypass-auth';
const isDev = import.meta.env.DEV;

export function isAuthBypassEnabled(): boolean {
  if (!isDev) return false;
  return localStorage.getItem(BYPASS_KEY) === 'true';
}

export function setAuthBypass(enabled: boolean): void {
  if (!isDev) { try { localStorage.removeItem(BYPASS_KEY); } catch {} return; }
  if (enabled) { localStorage.setItem(BYPASS_KEY, 'true'); } else { localStorage.removeItem(BYPASS_KEY); }
}

// Auth Context
interface AuthContextType {
  isAuthenticated: boolean;
  login: (passphrase: string) => Promise<boolean>;
  logout: () => void;
  bypassEnabled: boolean;
  setBypass: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Auth Provider
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
  try { const cached = sessionStorage.getItem('auth:session'); if (cached === '1') return true; } catch {}
  return getEncryptionMode() !== 'prod-enc';
});
  const [bypassEnabled, setBypassEnabledState] = useState(isAuthBypassEnabled());

  // Persist auth session so reloads don't log out
  useEffect(() => {
    try { sessionStorage.setItem('auth:session', isAuthenticated ? '1' : '0'); } catch {}
  }, [isAuthenticated]);

  // Prüfe beim Start, ob Bypass aktiviert ist
  useEffect(() => {
    if (bypassEnabled) {
      console.log('🔓 Auth: Bypass enabled - skipping authentication');
      setIsAuthenticated(true);
    }
  }, [bypassEnabled]);

  const login = async (passphrase: string): Promise<boolean> => {
    if (getEncryptionMode() !== 'prod-enc') { setIsAuthenticated(true); return true; }
    try {
      console.log('🔐 Auth: Attempting login (kv-probe)...');
      // Key ableiten
      await cryptoManager.deriveKey(passphrase);

      // Robuste Validierung: Roundtrip in KV-Store (entschlüsselt gespeichert)
      try {
        const probeKey = 'auth:probe';
        await db.setKV(probeKey, new TextEncoder().encode('ok'));
        const res = await db.getKV(probeKey);
        await db.deleteKV(probeKey).catch(() => {});
        if (!res) throw new Error('KV-Probe fehlgeschlagen');
      } catch (e) {
        // Falsche Passphrase: AES-Entschlüsselung/Codec schlägt fehl
        cryptoManager.clearKey();
        console.warn('❌ Auth: Invalid passphrase - kv probe failed', e);
        return false;
      }

      setIsAuthenticated(true);
      console.log('✅ Auth: Login successful');
      return true;
    } catch (error) {
      console.error('❌ Auth: Login failed:', error);
      if (error instanceof EnvelopeError && error.code === 'DECRYPT_AUTH_FAILED') {
        return false; // Invalid passphrase
      }
      throw error;
    }
  };

  const logout = () => {
    cryptoManager.clearKey();
    setIsAuthenticated(false);
    console.log('👋 Auth: Logged out');
  };

  const setBypass = (enabled: boolean) => {
    setAuthBypass(enabled);
    setBypassEnabledState(enabled);
    
    if (enabled) {
      setIsAuthenticated(true);
      console.log('🔓 Auth: Bypass enabled');
    } else {
      setIsAuthenticated(false);
      cryptoManager.clearKey();
      console.log('🔒 Auth: Bypass disabled');
    }
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    login,
    logout,
    bypassEnabled,
    setBypass
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {(isAuthenticated || bypassEnabled) ? children : <PassphraseGate />}
    </AuthContext.Provider>
  );
}

// Passphrase Gate Component
function PassphraseGate() {
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passphrase.trim()) {
      setError('Passphrase ist erforderlich');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await auth.login(passphrase);
      
      if (!success) {
        setError('Ungültige Passphrase oder beschädigte Daten');
        setPassphrase('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Anmeldung fehlgeschlagen');
      setPassphrase('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevSeed = async () => {
    if (!cryptoManager.hasKey()) {
      setError('Bitte zuerst anmelden');
      return;
    }

    try {
      await seedTestData('replace');
      setError(null);
      console.log('✅ Test data seeded');
    } catch (error) {
      console.error('Seed failed:', error);
      setError('Test-Daten konnten nicht erstellt werden');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-accent-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Klient:innendaten-Tool
          </h1>
          <Badge variant="success" className="mb-4">
            Local-Only Modus aktiv
          </Badge>
          <p className="text-gray-600 text-sm">
            Geben Sie Ihre Passphrase ein, um auf die verschlüsselten Daten zuzugreifen.
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle as="h2">Anmeldung</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate autoComplete="off" action="about:blank" className="space-y-4">
              <div>
                <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-2">
                  Passphrase
                </label>
                <div className="relative">
                  <input
                    id="passphrase"
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Passphrase eingeben..."
                    disabled={isLoading}
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassphrase ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-error-500 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !passphrase.trim()}
              >
                {isLoading ? 'Anmeldung läuft...' : 'Anmelden'}
              </Button>
            </form>

            {/* Development Helper */}
            {import.meta.env.DEV && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">
                  Development-Modus
                </div>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDevSeed}
                    disabled={!cryptoManager.hasKey()}
                    className="w-full text-xs"
                  >
                    Test-Daten erstellen
                  </Button>
                  <div className="text-xs text-gray-400">
                    Tipp: Verwenden Sie eine einfache Passphrase wie "test123" für Development
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="text-center text-xs text-gray-500">
          <p>
            Alle Daten werden lokal verschlüsselt gespeichert.
            <br />
            Keine Passphrase-Speicherung oder externe Übertragung.
          </p>
        </div>
      </div>
    </div>
  );
}