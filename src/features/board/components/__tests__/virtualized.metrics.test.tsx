/**
 * Virtualized metrics smoke tests
 * Validates performance characteristics without heavy end-to-end runs
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VirtualizedBoardList } from '../VirtualizedBoardList';
import { ClientRow } from '../ClientRow';
import { seedRows } from '../../__tests__/fixtures';
import { createCounter } from '../../../../lib/perf/counter';

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn().mockReturnValue([]),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn()
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('Virtualized Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('row mount counting', () => {
    it('should count fewer row mounts with virtualization', () => {
      const clients = seedRows(100);
      const rowMountCounter = createCounter('test-rowMounts');
      
      // Mock ClientRow to increment counter
      const MockClientRow = ({ client }: any) => {
        React.useEffect(() => {
          rowMountCounter.inc();
        }, []);
        return <div data-testid={`client-${client.id}`}>{client.firstName}</div>;
      };

      // Render virtualized list (should render fewer rows)
      render(
        <VirtualizedBoardList
          clients={clients}
          users={[]}
          actions={{}}
          selectedIds={new Set()}
          onToggleSelect={() => {}}
          rowHeight={44}
          className="h-96"
        />
      );

      // Should render significantly fewer than 100 rows
      const renderedRows = screen.getAllByTestId(/^client-/);
      expect(renderedRows.length).toBeLessThan(50);
      expect(renderedRows.length).toBeGreaterThan(0);
    });

    it('should render all rows with flat list', () => {
      const clients = seedRows(20); // Smaller dataset for flat test
      const rowMountCounter = createCounter('test-flatMounts');
      
      const MockClientRow = ({ client }: any) => {
        React.useEffect(() => {
          rowMountCounter.inc();
        }, []);
        return <div data-testid={`client-${client.id}`}>{client.firstName}</div>;
      };

      // Render flat list
      render(
        <div className="divide-y">
          {clients.map((client, index) => (
            <MockClientRow key={client.id} client={client} index={index} />
          ))}
        </div>
      );

      // Should render all rows
      const renderedRows = screen.getAllByTestId(/^client-/);
      expect(renderedRows.length).toBe(20);
    });
  });

  describe('virtualization lifecycle', () => {
    it('should call performance marks on mount/unmount', () => {
      const clients = seedRows(10);
      
      const { unmount } = render(
        <VirtualizedBoardList
          clients={clients}
          users={[]}
          actions={{}}
          selectedIds={new Set()}
          onToggleSelect={() => {}}
          rowHeight={44}
        />
      );

      // Should have called mount mark
      expect(mockPerformance.mark).toHaveBeenCalledWith('list:mount');

      unmount();

      // Should have called unmount mark
      expect(mockPerformance.mark).toHaveBeenCalledWith('list:unmount');
    });

    it('should handle empty dataset gracefully', () => {
      expect(() => {
        render(
          <VirtualizedBoardList
            clients={[]}
            users={[]}
            actions={{}}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
            rowHeight={44}
          />
        );
      }).not.toThrow();

      // Should still call lifecycle marks
      expect(mockPerformance.mark).toHaveBeenCalledWith('list:mount');
    });

    it('should not crash with very large datasets', () => {
      const clients = seedRows(1000);
      
      expect(() => {
        render(
          <VirtualizedBoardList
            clients={clients}
            users={[]}
            actions={{}}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
            rowHeight={44}
            className="h-96"
          />
        );
      }).not.toThrow();

      // Should render without errors
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });

  describe('DOM efficiency validation', () => {
    it('should maintain low DOM node ratio with virtualization', () => {
      const clients = seedRows(500);
      
      const { container } = render(
        <VirtualizedBoardList
          clients={clients}
          users={[]}
          actions={{}}
          selectedIds={new Set()}
          onToggleSelect={() => {}}
          rowHeight={44}
          className="h-96"
        />
      );

      const domNodes = container.querySelectorAll('*').length;
      const domRatio = domNodes / clients.length;
      
      // Virtual should have very low DOM ratio
      expect(domRatio).toBeLessThan(0.5);
      expect(domNodes).toBeLessThan(200); // Reasonable upper bound
    });

    it('should have high DOM node ratio with flat rendering', () => {
      const clients = seedRows(50); // Smaller for flat test
      
      const { container } = render(
        <div className="divide-y">
          {clients.map((client, index) => (
            <div key={client.id} data-testid={`flat-client-${client.id}`}>
              {client.firstName} {client.lastName}
            </div>
          ))}
        </div>
      );

      const domNodes = container.querySelectorAll('*').length;
      const domRatio = domNodes / clients.length;
      
      // Flat should have high DOM ratio (close to 1:1 or higher)
      expect(domRatio).toBeGreaterThan(0.8);
    });
  });

  describe('accessibility preservation', () => {
    it('should maintain ARIA attributes in virtualized mode', () => {
      const clients = seedRows(100);
      
      render(
        <VirtualizedBoardList
          clients={clients}
          users={[]}
          actions={{}}
          selectedIds={new Set()}
          onToggleSelect={() => {}}
          rowHeight={44}
        />
      );

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', 'Client list');
      expect(grid).toHaveAttribute('aria-rowcount', '100');
    });

    it('should maintain row ARIA attributes', () => {
      const clients = seedRows(20);
      
      render(
        <VirtualizedBoardList
          clients={clients}
          users={[]}
          actions={{}}
          selectedIds={new Set()}
          onToggleSelect={() => {}}
          rowHeight={44}
        />
      );

      const rows = screen.getAllByRole('row');
      rows.forEach(row => {
        expect(row).toHaveAttribute('aria-rowindex');
      });
    });
  });
});