import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { getEncryptionMode, isLocalhostOrigin } from '../utils/env';

export function RuntimeGuard() {
  const mode = getEncryptionMode();
  const isLocalhost = isLocalhostOrigin();
  
  // Nur PLAIN-Modus auf Nicht-localhost blockieren
  if (mode !== 'plain' || isLocalhost) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-error-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            PLAIN-Modus blockiert
          </h2>
        </div>
        
        <div className="space-y-3 text-sm text-gray-600 mb-6">
          <p>
            Die Anwendung läuft im PLAIN-Modus (keine Verschlüsselung) 
            auf einer Nicht-localhost-Umgebung.
          </p>
          <p>
            Aus Sicherheitsgründen ist dies nicht erlaubt.
          </p>
          <p>
            <strong>Lösungen:</strong>
          </p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Verwenden Sie localhost für Development</li>
            <li>Setzen Sie VITE_ENCRYPTION_MODE=dev-enc oder prod-enc</li>
            <li>Erstellen Sie einen lokalen Build</li>
          </ul>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-4 h-4" />
          <span>Weitere Informationen finden Sie auf der Sicherheit-Seite</span>
        </div>
      </div>
    </div>
  );
}