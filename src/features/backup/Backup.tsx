import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { db } from '../../data/db';
import { getEncryptionMode, supportsFSAccess } from '../../utils/env';

type BackupPayload = {
  meta: {
    version: 1;
    exportedAt: string;
    encryptionMode: string;
  };
  tables: {
    clients: any[];
    users: any[];
    kv: any[];
  };
};

const PROTECTED_FIELDS: (keyof any)[] = [
  'contactLog', 'contactCount', 'lastActivity',
  'assignedTo', 'isArchived', 'archivedAt'
];

export function Backup() {
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string>('');

  const doExport = React.useCallback(async () => {
    setBusy(true); setMessage('');
    try {
      const [clients, users, kv] = await Promise.all([
        db.clients.toArray(),
        db.users.toArray(),
        db.kv.toArray()
      ]);

      const payload: BackupPayload = {
        meta: { version: 1, exportedAt: new Date().toISOString(), encryptionMode: getEncryptionMode() },
        tables: { clients, users, kv }
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });

      if (supportsFSAccess()) {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: `clienttool-backup-${Date.now()}.json`,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
        });
        // @ts-ignore
        const stream = await handle.createWritable();
        await stream.write(blob);
        await stream.close();
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `clienttool-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
      }
      setMessage('Backup exportiert.');
    } catch (e) {
      console.error(e);
      setMessage('Export fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }, []);

  const doImport = React.useCallback(async (file: File) => {
    setBusy(true); setMessage('');
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupPayload;
      if (!data?.meta || !data?.tables) throw new Error('Ungültiges Backup-Format');

      // Merge mit Schutz lokaler Felder
      const existingClients = await db.clients.toArray();
      const existingById = new Map<string|number, any>(existingClients.map(c => [c.id, c]));

      for (const c of data.tables.clients || []) {
        const ex = existingById.get(c.id);
        if (!ex) {
          await db.clients.put(c);
        } else {
          const merged: any = { ...ex };
          for (const [k, v] of Object.entries(c)) {
            if (k === 'id') continue;
            if (PROTECTED_FIELDS.includes(k as any)) continue;
            merged[k] = v;
          }
          await db.clients.put(merged);
        }
      }

      if (Array.isArray(data.tables.users)) {
        for (const u of data.tables.users) await db.users.put(u);
      }
      if (Array.isArray(data.tables.kv)) {
        for (const kv of data.tables.kv) await db.kv.put(kv);
      }

      setMessage('Backup importiert.');
    } catch (e) {
      console.error(e);
      setMessage('Import fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Backup &amp; Restore</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vollbackup (JSON)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Exportiert/Importiert <code>clients</code>, <code>users</code>, <code>kv</code> als JSON.
            <br />
            Beim Import werden lokale Felder ({PROTECTED_FIELDS.join(', ')}) nicht überschrieben.
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={doExport} disabled={busy}>Exportieren</Button>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) doImport(f);
                  e.currentTarget.value = '';
                }}
                disabled={busy}
              />
              Importieren
            </label>
          </div>

          {message && <div className="text-sm text-gray-700">{message}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
