import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { computeKPIs } from './kpis';
import { db } from '../../data/db';

export function Dashboard() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    db.clients.toArray()
      .then(setClients)
      .catch(err => {
        console.error('Failed to load clients:', err);
        setError(err.message || 'Fehler beim Laden der Daten');
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingState message="Dashboard wird geladen..." />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Fehler beim Laden</h3>
        <p className="text-red-600 text-sm">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
          size="sm"
          className="mt-4"
        >
          Neu laden
        </Button>
      </div>
    );
  }

  const kpis = computeKPIs(clients as any);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Link to="/backup">
            <Button variant="secondary">Backup &amp; Restore</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kern-KPIs</CardTitle>
        </CardHeader>
        <CardContent>
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
              <div className="text-xs text-gray-500">Aktivität ≤7 Tage</div>
              <div className="text-2xl font-semibold">{kpis.activity.last7}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
