# Risk Log - Klient:innendaten-Tool

## 🔴 High Priority Risks

### R001: Encryption Key Loss (CRITICAL)
**Status**: Mitigated  
**Impact**: Complete data loss if passphrase forgotten  
**Probability**: Medium  
**Mitigation**: 
- Clear passphrase requirements documentation
- Backup/export functionality before key changes
- Dev-enc mode for development with recoverable keys
- Multiple encryption modes for different use cases

**Last Review**: 2025-01-27  
**Next Review**: 2025-02-15

### R002: Browser Storage Limits
**Status**: Monitored  
**Impact**: App failure with large datasets (>1GB IndexedDB)  
**Probability**: Low-Medium  
**Mitigation**:
- Virtual rows for DOM efficiency
- Compression in storage layer
- Archive/cleanup workflows
- Storage quota monitoring

**Last Review**: 2025-01-27  
**Next Review**: 2025-03-01

## 🟡 Medium Priority Risks

### R003: Import Data Quality
**Status**: Partially Mitigated  
**Impact**: Corrupted/inconsistent data from poor imports  
**Probability**: Medium  
**Mitigation**:
- Robust validation with Zod schemas
- Magic-bytes file type detection
- HTML table fallback for web portal downloads
- Mapping presets for consistent field mapping
- Delta-sync with conflict resolution

**Last Review**: 2025-01-27  
**Next Review**: 2025-02-01

### R004: Performance Degradation
**Status**: Mitigated  
**Impact**: UI becomes unusable with large datasets  
**Probability**: Low  
**Mitigation**:
- ✅ Virtual rows implementation (opt-in, default off)
- ✅ Performance testing playground (`/dev/perf`)
- ✅ Feature flags for gradual rollout
- DOM node reduction (>90% with virtualization)
- Lazy loading and pagination strategies

**Test Reference**: `src/features/board/__tests__/perf.flag.test.ts`  
**Last Review**: 2025-01-27  
**Next Review**: 2025-03-15

### R011: UI Component Regression
**Status**: Mitigated  
**Impact**: Board cell components break during refactoring or feature changes  
**Probability**: Low  
**Mitigation**:
- ✅ Comprehensive cell component test suite
- ✅ Contract tests for export policy compliance
- ✅ Integration tests for status/follow-up auto-rules
- ✅ Accessibility tests for header sorting and tri-state checkbox
- ✅ Pin shift-range operation tests with edge cases
- ✅ Visual regression prevention via rendering contract tests

**Test Reference**: `src/features/board/__tests__/followup.icononly.test.tsx`, `contact.badge-visibility.test.tsx`, `priority.single-dot.test.tsx`, `pin.shift-range.test.tsx`  
**Last Review**: 2025-01-27  
**Next Review**: 2025-02-15

### R005: Import Routing Confusion
**Status**: RESOLVED  
**Impact**: Excel files processed by PDF handler (or vice versa)  
**Probability**: Low  
**Mitigation**:
- ✅ Magic-bytes detection with MIME type fallback
- ✅ Comprehensive file type detection
- ✅ Routing tests prevent cross-contamination
- Clear error messages for unsupported formats

**Test Reference**: `src/features/import/__tests__/excelRouting.test.ts`  
**Last Review**: 2025-01-27  

## 🟢 Low Priority Risks

### R006: Network Guard Bypass
**Status**: Mitigated  
**Impact**: Accidental external data leakage  
**Probability**: Very Low  
**Mitigation**:
- Multiple security layers (CSP, Network Guard, Service Worker)
- Same-origin enforcement
- Blocked request logging and monitoring
- External service integration behind explicit feature flags

**Last Review**: 2025-01-27  
**Next Review**: 2025-04-01

### R007: PWA Installation Issues
**Status**: Monitored  
**Impact**: App not installable on some platforms  
**Probability**: Low  
**Mitigation**:
- Graceful fallback to web app mode
- Environment detection and appropriate messaging
- Service Worker registration with robust error handling
- Manual installation instructions

**Last Review**: 2025-01-27  
**Next Review**: 2025-03-01

