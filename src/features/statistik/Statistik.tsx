import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { BarChart3, RefreshCw, Filter } from 'lucide-react';
import { db } from '../../data/db';
import type { Client } from '../../domain/models';
import { computeKPIs } from '../dashboard/kpis';

export function Statistik() {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [onlyActive, setOnlyActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [kpis, setKpis] = React.useState<ReturnType<typeof computeKPIs> | null>(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await db.clients.toArray() as Client[];
      setClients(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const data = (onlyActive ? clients.filter(c => !c.isArchived) : clients);
    setKpis(computeKPIs(data));
  }, [clients, onlyActive]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Statistische Auswertungen</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            <Filter className="w-4 h-4" />
            nur nicht-archivierte
          </label>
          <Button onClick={load} disabled={isLoading} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Kern-KPIs
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!kpis ? (
            <div className="text-gray-500 py-6">Lade KPIs…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Klient:innen gesamt</div>
                <div className="text-2xl font-semibold">{kpis.total}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Erreicht (≥1 Kontakt)</div>
                <div className="text-2xl font-semibold">{kpis.reached}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Schwer erreichbar (≥3 Versuche)</div>
                <div className="text-2xl font-semibold">{kpis.unreachable3plus}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Aktivität letzte 7 Tage</div>
                <div className="text-2xl font-semibold">{kpis.activity.last7}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Aktivität 8–30 Tage</div>
                <div className="text-2xl font-semibold">{kpis.activity.last30}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Aktivität &gt;30 Tage</div>
                <div className="text-2xl font-semibold">{kpis.activity.older}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Follow-ups überfällig</div>
                <div className="text-2xl font-semibold">{kpis.followups.overdue}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Follow-ups heute</div>
                <div className="text-2xl font-semibold">{kpis.followups.today}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">Follow-ups nächste 7 Tage</div>
                <div className="text-2xl font-semibold">{kpis.followups.next7}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status-Verteilung</CardTitle>
        </CardHeader>
        <CardContent>
          {!kpis ? (
            <div className="text-gray-500 py-4">–</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(kpis.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="text-sm capitalize">{status}</div>
                  <div className="font-semibold">{count}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
