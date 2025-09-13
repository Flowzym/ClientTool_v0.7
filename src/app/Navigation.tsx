import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  FileSpreadsheet,
  Trello,
  BarChart3,
  Download,
  Shield,
  Users
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from './auth/AuthProvider';
import type { Permission } from '../domain/auth';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  requiredPerms?: Permission[];
}

const navigationItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: Home,
    description: 'Übersicht und Aktivitäten'
  },
  {
    path: '/import',
    label: 'Import',
    icon: FileSpreadsheet,
    description: 'Excel/CSV/PDF-Dateien importieren',
    requiredPerms: ['import_data']
  },
  {
    path: '/board',
    label: 'Board',
    icon: Trello,
    description: 'Kanban-Ansicht',
    requiredPerms: ['view_board']
  },
  {
    path: '/statistik',
    label: 'Statistik',
    icon: BarChart3,
    description: 'Auswertungen und Berichte',
    requiredPerms: ['view_stats']
  },
  {
    path: '/sync',
    label: 'Team-Sync',
    icon: Users,
    description: 'OneDrive/SharePoint Synchronisation',
    requiredPerms: ['import_data']
  },
  {
    path: '/export',
    label: 'Export',
    icon: Download,
    description: 'Daten exportieren',
    requiredPerms: ['export_data']
  },
  {
    path: '/sicherheit',
    label: 'Sicherheit',
    icon: Shield,
    description: 'Sicherheitseinstellungen',
    requiredPerms: ['view_security']
  }
];

export function Navigation() {
  const { canAny } = useAuth();
  
  const visibleItems = navigationItems.filter(item => {
    if (!item.requiredPerms) return true;
    return canAny(item.requiredPerms as any);
  });

  return (
    <nav className="flex-1 px-4 py-6">
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
                isActive
                  ? 'bg-accent-50 text-accent-700 border-r-2 border-accent-600'
                  : 'text-gray-700 hover:text-gray-900'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div className="text-xs text-gray-500 truncate">
                  {item.description}
                </div>
              )}
            </div>
          </NavLink>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 px-3">
          <div className="font-medium mb-1">Local-Only Modus</div>
          <div>Keine externen Verbindungen</div>
        </div>
      </div>
    </nav>
  );
}