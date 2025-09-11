import type { Client } from '../../domain/models';

export interface KPIData {
  total: number;
  reached: number;
  unreachable3plus: number;
  statusCounts: Record<string, number>;
  activity: {
    last7: number;
    last30: number;
    older: number;
  };
  followups: {
    overdue: number;
    today: number;
    next7: number;
  };
}

function daysBetween(aISO?: string, bISO?: string): number | null {
  if (!aISO || !bISO) return null;
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString();
}

export function computeKPIs(clients: Client[]): KPIData {
  const todayISO = startOfTodayISO();
  const total = clients.length;
  let reached = 0;
  let unreachable3plus = 0;
  const statusCounts: Record<string, number> = {};
  let act_last7 = 0, act_last30 = 0, act_older = 0;
  let fu_overdue = 0, fu_today = 0, fu_next7 = 0;

  for (const c of clients) {
    // reached
    if ((c.contactCount ?? 0) > 0) reached++;

    // unreachable
    if ((c.contactCount ?? 0) >= 3 && (c.status === 'nichtErreichbar' || !c.result)) {
      unreachable3plus++;
    }

    // status
    const s = c.status ?? 'offen';
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;

    // activity buckets by lastActivity
    const d = daysBetween(todayISO, c.lastActivity ?? c.updatedAt ?? c.createdAt);
    if (d !== null) {
      if (d <= 7) act_last7++;
      else if (d <= 30) act_last30++;
      else act_older++;
    } else {
      act_older++;
    }

    // followups
    if (c.followUp) {
      const delta = daysBetween(c.followUp + 'T00:00:00.000Z', todayISO);
      if (delta !== null) {
        if (delta < 0) fu_overdue++;        // followUp in Vergangenheit
        else if (delta === 0) fu_today++;   // heute
        else if (delta <= 7) fu_next7++;    // nächste 7
      }
    }
  }

  return {
    total,
    reached,
    unreachable3plus,
    statusCounts,
    activity: { last7: act_last7, last30: act_last30, older: act_older },
    followups: { overdue: fu_overdue, today: fu_today, next7: fu_next7 }
  };
}
