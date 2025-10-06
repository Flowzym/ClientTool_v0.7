/**
 * Virtualized Board List for performance with large datasets
 * Renders only visible rows with overscan for smooth scrolling
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { perfMark } from '../../../lib/perf/timer';
import { createCounter } from '../../../lib/perf/counter';
import type { Client, User } from '../../../domain/models';

// Performance counters (Dev-only)
const overscanCounter = createCounter('overscan');

// Lazy-load ClientRow for code-splitting
const ClientRowLazy = React.lazy(() =>
  import('./ClientRow').then((m) => ({
    default: m.default ?? m.ClientRow,
  }))
);

// Throttle helper for scroll events
function throttle<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: number | null = null;
  let lastRan = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastRan);

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastRan = now;
      func(...args);
    } else if (!timeout) {
      timeout = window.setTimeout(() => {
        lastRan = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  }) as T;
}

interface VirtualizedBoardListProps {
  clients: Client[];
  users: User[];
  actions: any;
  visibleColumns?: any[];
  selectedIds: Set<string>;
  onToggleSelect: (index: number, id: string, withShift: boolean) => void;
  onTogglePin: (index: number, id: string, event?: React.MouseEvent) => void;
  rowHeight?: number;
  overscan?: number;
  className?: string;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

function VirtualizedBoardList({
  clients,
  users,
  actions,
  visibleColumns,
  selectedIds,
  onToggleSelect,
  onTogglePin,
  rowHeight = 44,
  overscan = 3,
  className = ''
}: VirtualizedBoardListProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const lastScrollTopRef = useRef(0);

  // Track virtualization lifecycle
  useEffect(() => {
    perfMark('list:mount');
    return () => {
      perfMark('list:unmount');
    };
  }, []);

  // Calculate visible range with improved buffering (memoized)
  const virtualItems = useMemo(() => {
    const itemCount = clients.length;
    const visibleStart = Math.floor(scrollTop / rowHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / rowHeight);
    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(itemCount - 1, visibleEnd + overscan);

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (import.meta.env.DEV) {
        if (i < visibleStart || i > visibleEnd) {
          overscanCounter.inc();
        }
      }

      items.push({
        index: i,
        start: i * rowHeight,
        size: rowHeight
      });
    }

    return items;
  }, [clients.length, scrollTop, containerHeight, rowHeight, overscan]);

  const totalSize = useMemo(() => clients.length * rowHeight, [clients.length, rowHeight]);

  // Handle scroll events with throttling (60fps = ~16ms)
  const handleScroll = useMemo(
    () =>
      throttle((e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        const delta = Math.abs(newScrollTop - lastScrollTopRef.current);

        // Only update if scroll delta is significant (> 5px)
        if (delta > 5) {
          lastScrollTopRef.current = newScrollTop;
          setScrollTop(newScrollTop);
        }
      }, 16),
    []
  );

  // Measure container height with debouncing
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    let resizeTimeout: number | null = null;
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => {
          setContainerHeight(entry.contentRect.height);
        }, 100);
      }
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  // Scroll to index (for auto-scroll on selection)
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'center') => {
    const element = scrollElementRef.current;
    if (!element) return;

    let scrollTop: number;
    switch (align) {
      case 'start':
        scrollTop = index * rowHeight;
        break;
      case 'end':
        scrollTop = (index + 1) * rowHeight - containerHeight;
        break;
      case 'center':
      default:
        scrollTop = index * rowHeight - containerHeight / 2 + rowHeight / 2;
        break;
    }

    element.scrollTo({
      top: Math.max(0, Math.min(scrollTop, totalSize - containerHeight)),
      behavior: 'smooth'
    });
  }, [rowHeight, containerHeight, totalSize]);

  // Expose scrollToIndex for parent components
  useEffect(() => {
    const handleScrollToIndex = (event: CustomEvent<{ index: number; align?: 'start' | 'center' | 'end' }>) => {
      scrollToIndex(event.detail.index, event.detail.align);
    };

    window.addEventListener('board:scrollToIndex', handleScrollToIndex as EventListener);
    return () => window.removeEventListener('board:scrollToIndex', handleScrollToIndex as EventListener);
  }, [scrollToIndex]);

  // Focus management for virtualized items
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      const currentIndex = virtualItems.find(item => {
        const element = document.querySelector(`[data-row-index="${item.index}"]`);
        return element && element.contains(document.activeElement);
      })?.index ?? 0;
      
      const nextIndex = Math.max(0, Math.min(clients.length - 1, currentIndex + direction));
      
      // Scroll to next item and focus it
      scrollToIndex(nextIndex, 'center');
      
      // Focus the next row after scroll
      setTimeout(() => {
        const nextElement = document.querySelector(`[data-row-index="${nextIndex}"]`) as HTMLElement;
        if (nextElement) {
          const focusable = nextElement.querySelector('input, button, select') as HTMLElement;
          focusable?.focus();
        }
      }, 100);
    }
  }, [virtualItems, clients.length, scrollToIndex]);

  return (
    <div className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Virtualized scroll container */}
      <div
        ref={scrollElementRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ height: containerHeight }}
        role="grid"
        aria-label="Client list"
        aria-rowcount={clients.length}
      >
        {/* Total size spacer */}
        <div style={{ height: totalSize, position: 'relative' }}>
          {/* Rendered items */}
          {virtualItems.map(virtualItem => {
            const client = clients[virtualItem.index];
            if (!client) return null;

            return (
              <div
                key={client.id}
                data-row-index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: virtualItem.start,
                  left: 0,
                  right: 0,
                  height: virtualItem.size
                }}
                role="row"
                aria-rowindex={virtualItem.index + 1}
                aria-selected={selectedIds.has(client.id)}
              >
                <ClientRowVirtualized
                  client={client}
                  index={virtualItem.index}
                  users={users}
                  actions={actions}
                  visibleColumns={visibleColumns}
                  selected={selectedIds.has(client.id)}
                  onToggleSelect={(withShift) => onToggleSelect(virtualItem.index, client.id, withShift)}
                  onTogglePin={onTogglePin}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Debug info in development */}
      {import.meta.env.DEV && clients.length > 0 && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded pointer-events-none z-10">
          <div>Rendered: {virtualItems.length}/{clients.length} rows</div>
          <div>Scroll: {Math.round(scrollTop)}px</div>
          <div>Range: {virtualItems[0]?.index ?? 0}-{virtualItems[virtualItems.length - 1]?.index ?? 0}</div>
          <div className="text-green-400 mt-1">Total Clients: {clients.length}</div>
        </div>
      )}
    </div>
  );
}

// Wrapper component for ClientRow to handle virtualization context
function ClientRowVirtualized(props: any) {
  return (
    <React.Suspense fallback={<div className="h-12 bg-gray-50 animate-pulse" />}>
      <ClientRowLazy {...props} />
    </React.Suspense>
  );
}

export default VirtualizedBoardList;