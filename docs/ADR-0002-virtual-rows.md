# ADR-0002: Virtualized Board Rows for Performance

## Status
Implemented

## Context

The Board component renders client data in a table format. With large datasets (1000+ clients), the DOM becomes heavy and scrolling performance degrades significantly. Each client row contains multiple interactive elements (status chips, dropdowns, buttons), making the rendering cost substantial.

### Performance Issues Observed
- **DOM bloat**: 1000+ rows = 10,000+ DOM nodes
- **Scroll jank**: Repainting large tables causes frame drops
- **Memory usage**: All rows stay in memory regardless of visibility
- **Initial render time**: Proportional to total dataset size

## Decision

Implement **optional virtualization** behind a feature flag with complete fallback to existing behavior.

### Architecture
- **Feature flag**: `featureManager.virtualRows` (default: false)
- **Fallback strategy**: Identical behavior when disabled
- **Virtualization**: Fixed row height with overscan
- **Sticky header**: Rendered outside virtual container

### Implementation Details

```typescript
// Feature flag control
featureManager.setFeature('virtualRows', false) // Default off

// Virtualization parameters
rowHeight: 44px (fixed)
overscan: 8 rows
viewport: dynamic based on container size
```

### Component Structure
```typescript
// Board.tsx - Feature flag switching
{virtualRowsEnabled ? (
  <VirtualClientList {...props} />
) : (
  <ClassicClientList {...props} />
)}

// VirtualizedBoardList.tsx - Virtualization container
<div role="grid" aria-label="Client list">
  {virtualItems.map(item => (
    <ClientRowVirtualized key={item.id} {...props} />
  ))}
</div>
```
## Consequences

### Positive
- **Performance**: 10x+ improvement with large datasets
- **Memory efficiency**: Only visible rows in DOM
- **Smooth scrolling**: Consistent frame rates
- **Backward compatibility**: Zero impact when disabled

### Negative
- **Complexity**: Additional rendering path to maintain
- **Focus management**: Requires careful handling of off-screen elements
- **Testing overhead**: Both paths need validation

### Trade-offs
- **Fixed row height**: Simpler implementation, consistent layout
- **No column virtualization**: Horizontal scrolling remains unchanged
- **No dynamic sizing**: Row height estimation not implemented in v1

## Implementation

### Core Components
- `VirtualizedBoardList.tsx`: Main virtualization container
- `Board.tsx`: Feature flag switching logic
- `config/features.ts`: Feature flag management

### Key Features
- **Overscan**: Renders extra rows for smooth scrolling
- **Focus preservation**: Maintains keyboard navigation
- **Selection compatibility**: Works with existing selection logic
- **Auto-scroll**: `scrollToIndex` for programmatic navigation

### React.lazy Integration
- **Lazy loading**: ClientRow loaded on-demand for virtual mode
- **Robust mapping**: Handles both default and named exports
- **Suspense boundary**: Graceful loading states
- **Error handling**: Fallback for import failures
### Testing Strategy
- **Toggle tests**: Verify both rendering paths
- **Performance tests**: Validate DOM node reduction
- **Interaction tests**: Selection, pin, status changes work
- **Accessibility tests**: ARIA attributes and keyboard navigation
- **Hook order guards**: Prevent React warnings during flag changes
- **Lazy loading tests**: Verify React.lazy works correctly

## Compliance

### Accessibility
- Maintains ARIA grid semantics
- Preserves keyboard navigation
- Focus management for off-screen items

### Performance
- Target: <50 DOM nodes for 1000+ dataset
- Smooth 60fps scrolling
- <100ms initial render time

### Compatibility
- Zero API changes to cell components
- Existing selection/batch operations unchanged
- Pin/status/notes functionality preserved

### Feature Flag Management
- **Development toggle**: Available in DEV builds for testing
- **Persistent settings**: Flag state saved to localStorage
- **Runtime switching**: No page reload required
- **Gradual rollout**: Can be enabled per user/environment
## Monitoring

### Success Metrics
- DOM node count reduction (>90% for large datasets)
- Scroll performance (consistent frame times)
- Feature adoption (usage analytics)

### Risk Mitigation
- Feature flag allows instant rollback
- Comprehensive test coverage for both paths
- Gradual rollout strategy

### Current Status (v0.7.1)
- ✅ **Implementation complete**: Both rendering paths stable
- ✅ **Tests comprehensive**: Unit, integration, guard tests
- ✅ **Performance validated**: 10x+ improvement with large datasets
- ✅ **Zero regressions**: Classic mode unchanged
- 🔄 **Rollout phase**: Opt-in testing in development
## Future Considerations

### Potential Enhancements
- Dynamic row height measurement
- Column virtualization for wide tables
- Infinite scrolling for very large datasets
- Virtual scrolling for mobile optimization

### Known Limitations
- Fixed row height assumption
- Horizontal scrolling not virtualized
- Focus restoration complexity
- Additional testing maintenance

### Next Steps
- Monitor performance metrics in production
- Collect user feedback on virtual mode
- Consider default enablement for large datasets
- Evaluate column virtualization need
## References
- Performance benchmarks in `virtualRows.toggle.test.tsx`
- Implementation details in `VirtualizedBoardList.tsx`
- Feature flag management in `features.ts`
- Hook order guards in `board.hookOrder.guard.test.tsx`
- Lazy loading tests in `virtualizedList.lazy.test.tsx`