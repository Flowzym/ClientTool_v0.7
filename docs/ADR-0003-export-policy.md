# ADR-0003: Export Policy for Consistent Module Structure

## Status
Accepted

## Context

The project experienced frequent ESBuild and TypeScript errors due to inconsistent export patterns across modules. Different files used mixed export strategies (default + named, named-only, barrel re-exports), leading to:

### Problems Observed
- **Import resolution failures**: "No matching export" errors during build
- **Circular dependencies**: Barrel re-exports creating import loops
- **Bundle inconsistencies**: ESBuild unable to resolve mixed export patterns
- **Developer confusion**: Unclear which import style to use for different module types

## Decision

Implement **strict export policy** based on module type with automated enforcement:

### Component Exports
- **File level**: Default export only
- **Barrel level**: Named export (re-exported from default)
- **Rationale**: Components are typically used as single entities

```typescript
// Component file: Button.tsx
export default function Button() { /* ... */ }

// Barrel: components/index.ts
export { default as Button } from './Button';
```

### Hook/Service/Utility Exports
- **File level**: Named exports only (no default)
- **Barrel level**: Named exports (pass-through)
- **Rationale**: Multiple functions per module, tree-shaking optimization

```typescript
// Hook file: useBoardActions.ts
export function useBoardActions() { /* ... */ }
export function useBoardData() { /* ... */ }

// Barrel: hooks/index.ts
export * from './useBoardActions';
export * from './useBoardData';
```

### Type Exports
- **Always named**: `export type { Foo } from './types'`
- **Type-only imports**: `import type { Foo } from './types'`

## Implementation

### Enforcement Mechanisms
1. **Contract tests**: `exports.contract.test.ts` validates export shapes
2. **Usage tests**: `imports.usage.test.ts` validates actual import patterns
3. **ESLint rules**: Enforces consistent export patterns
4. **Build gates**: TypeScript compilation catches violations

### Migration Strategy
- **Phase 1**: Fix critical build-breaking inconsistencies
- **Phase 2**: Standardize component exports (default → barrel named)
- **Phase 3**: Consolidate hook/service exports (named-only)
- **Phase 4**: Add automated guards and tests

## Consequences

### Positive
- **Build stability**: Eliminated import resolution errors
- **Clear conventions**: Developers know which pattern to use
- **Tree-shaking**: Better bundle optimization with named exports
- **Tooling support**: ESLint and TypeScript can enforce patterns

### Negative
- **Migration effort**: Existing code requires updates
- **Learning curve**: Team needs to understand new patterns
- **Test maintenance**: Contract tests need updates when modules change

### Trade-offs
- **Consistency over flexibility**: Strict rules prevent creative solutions
- **Barrel overhead**: Additional indirection for component imports
- **Type imports**: Separate import statements for types

## Compliance

### Automated Validation
- Contract tests run on every build
- ESLint rules enforce export patterns
- TypeScript compilation catches violations

### Manual Guidelines
- New components: Always use default export
- New hooks/services: Always use named exports
- Barrel updates: Follow re-export patterns
- Type imports: Use `import type` syntax

## Monitoring

### Success Metrics
- Zero import resolution build errors
- Consistent export patterns across codebase
- Reduced bundle size through tree-shaking

### Risk Mitigation
- Comprehensive test coverage for export patterns
- Clear documentation and examples
- Gradual migration with backward compatibility

## References
- Export policy manifest: `docs/export-policy.json`
- Contract tests: `src/__tests__/exports.contract.test.ts`
- Usage validation: `src/__tests__/imports.usage.test.ts`