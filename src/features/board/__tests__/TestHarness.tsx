/**
 * Test harness for Board component testing
 * Provides necessary providers and mocks for isolated testing
 */

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../app/auth/AuthProvider';
import { vi } from 'vitest';

// Mock the database and crypto dependencies
vi.mock('../../../data/db', () => ({
  db: {
    clients: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      update: vi.fn(),
      put: vi.fn()
    },
    users: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn()
    },
    getKV: vi.fn(),
    setKV: vi.fn()
  }
}));

vi.mock('../../../data/crypto', () => ({
  cryptoManager: {
    getActiveKey: vi.fn().mockResolvedValue({}),
    hasKey: vi.fn().mockReturnValue(true),
    clearKey: vi.fn()
  }
}));

vi.mock('../../../utils/env', () => ({
  getEncryptionMode: vi.fn().mockReturnValue('dev-enc'),
  getDbName: vi.fn().mockReturnValue('test-db'),
  isLocalhostOrigin: vi.fn().mockReturnValue(true)
}));

interface TestWrapperProps {
  children: React.ReactNode;
}

function TestWrapper({ children }: TestWrapperProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

export function withFakeTimers<T>(testFn: () => T | Promise<T>): () => Promise<T> {
  return async () => {
    vi.useFakeTimers();
    try {
      const result = await testFn();
      return result;
    } finally {
      vi.useRealTimers();
    }
  };
}

// Mock actions for testing
export const mockActions = {
  update: vi.fn(),
  bulkUpdate: vi.fn(),
  setOffer: vi.fn(),
  setFollowup: vi.fn(),
  setAssignedTo: vi.fn(),
  setStatus: vi.fn(),
  setResult: vi.fn(),
  cyclePriority: vi.fn(),
  addContactAttempt: vi.fn(),
  archive: vi.fn(),
  unarchive: vi.fn(),
  togglePin: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  getStackStatus: vi.fn().mockReturnValue({
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0
  })
};

export function resetMockActions() {
  Object.values(mockActions).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
}