# Knowledge Index - Klient:innendaten-Tool

## Architecture Decision Records (ADRs)

### ADR-0001: Export Policy for Consistent Module Structure
**Status**: Accepted and Enforced  
**File**: `docs/ADR-0001-export-policy.md`  
**Summary**: Establishes strict export patterns based on module type - components use default exports (re-exported as named in barrels), hooks/services/utilities use named exports only. Enforced via contract tests and ESLint rules.

### ADR-0002: Virtualized Board Rows for Performance
**Status**: Accepted and Implemented  
**File**: `docs/ADR-0002-virtual-rows.md`  
**Summary**: Optional virtualization behind feature flag (default: off) for large datasets. Fixed row height with overscan, maintains accessibility, complete fallback to classic rendering.

### ADR-0003: Export Policy Enforcement
**Status**: Accepted and Enforced  
**File**: `docs/ADR-0003-export-policy.md`  
**Summary**: Automated enforcement of export policy through contract tests, usage validation, and ESLint flat config rules. Prevents mixed export patterns and ensures consistent module structure.

### ADR-0004: Performance Flag Safeguards
**Status**: Accepted and Implemented  
**File**: `docs/ADR-0002-virtual-rows.md`  
**Summary**: Virtual rows implementation behind feature flag (default: off) with comprehensive fallback to classic rendering. Includes performance playground for validation and opt-in testing framework.

## Technical Documentation

### Security & Encryption
- **File**: `docs/SECURITY.md`
- **Coverage**: Encryption modes (plain/dev-enc/prod-enc), Envelope v1 format, RBAC system
- **Key Topics**: AES-256-GCM, Argon2id KDF, local-only operation, guardrails

### Offline Functionality
- **File**: `docs/OFFLINE.md`
- **Coverage**: PWA capabilities, cache strategies, offline testing
- **Key Topics**: Service Worker, cache invalidation, same-origin guard

### SharePoint Sync Planning
- **File**: `docs/SHAREPOINT_SYNC_PLAN.md`
- **Coverage**: OneDrive/SharePoint integration architecture
- **Key Topics**: End-to-end encryption, manifest-based sync, coordinator roles

### Deployment
- **File**: `docs/DEPLOYMENT.md`
- **Coverage**: GitHub Pages deployment, CI/CD pipeline
- **Key Topics**: Build artifacts, custom domains, automated deployment

## Quality Assurance

### Status Gate
- **File**: `docs/quality/status-gate.md`
- **Coverage**: Automated quality checks, red flag detection
- **Key Topics**: Build/test/lint gates, coverage thresholds, artifact generation

### Testing Strategy
- **Coverage**: Unit, integration, contract, and guard tests
- **Tools**: Vitest, React Testing Library, custom test harnesses
- **Metrics**: 85%+ line coverage, 85%+ function coverage, 80%+ branch coverage

## Development Guides

### Performance Testing
- **Route**: `/dev/perf` (development only)
- **Coverage**: Virtual rows A/B testing, dataset generation, metrics collection
- **Tools**: Performance API, FPS estimation, DOM node counting

### Feature Flags
- **File**: `src/config/features.ts`
- **Coverage**: Experimental feature management, gradual rollout
- **Key Features**: Virtual rows (opt-in), advanced filters, bulk operations

## Data Architecture

### Database Schema
- **Engine**: Dexie (IndexedDB wrapper)
- **Tables**: clients, users, importSessions, kv
- **Encryption**: Envelope v1 with meta-data outside, payload encrypted

### Import Pipeline
- **Excel/CSV**: XLSX.js with auto-mapping, delta-sync support
- **PDF**: pdf.js with regex extraction, structured data recognition
- **HTML**: Table extraction fallback for web portal downloads

## Operational Notes

### Encryption Modes
- **Development**: `dev-enc` with fixed key or auto-generated localStorage key
- **Production**: `prod-enc` with user passphrase and Argon2id KDF
- **Testing**: `plain` mode (localhost only, blocked in production builds)

### Feature Flag Management
- **Virtual Rows**: Default off, opt-in via development toggle
- **Advanced Filters**: Enabled by default
- **Export Formats**: Enabled by default
- **SharePoint Integration**: Disabled by default (breaks local-only mode)

### Quality Gates
- **Build**: TypeScript strict mode, Vite production build
- **Test**: Vitest with coverage thresholds (85%/85%/80%)
- **Lint**: ESLint flat config with React Hooks rules on error level
- **Status**: Automated red flag detection for critical issues

## Migration & Compatibility

### Version History
- **v0.7.0**: Crypto Envelope v1, PWA offline support
- **v0.7.1**: Board stabilization, virtual rows (opt-in), comprehensive testing
- **Planned**: Import pipeline robustness, team synchronization features

### Breaking Changes
- None in v0.7.1 - all changes are additive or behind feature flags
- Export policy enforcement may require import statement updates

### Upgrade Path
- Feature flags allow gradual adoption of new capabilities
- Encryption mode migration supported (plain → dev-enc → prod-enc)
- Database schema versioning handles data structure evolution