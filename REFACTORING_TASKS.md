# Refactoring Tasks - Klient:innendaten-Tool

## 🎯 Active Tasks

### T001: Import Pipeline Robustness
**Priority**: High  
**Status**: In Progress  
**Scope**: `src/features/import-excel/`, `src/features/import-pdf/`  
**Description**: Strengthen import validation and error handling
**Tasks**:
- [x] Magic-bytes file type detection
- [x] HTML table fallback for web portal downloads
- [x] Mapping presets per source ID
- [ ] Import error CSV export
- [ ] Batch validation with progress indicators
- [ ] Import session recovery on failure

**Target**: Phase 7 (Q1 2025)

### T002: Board Export/Import Alignment
**Status**: COMPLETED ✅  
**Scope**: `src/features/board/utils/csv.ts`, `src/features/board/utils/zip.ts`  
**Description**: Align Board CSV/ZIP export with import pipeline standards
**Completed Tasks**:
- [x] CSV injection guards implemented
- [x] Deterministic ZIP bundling
- [x] BOM and separator handling
- [x] Unicode preservation
- [x] Comprehensive test coverage
- [x] Export policy compliance

**Completed**: 2025-01-27

### T003: Type Coverage Improvement
**Priority**: Medium  
**Status**: In Progress  
**Scope**: `src/features/import-excel/types.ts`, various `any` usages  
**Description**: Eliminate remaining `any` types for better type safety
**Tasks**:
- [x] Import feature types centralized
- [x] Validation result interfaces
- [ ] Board action types strengthened
- [ ] Service layer type improvements
- [ ] Utility function signatures

**Target**: Phase 8 (Q2 2025)

## 🔄 Planned Tasks

### T004: Component API Standardization
**Priority**: Medium  
**Status**: Planned  
**Scope**: `src/features/board/components/cells/`  
**Description**: Standardize cell component props and behavior
**Tasks**:
- [ ] Consistent prop interfaces across cells
- [ ] Standardized onChange patterns
- [ ] Common accessibility attributes
- [ ] Unified error handling

**Target**: Phase 8 (Q2 2025)

### T005: Service Layer Consolidation
**Priority**: Medium  
**Status**: Planned  
**Scope**: `src/services/`, `src/features/*/services/`  
**Description**: Consolidate service patterns and error handling
**Tasks**:
- [ ] Unified error types across services
- [ ] Consistent async patterns
- [ ] Service composition patterns
- [ ] Dependency injection for testing

**Target**: Phase 9 (Q3 2025)

### T006: Performance Optimization
**Priority**: Low  
**Status**: Planned  
**Scope**: `src/features/board/`, virtualization  
**Description**: Further performance improvements for large datasets
**Tasks**:
- [ ] Column virtualization for wide tables
- [ ] Dynamic row height measurement
- [ ] Infinite scrolling for very large datasets
- [ ] Memory usage optimization

**Target**: Phase 10 (Q4 2025)

## ✅ Completed Tasks

### T007: Mutation System Unification
**Status**: COMPLETED ✅  
**Scope**: `src/services/MutationService.ts`, `src/types/patch.ts`  
**Description**: Unified patch-based mutation system with undo/redo
**Completed**: Phase 1 (2025-01-27)

### T008: Crypto Envelope Standardization
**Status**: COMPLETED ✅  
**Scope**: `src/data/envelope.ts`, `src/data/crypto.ts`  
**Description**: Unified Envelope v1 format for all encryption modes
**Completed**: Phase 3 (2025-01-27)

### T009: PWA Offline Implementation
**Status**: COMPLETED ✅  
**Scope**: `public/sw.js`, `src/sw/logic.ts`  
**Description**: Complete offline functionality with cache strategies
**Completed**: Phase 4 (2025-01-27)

### T010: Quality Gate Implementation
**Status**: COMPLETED ✅  
**Scope**: `.github/workflows/`, `scripts/status-gate.mjs`  
**Description**: Automated quality enforcement with red flag detection
**Completed**: Phase 5 (2025-01-27)

## 🚫 Cancelled Tasks

### T011: Real-time Synchronization
**Status**: CANCELLED  
**Reason**: Conflicts with local-only architecture principle  
**Alternative**: OneDrive/SharePoint sync-folder approach (planned Phase 10)

### T012: Cloud Database Integration
**Status**: CANCELLED  
**Reason**: Violates DSGVO compliance and local-only requirement  
**Alternative**: Encrypted sync files via existing cloud storage

## Refactoring Principles

### Code Quality
- **Single Responsibility**: Each module has one clear purpose
- **Dependency Inversion**: Services depend on abstractions, not concretions
- **Open/Closed**: Open for extension, closed for modification
- **Interface Segregation**: Small, focused interfaces

### Testing Strategy
- **Test-Driven**: Write tests before or alongside implementation
- **Contract Testing**: Validate module boundaries and export policies
- **Integration Testing**: Test real user workflows end-to-end
- **Performance Testing**: Validate scalability assumptions

### Migration Approach
- **Incremental**: Small, safe changes with immediate validation
- **Feature Flags**: New functionality behind toggles for safe rollout
- **Backward Compatibility**: No breaking changes to existing APIs
- **Documentation**: Update docs alongside code changes

## Technical Debt Tracking

### High Priority Debt
- **Import error handling**: Need better user feedback for validation failures
- **Memory management**: Large dataset handling could be more efficient
- **Error boundaries**: Need React error boundaries for graceful failure

### Medium Priority Debt
- **Bundle size**: Could optimize with better tree-shaking
- **Accessibility**: Some components need ARIA improvements
- **Performance**: Column virtualization for very wide tables

### Low Priority Debt
- **Code duplication**: Some utility functions could be consolidated
- **Naming consistency**: Some variables could have clearer names
- **Documentation**: Some complex functions need better JSDoc

## Success Metrics

### Code Quality
- **ESLint**: 0 errors, 0 warnings maintained
- **TypeScript**: Strict mode with 0 errors
- **Test Coverage**: 85%+ lines, 85%+ functions, 80%+ branches
- **Build Time**: <30 seconds for full build

### Maintainability
- **Cyclomatic Complexity**: <10 for all functions
- **File Size**: <300 lines per file (enforced)
- **Import Depth**: <5 levels deep
- **Export Policy**: 100% compliance

### Performance
- **Virtual Rows**: >90% DOM node reduction for large datasets
- **Bundle Size**: <2MB gzipped
- **Load Time**: <3 seconds on 3G
- **Memory Usage**: <100MB for 1000+ records

## Review Schedule

### Weekly
- Review active task progress
- Update task status and blockers
- Identify new technical debt

### Monthly
- Assess task priorities
- Review completed tasks for lessons learned
- Plan next month's refactoring focus

### Quarterly
- Major refactoring planning
- Architecture review and improvements
- Technical debt reduction goals