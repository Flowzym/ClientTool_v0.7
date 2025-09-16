import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Navigation } from './Navigation';
import { AppContext } from '../App';
import { getPWAStatusLabel } from '../utils/pwa';
import { ModeBadge } from '../components/ModeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { UserSwitcher } from '../components/UserSwitcher';

export function AppShell() {
  const { pwaStatus } = useContext(AppContext);
  const statusInfo = pwaStatus ? getPWAStatusLabel(pwaStatus.status) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="h-full flex flex-col">
          <Navigation />
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              Klient:innendaten-Tool
            </h1>
            {statusInfo && (
              <Badge variant={statusInfo.variant} size="md">
                {statusInfo.label}
              </Badge>
            )}
            <ModeBadge />
            <RoleBadge />
          </div>
          
          <div className="flex items-center gap-2">
            <UserSwitcher />
          </div>
        </header>
        
        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}