import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { computeKPIs } from './kpis';
import { db } from '../../data/db';

export function Dashboard() {
  const [clients, setClients] = React.useState<any[]>([]);

  React.useEffect(() => {
    db.clients.toArray().then(setClients);
  }, []);

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
