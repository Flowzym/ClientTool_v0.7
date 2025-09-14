# Status Gate - Quality Assurance

## Overview

The Status Gate is an automated quality check system that validates build health, test coverage, and code quality before allowing releases or deployments.

## How to Run

### Local Development
```bash
npm run status
```

### CI/CD Pipeline
The status gate runs automatically in GitHub Actions:
```yaml
- name: Run Status Gate
  run: npm run status
```

## Quality Thresholds

### Build Requirements
- **TypeScript**: 0 errors in strict mode
- **Vite Build**: Successful production build
- **ESLint**: 0 errors, 0 warnings

### Test Coverage Thresholds
- **Lines**: 85% minimum coverage
- **Functions**: 85% minimum coverage  
- **Branches**: 80% minimum coverage
- **Statements**: 85% minimum coverage

### Red Flag Detection
The status gate automatically detects critical issues:
- React Hook order violations
- Import/export resolution failures
- Duplicate declarations
- Missing dependencies
- Build-breaking syntax errors

## Artifacts Generated

### Log Files
All command outputs are saved to `tmp/logs/`:
- `build.log` - Vite build output
- `test.log` - Vitest test results with coverage
- `lint.log` - ESLint analysis results

### Status Report
- `tmp/status-report.md` - Formatted status summary
- `tmp/status-report.txt` - Plain text version for CI

### Example Status Report
```markdown
# Status-Report

## Build ✅
Log: tmp/logs/build.log

## Tests ✅
Log: tmp/logs/test.log
- Summary: {"filesPassed": 15, "filesFailed": 0}

## Lint ✅
Log: tmp/logs/lint.log

---

## Quick-Checks
- Keine Hook-Order-Fehler: ✅
- Kein React.lazy/Primitive-Error: ✅
- Keine Export-/Import-Resolver-Fehler: ✅
- Keine doppelten Deklarationen: ✅
```

## Exit Codes

- **0**: All checks passed (green)
- **1**: One or more checks failed (red)

## Integration with CI

### GitHub Actions
```yaml
- name: Quality Gate
  run: npm run status
  
- name: Upload Status Artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: status-logs
    path: tmp/
```

### Pre-commit Hooks
```bash
#!/bin/sh
npm run status || {
  echo "❌ Status gate failed - check tmp/status-report.md"
  exit 1
}
```

## Troubleshooting

### Common Issues

**Build Failures**:
- Check `tmp/logs/build.log` for TypeScript errors
- Verify all imports are resolvable
- Ensure no syntax errors in source files

**Test Failures**:
- Check `tmp/logs/test.log` for specific test failures
- Verify test coverage meets thresholds
- Check for async/await issues in tests

**Lint Failures**:
- Check `tmp/logs/lint.log` for specific violations
- Run `npm run lint` for detailed error locations
- Use `npm run lint -- --fix` for auto-fixable issues

### Red Flag Patterns

The status gate scans for these critical patterns:
```javascript
const redFlagPatterns = [
  /React has detected a change in the order of Hooks/i,
  /Rendered more hooks than during the previous render/i,
  /Cannot convert object to primitive value/i,
  /No matching export/i,
  /already been declared/i,
  /Failed to resolve import/i,
  /✘ \[ERROR]/,
  /ERROR in /i
];
```

### Yellow Flag Patterns
Non-critical but noteworthy issues:
```javascript
const yellowFlagPatterns = [
  /Warning:/i,
  /deprecated/i
];
```

## Configuration

### Coverage Thresholds
Configured in `vitest.config.ts`:
```typescript
test: {
  coverage: {
    thresholds: {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85
    }
  }
}
```

### ESLint Rules
Critical rules enforced:
```javascript
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
  'no-duplicate-imports': 'error'
}
```

## Best Practices

### Before Committing
1. Run `npm run status` locally
2. Fix any red flags immediately
3. Address yellow flags if time permits
4. Ensure all tests pass

### During Development
1. Run tests frequently: `npm test`
2. Check lint issues: `npm run lint`
3. Monitor coverage: `npm test -- --coverage`
4. Build regularly: `npm run build`

### Before Releases
1. Full status gate must pass
2. Review all artifacts in `tmp/`
3. Verify no red flags in any logs
4. Confirm coverage thresholds met

## Monitoring

### Success Metrics
- **Green Rate**: Percentage of status gate passes
- **Coverage Trend**: Coverage percentage over time
- **Red Flag Frequency**: Critical issues per week
- **Build Time**: Time to complete full status check

### Quality Indicators
- **Zero Warnings**: ESLint clean runs
- **High Coverage**: Consistent 85%+ coverage
- **Fast Builds**: <30 seconds for full check
- **Stable Tests**: No flaky or timing-dependent failures

## Continuous Improvement

### Monthly Reviews
- Analyze failed status gates
- Identify recurring red flags
- Update detection patterns
- Improve threshold accuracy

### Quarterly Updates
- Review and adjust coverage thresholds
- Update red flag patterns based on new issues
- Enhance artifact generation
- Optimize status gate performance

The status gate serves as the final quality checkpoint, ensuring that only high-quality, well-tested code reaches production while providing detailed diagnostics for any issues found.