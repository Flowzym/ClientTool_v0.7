import React, { useState, useContext, createContext, useEffect } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Shield, User as UserIcon } from 'lucide-react';
import { db } from '../../data/db';
import { seedTestData } from '../../data/seed';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: { id: string; name: string; role: string } | null;
  login: (userId: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('auth:session');
      if (cached === '1') return true;
    } catch {}
    return false;
  });
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('auth:session', isAuthenticated ? '1' : '0');
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => {
      if (isAuthenticated && !currentUser) {
        try {
          const userId = await db.getKV('auth:currentUserId');
          if (userId) {
            const user = await db.users.get(userId);
            if (user) {
              setCurrentUser({ id: user.id, name: user.name, role: user.role });
            }
          }
        } catch (e) {
          console.warn('Failed to load current user', e);
        }
      }
    })();
  }, [isAuthenticated, currentUser]);

  const login = async (userId: string): Promise<boolean> => {
    try {
      const user = await db.users.get(userId);
      if (!user) {
        console.error('User not found:', userId);
        return false;
      }

      await db.setKV('auth:currentUserId', userId);
      setCurrentUser({ id: user.id, name: user.name, role: user.role });
      setIsAuthenticated(true);
      console.log('✅ Auth: Login successful', user.name);
      return true;
    } catch (error) {
      console.error('❌ Auth: Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    console.log('👋 Auth: Logged out');
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {isAuthenticated ? children : <UserSelectionGate />}
    </AuthContext.Provider>
  );
}

function UserSelectionGate() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const allUsers = await db.users.where('active').equals(true).toArray();
        setUsers(allUsers);

        if (allUsers.length === 0) {
          setError('Keine aktiven Benutzer gefunden. Bitte Seed-Daten erstellen.');
        }
      } catch (e) {
        setError('Fehler beim Laden der Benutzer');
        console.error(e);
      }
    })();
  }, []);

  const handleUserSelect = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await auth.login(userId);
      if (!success) {
        setError('Anmeldung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Anmeldung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevSeed = async () => {
    try {
      await seedTestData('replace');
      const allUsers = await db.users.where('active').equals(true).toArray();
      setUsers(allUsers);
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
            Wählen Sie einen Benutzer aus, um fortzufahren.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Benutzer auswählen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 p-3 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role}</div>
                  </div>
                </button>
              ))}

              {users.length === 0 && !error && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Lade Benutzer...
                </div>
              )}

              {error && (
                <div className="text-center py-2 text-error-500 text-sm bg-red-50 rounded-md p-3">
                  {error}
                </div>
              )}
            </div>

            {import.meta.env.DEV && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">
                  Development-Modus
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDevSeed}
                  className="w-full text-xs"
                >
                  Test-Daten erstellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
          <p>
            Alle Daten werden lokal gespeichert.
            <br />
            Keine externe Übertragung.
          </p>
        </div>
      </div>
    </div>
  );
}
