# ADR-0001: Export Policy Standardization

## Status
Accepted

## Context
The ClientTool codebase was experiencing Esbuild export errors like "No matching export in src/features/board/Board.tsx for import Board" due to inconsistent export/import patterns across the application. Different modules used mixed patterns of default exports, named exports, and barrel re-exports, leading to:

- Build failures when imports didn't match exports
- Developer confusion about which import pattern to use
- Maintenance overhead when refactoring modules
- Inconsistent API surface across features

## Decision
We establish a standardized export policy with automated validation:

### Export Rules

#### Components (React Components)
- **File exports**: Default export only
- **Barrel exports**: Named re-export from default
- **Pattern**: `export { default as ComponentName } from './ComponentName'`

```typescript
// ✅ Component file (Board.tsx)
export default function Board() { /* ... */ }

// ✅ Barrel (index.ts)
export { default as Board } from './Board';

// ✅ Consumer import
import { Board } from '../features/board';
```

#### Hooks, Services, Utilities, Types
- **File exports**: Named exports only (no default)
- **Barrel exports**: Re-export named exports
- **Pattern**: `export * from './moduleName'` or `export { namedExport } from './moduleName'`

```typescript
// ✅ Hook file (useBoardActions.ts)
export function useBoardActions() { /* ... */ }

// ✅ Service file (MutationService.ts)
export const mutationService = new MutationService();

// ✅ Barrel (index.ts)
export * from './useBoardActions';
export { mutationService } from './MutationService';

// ✅ Consumer import
import { useBoardActions, mutationService } from '../features/board';
```

### Prohibited Patterns
- ❌ Mixed exports: `export default function Board() {}` + `export { Board }`
- ❌ Default exports for hooks/services/utilities
- ❌ Direct file imports when barrel exists: `import Board from './Board'` (use barrel instead)

## Implementation

### Automated Validation
Two guard tests ensure policy compliance:

1. **Export Contract Tests** (`src/__tests__/exports.contract.test.ts`)
   - Validates each module follows its declared export pattern
   - Checks barrel re-exports match source exports
   - Prevents mixed export patterns

2. **Import Usage Tests** (`src/__tests__/imports.usage.test.ts`)
   - Validates actual consumer imports work correctly
   - Checks cross-module import consistency
   - Detects circular dependencies

### Manifest-Driven Approach
Policy is defined in `docs/export-policy.json` with entries like:
```json
{
  "path": "src/features/board/Board.tsx",
  "kind": "component", 
  "barrel": "src/features/board/index.ts",
  "exportType": "default",
  "barrelExport": "named"
}
```

## Benefits

1. **Build Reliability**: Eliminates Esbuild export/import mismatches
2. **Developer Experience**: Clear, consistent patterns reduce cognitive load
3. **Maintainability**: Automated validation prevents regressions
4. **Refactoring Safety**: Consistent patterns make large-scale changes safer
5. **API Clarity**: Clear distinction between public (barrel) and internal APIs

## Consequences

### Positive
- Consistent import patterns across the codebase
- Automated prevention of export/import mismatches
- Clear API boundaries via barrel exports
- Improved IDE autocomplete and navigation

### Negative
- Initial migration effort for existing inconsistent modules
- Additional test maintenance for guard tests
- Slight verbosity in barrel files

## Compliance
All modules must follow this policy. The guard tests run in CI and will fail builds that violate the export policy, ensuring long-term consistency.

## Related
- See `docs/export-policy.json` for the complete module manifest
- Guard tests in `src/__tests__/exports.contract.test.ts` and `src/__tests__/imports.usage.test.ts`