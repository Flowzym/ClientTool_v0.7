import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { Require } from './auth/Require';
import { Dashboard } from '../features/dashboard/Dashboard';
import { ImportExcel } from '../features/import-excel/ImportExcel';
import { ImportPdf } from '../features/import-pdf/ImportPdf';
import { Board } from '../features/board/Board';
import { Statistik } from '../features/statistik/Statistik';
import { Export } from '../features/export/Export';
import { Sicherheit } from '../features/sicherheit/Sicherheit';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: 'import-excel',
        element: (
          <Require perms={['import_data']}>
            <ImportExcel />
          </Require>
        )
      },
      {
        path: 'import-pdf',
        element: (
          <Require perms={['import_data']}>
            <ImportPdf />
          </Require>
        )
      },
      {
        path: 'board',
        element: (
          <Require perms={['view_board']}>
            <Board />
          </Require>
        )
      },
      {
        path: 'statistik',
        element: (
          <Require perms={['view_stats']}>
            <Statistik />
          </Require>
        )
      },
      {
        path: 'export',
        element: (
          <Require perms={['export_data']}>
            <Export />
          </Require>
        )
      },
      {
        path: 'sicherheit',
        element: (
          <Require perms={['view_security']}>
            <Sicherheit />
          </Require>
        )
      }
    ]
  }
]);