import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../app/auth/AuthProvider';
import { getEncryptionMode } from '../utils/env';
import { SidebarFilters } from '../features/board/SidebarFilters';
import { BarChart3, Download, FileSpreadsheet, Home, Settings, Shield, Trello, Users } from 'lucide-react';
import { SyncStatusBadge } from './SyncStatusBadge';

import { UserSwitcher } from './UserSwitcher';

function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

function Badge({ children, tone='default' }: { children: React.ReactNode; tone?: 'default'|'warn'|'danger'|'success' }) {
  const map: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700 border border-gray-200',
    warn: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  };
  return (
    <span className={cx('px-2 py-0.5 rounded text-xs whitespace-nowrap', map[tone] || map.default)}>
      {children}
    </span>
  );
}

type NavItemProps = {
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  desc: string;
};

function NavItem({ to, icon: Icon, title, desc }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'block rounded-lg px-3 py-2 border transition-colors',
          isActive
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'border-transparent text-gray-800 hover:bg-gray-100'
        )
      }
    >
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 text-current" />
        <div className="leading-tight">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-gray-500">{desc}</div>
        </div>
      </div>
    </NavLink>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const auth = (() => { try { return useAuth(); } catch { return null; } })();

  let enc = 'PLAIN';
  try {
    const mode = getEncryptionMode?.() ?? 'plain';
    if (mode === 'dev-enc') enc = 'DEV-ENC';
    else if (mode === 'prod-enc') enc = 'PROD-ENC';
    else enc = 'PLAIN';
  } catch {}

  const role = (auth?.role ?? 'admin').toUpperCase();
  const userName = auth?.currentUser?.name ?? 'Admin (Demo)';

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-white">
      {/* Sidebar */}
      <aside className="border-r bg-white/50 backdrop-blur-[0.5px]">
        <nav className="flex flex-col gap-2 p-3 text-sm">
          <NavItem to="/dashboard" icon={Home} title="Dashboard" desc="Übersicht und Aktivitäten" />

          <NavItem to="/import" icon={FileSpreadsheet} title="Import" desc="Excel/CSV/PDF-Dateien importieren" />

          <NavItem to="/board" icon={Trello} title="Board" desc="Kanban-Ansicht" />
          {location.pathname.startsWith('/board') && (
            <div className="pl-4">
              <SidebarFilters />
            </div>
          )}
          <NavItem to="/statistik" icon={BarChart3} title="Statistik" desc="Auswertungen und Berichte" />
          {auth?.can && auth.can('import_data') && (
            <NavItem to="/sync" icon={Users} title="Team-Sync" desc="OneDrive/SharePoint Synchronisation" />
          )}
          {auth?.can && auth.can('view_security') && (
            <NavItem to="/sicherheit" icon={Shield} title="Sicherheit" desc="Sicherheitseinstellungen" />
          )}
          {auth?.can && auth.can('manage_users') && (
            <NavItem to="/admin" icon={Settings} title="Administration" desc="Benutzer- und Systemverwaltung" />
          )}

          <NavItem to="/backup" icon={Download} title="Export" desc="Daten exportieren" />

          <div className="mt-2 h-px bg-gray-200" />
          <div className="px-2 py-3 text-[11px] text-gray-500">
            <div className="font-medium">Local-Only Modus</div>
            <div>Keine externen Verbindungen</div>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="grid grid-rows-[56px_1fr]">
        <header className="border-b bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-gray-900">Klient:innendaten-Tool</div>
            <div className="flex items-center gap-1">
              <Badge>Local-Only (SW deaktiviert in dieser Umgebung)</Badge>
              <Badge tone={enc==='DEV-ENC' ? 'warn' : enc==='PROD-ENC' ? 'success' : 'default'}>{enc}</Badge>
              <Badge tone="danger">{role}</Badge>
              <SyncStatusBadge />
            </div>
          </div>
          <div className="flex items-center gap-2"><div className="text-sm text-gray-700">{userName}</div><UserSwitcher /></div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
