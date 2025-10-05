import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { runHealthCheck, type HealthCheckResult } from '../utils/healthCheck';

interface HealthCheckScreenProps {
  onSuccess: () => void;
}

export function HealthCheckScreen({ onSuccess }: HealthCheckScreenProps) {
  const [result, setResult] = React.useState<HealthCheckResult | null>(null);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    runHealthCheck()
      .then(res => {
        setResult(res);
        if (res.success) {
          setTimeout(onSuccess, 500);
        }
      })
      .catch(err => {
        setResult({
          success: false,
          errors: ['Unerwarteter Fehler beim Health-Check: ' + err.message],
          warnings: [],
          details: {
            indexedDB: false,
            crypto: false,
            encryptionMode: 'unknown',
            database: false,
          },
        });
      })
      .finally(() => setIsChecking(false));
  }, [onSuccess]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Initialisierung läuft...
          </h2>
          <p className="text-sm text-gray-600">
            System wird geprüft
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            System bereit
          </h2>
          {result.warnings.length > 0 && (
            <div className="mt-4 max-w-md mx-auto">
              {result.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-left text-sm text-yellow-700 bg-yellow-50 p-3 rounded mb-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg border border-red-200 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Initialisierung fehlgeschlagen
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Die Anwendung konnte nicht vollständig initialisiert werden. Bitte beheben Sie die folgenden Probleme:
            </p>

            <div className="space-y-3">
              {result.errors.map((error, i) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              ))}
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Warnungen:</h3>
                {result.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-700 font-medium mb-2">
                System-Details
              </summary>
              <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </details>

            <div className="flex gap-2 mt-6">
              <Button onClick={() => window.location.reload()} variant="primary" size="sm">
                Neu laden
              </Button>
              <Button
                onClick={() => {
                  if (confirm('Alle lokalen Daten werden gelöscht. Fortfahren?')) {
                    localStorage.clear();
                    indexedDB.databases().then(dbs => {
                      dbs.forEach(db => db.name && indexedDB.deleteDatabase(db.name));
                    }).finally(() => {
                      window.location.reload();
                    });
                  }
                }}
                variant="secondary"
                size="sm"
              >
                Daten zurücksetzen
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
