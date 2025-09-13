/**
 * Virtualized Board List for performance with large datasets
 * Renders only visible rows with overscan for smooth scrolling
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Client, User } from '../../../domain/models';

interface VirtualizedBoardListProps {
  clients: Client[];
  users: User[];
  actions: any;
  selectedIds: Set<string>;
  onToggleSelect: (index: number, id: string, withShift: boolean) => void;
  rowHeight?: number;
  overscan?: number;
  className?: string;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export function VirtualizedBoardList({
  clients,
  users,
  actions,
  selectedIds,
  onToggleSelect,
  rowHeight = 52,
  overscan = 8,
  className = ''
}: VirtualizedBoardListProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Calculate visible range
  const { virtualItems, totalSize } = useMemo(() => {
    const itemCount = clients.length;
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
    );

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * rowHeight,
        size: rowHeight
      });
    }

    return {
      virtualItems: items,
      totalSize: itemCount * rowHeight
    };
  }, [clients.length, scrollTop, containerHeight, rowHeight, overscan]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
  }, []);

  // Measure container height
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
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
              >
                <ClientRowVirtualized
                  client={client}
                  index={virtualItem.index}
                  users={users}
                  actions={actions}
                  selected={selectedIds.has(client.id)}
                  onToggleSelect={(withShift) => onToggleSelect(virtualItem.index, client.id, withShift)}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded pointer-events-none">
          <div>Virtual: {virtualItems.length}/{clients.length} rows</div>
          <div>Scroll: {Math.round(scrollTop)}px</div>
          <div>Range: {virtualItems[0]?.index ?? 0}-{virtualItems[virtualItems.length - 1]?.index ?? 0}</div>
        </div>
      )}
    </div>
  );
}

// Wrapper component for ClientRow to handle virtualization context
function ClientRowVirtualized(props: any) {
  // Import ClientRow dynamically to avoid circular dependencies
  const ClientRow = React.lazy(() => import('./ClientRow'));
  
  return (
    <React.Suspense fallback={<div className="h-12 bg-gray-50 animate-pulse" />}>
      <ClientRow {...props} />
    </React.Suspense>
  );
}