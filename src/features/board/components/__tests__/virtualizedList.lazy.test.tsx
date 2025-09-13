import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../app/auth/AuthProvider';

// Mock dependencies
vi.mock('../../../data/db', () => ({
  db: {
    clients: { toArray: vi.fn().mockResolvedValue([]) },
    users: { toArray: vi.fn().mockResolvedValue([]) },
    getKV: vi.fn(),
    setKV: vi.fn()
  }
}));

vi.mock('../../../data/crypto', () => ({
  cryptoManager: {
    getActiveKey: vi.fn().mockResolvedValue({}),
    hasKey: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../../../utils/env', () => ({
  getEncryptionMode: vi.fn().mockReturnValue('dev-enc'),
  getDbName: vi.fn().mockReturnValue('test-db')
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('VirtualizedBoardList lazy client row', () => {
  it('mounts without runtime errors', async () => {
    const { VirtualizedBoardList } = await import('../VirtualizedBoardList');
    
    const mockClients = [
      { 
        id: '1', 
        firstName: 'Anna',
        lastName: 'Müller', 
        status: 'offen',
        priority: 'normal',
        contactCount: 0,
        contactLog: [],
        isArchived: false
      }
    ];
    
    const mockUsers = [
      { id: 'user-1', name: 'Test User', role: 'editor', active: true }
    ];
    
    const mockActions = {
      update: vi.fn(),
      setOffer: vi.fn(),
      setStatus: vi.fn(),
      togglePin: vi.fn()
    };

    // Should not throw during render
    const { container } = render(
      <TestWrapper>
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <VirtualizedBoardList
            clients={mockClients}
            users={mockUsers}
            actions={mockActions}
            selectedIds={new Set()}
            onToggleSelect={vi.fn()}
            rowHeight={52}
          />
        </Suspense>
      </TestWrapper>
    );

    // Wait for lazy component to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Should render without errors
    expect(container).toBeInTheDocument();
    
    // Should contain client data
    await waitFor(() => {
      expect(screen.getByText(/Müller|Anna/i)).toBeInTheDocument();
    });
  });

  it('handles lazy loading failure gracefully', async () => {
    // Mock import failure
    const originalImport = (global as any).__vite_ssr_import__;
    (global as any).__vite_ssr_import__ = vi.fn().mockRejectedValue(new Error('Import failed'));

    const { VirtualizedBoardList } = await import('../VirtualizedBoardList');
    
    const mockClients = [{ id: '1', firstName: 'Test', lastName: 'User', status: 'offen' }];

    // Should handle import failure gracefully
    const { container } = render(
      <TestWrapper>
        <Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <VirtualizedBoardList
            clients={mockClients}
            users={[]}
            actions={{}}
            selectedIds={new Set()}
            onToggleSelect={vi.fn()}
          />
        </Suspense>
      </TestWrapper>
    );

    // Should show fallback during failed load
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Restore original import
    (global as any).__vite_ssr_import__ = originalImport;
  });

  it('preserves component props through lazy boundary', async () => {
    const { VirtualizedBoardList } = await import('../VirtualizedBoardList');
    
    const mockClient = { 
      id: 'test-client', 
      firstName: 'Max',
      lastName: 'Mustermann',
      status: 'offen',
      priority: 'normal',
      contactCount: 0,
      contactLog: [],
      isArchived: false
    };
    
    const mockOnToggleSelect = vi.fn();

    render(
      <TestWrapper>
        <Suspense fallback={null}>
          <VirtualizedBoardList
            clients={[mockClient]}
            users={[]}
            actions={{}}
            selectedIds={new Set(['test-client'])}
            onToggleSelect={mockOnToggleSelect}
          />
        </Suspense>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Mustermann, Max')).toBeInTheDocument();
    });

    // Should preserve selection state
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });
});