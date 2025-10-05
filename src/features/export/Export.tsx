import React from 'react';
import { Empty } from '../../components/Empty';
import { Button } from '../../components/Button';
import { Download, FileDown } from 'lucide-react';

export function Export() {
  const isPlainMode = false;
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Daten Export</h2>
      
      {isPlainMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <span className="font-medium">⚠️ Export im PLAIN-Modus deaktiviert</span>
          </div>
          <div className="text-sm text-yellow-700 mt-1">
            Aus Sicherheitsgründen ist der Export von unverschlüsselten Daten nicht erlaubt.
            Verwenden Sie dev-enc oder prod-enc für sichere Exports.
          </div>
        </div>
      )}
      
      <Empty
        title="Sichere Export-Funktionen"
        description="Kontrollierte Exportmöglichkeiten für verarbeitete Klient:innendaten in verschiedenen Formaten."
        icon={<Download className="w-12 h-12 text-gray-300" />}
        action={
          <Button 
            variant="secondary" 
            disabled={isPlainMode}
            title={isPlainMode ? "Export in PLAIN-Modus deaktiviert (DEV)" : undefined}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export konfigurieren
          </Button>
        }
      />
    </div>
  );
}