### R008: CSV Export Injection
**Status**: Mitigated  
**Impact**: Spreadsheet formula injection via exported data  
**Probability**: Very Low  
**Mitigation**:
- ✅ Injection guards neutralize dangerous prefixes (`=`, `+`, `-`, `@`)
- ✅ Comprehensive escaping for separators and quotes
- ✅ BOM handling for Excel compatibility
- Input validation prevents malicious data entry

**Test Reference**: `src/features/export/csv/__tests__/csvUtils.test.ts`  
**Last Review**: 2025-01-27  
**Next Review**: 2025-04-01

## 🔵 Resolved Risks

### R009: React Hook Order Violations
**Status**: RESOLVED  
**Impact**: "Change in order of Hooks" errors during feature flag changes  
**Resolution**: 
- ✅ Extracted ClassicClientList and VirtualClientList components
- ✅ All hooks at top level of Board component
- ✅ Feature flag switching via component selection, not conditional hooks
- ✅ Comprehensive hook order guard tests

**Test Reference**: `src/features/board/__tests__/board.hookOrder.guard.test.tsx`  
**Resolved**: 2025-01-27

### R010: Export Policy Inconsistency
**Status**: RESOLVED  
**Impact**: Build failures due to mixed export patterns  
**Resolution**:
- ✅ Strict export policy defined and documented
- ✅ Contract tests validate export shapes
- ✅ ESLint rules enforce patterns at development time
- ✅ Usage tests ensure actual imports work correctly

**Test Reference**: `src/__tests__/exports.contract.test.ts`, `src/__tests__/imports.usage.test.ts`  
**Resolved**: 2025-01-27

## Risk Assessment Matrix

| Risk ID | Impact | Probability | Risk Level | Status |
|---------|--------|-------------|------------|---------|
| R001 | Critical | Medium | 🔴 High | Mitigated |
| R002 | High | Low-Medium | 🟡 Medium | Monitored |
| R003 | Medium | Medium | 🟡 Medium | Partially Mitigated |
| R004 | High | Low | 🟡 Medium | Mitigated |
| R011 | Medium | Low | 🟢 Low | Mitigated |
| R005 | Medium | Low | 🟢 Low | Fixed |
| R006 | Medium | Very Low | 🟢 Low | Mitigated |
| R007 | Low | Low | 🟢 Low | Monitored |
| R008 | Low | Very Low | 🟢 Low | Mitigated |
| R009 | Medium | - | 🔵 Resolved | - |
| R010 | High | - | 🔵 Resolved | - |

## Risk Monitoring

### Automated Monitoring
- **Status Gate**: `npm run status` checks for red flags
- **Coverage Gates**: Vitest enforces coverage thresholds
- **ESLint Gates**: Prevents policy violations
- **Build Gates**: TypeScript strict mode catches type issues

### Manual Reviews
- **Monthly**: Review high/medium priority risks
- **Quarterly**: Assess new risks from feature development
- **Release**: Complete risk assessment before version releases

### Escalation Criteria
- **Critical**: Any risk that could cause complete data loss
- **High**: Risks affecting core functionality or security
- **Medium**: Performance or usability degradation
- **Low**: Minor issues or edge cases

## Risk Response Strategies

### Accept
- Low probability, low impact risks
- Risks with adequate monitoring and quick recovery

### Mitigate
- Implement controls to reduce probability or impact
- Most common strategy for technical risks

### Transfer
- Not applicable for local-only application
- No external dependencies to transfer risk to

### Avoid
- Change design to eliminate risk entirely
- Used for security-critical decisions (e.g., local-only architecture)

## Lessons Learned

### Successful Mitigations
- **Feature flags**: Enable safe rollout of risky features
- **Comprehensive testing**: Catch issues before production
- **Multiple security layers**: Defense in depth approach
- **Graceful degradation**: Fallbacks for all critical features

### Areas for Improvement
- **User education**: Better documentation for encryption key management
- **Performance monitoring**: Real-world usage metrics needed
- **Error recovery**: More automated recovery from edge cases