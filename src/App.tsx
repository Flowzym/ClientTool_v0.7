import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './app/auth/AuthProvider';
import { Shell } from './components/Shell';

import { Board } from './features/board/Board';
import { Dashboard } from './features/dashboard/Dashboard';
import { Statistik } from './features/statistik/Statistik';
import { Import } from './features/import/Import';
import { ImportExcel } from './features/import-excel/ImportExcel';
import { ImportPdf } from './features/import-pdf/ImportPdf';
import { Backup } from './features/backup/Backup';
import { Sicherheit } from './features/sicherheit/Sicherheit';
import { Admin } from './features/admin/Admin';
import { SyncSettings } from './features/sync/SyncSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/board" element={<Board />} />
            <Route path="/statistik" element={<Statistik />} />

            {/* Import Landing */}
            <Route path="/import" element={<Import />} />
            {/* Dedicated routes to avoid wrong screen */}
            <Route path="/import/excel" element={<ImportExcel />} />
            <Route path="/import/pdf" element={<ImportPdf />} />

            <Route path="/sync" element={<SyncSettings />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/sicherheit" element={<Sicherheit />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<div className="p-6 text-gray-600">Not found</div>} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthProvider>
  );
}
