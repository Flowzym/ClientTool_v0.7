/**
 * Export contract tests
 * Validates that all modules follow the export policy defined in docs/export-policy.json
 */

import { describe, it, expect } from 'vitest';
import exportPolicy from '../../docs/export-policy.json';

describe('Export Contract Validation', () => {
  describe('component exports', () => {
    const componentEntries = exportPolicy.entries.filter(entry => entry.kind === 'component');

    componentEntries.forEach(entry => {
      it(`should have default export in ${entry.path}`, async () => {
        try {
          const module = await import(entry.path);
          expect(module.default).toBeDefined();
          expect(typeof module.default).toBe('function');
        } catch (error) {
          throw new Error(`Failed to import ${entry.path}: ${error}`);
        }
      });

      if (entry.barrel) {
        it(`should have named export in barrel ${entry.barrel}`, async () => {
          try {
            const barrel = await import(entry.barrel);
            const componentName = entry.path.split('/').pop()?.replace('.tsx', '');
            
            if (componentName) {
              expect(barrel[componentName]).toBeDefined();
              expect(typeof barrel[componentName]).toBe('function');
            }
          } catch (error) {
            throw new Error(`Failed to import from barrel ${entry.barrel}: ${error}`);
          }
        });
      }
    });
  });

  describe('hook exports', () => {
    const hookEntries = exportPolicy.entries.filter(entry => entry.kind === 'hook');

    hookEntries.forEach(entry => {
      it(`should have named exports only in ${entry.path}`, async () => {
        try {
          const module = await import(entry.path);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Should have at least one named export
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
          
          // Hook exports should be functions
          namedExports.forEach(exportName => {
            if (exportName.startsWith('use')) {
              expect(typeof module[exportName]).toBe('function');
            }
          });
        } catch (error) {
          throw new Error(`Failed to import ${entry.path}: ${error}`);
        }
      });

      if (entry.barrel) {
        it(`should re-export hooks in barrel ${entry.barrel}`, async () => {
          try {
            const barrel = await import(entry.barrel);
            const module = await import(entry.path);
            
            // All named exports from module should be available in barrel
            const moduleExports = Object.keys(module).filter(key => key !== 'default');
            moduleExports.forEach(exportName => {
              expect(barrel[exportName]).toBeDefined();
              expect(typeof barrel[exportName]).toBe(typeof module[exportName]);
            });
          } catch (error) {
            throw new Error(`Failed to validate barrel ${entry.barrel}: ${error}`);
          }
        });
      }
    });
  });

  describe('service exports', () => {
    const serviceEntries = exportPolicy.entries.filter(entry => entry.kind === 'service');

    serviceEntries.forEach(entry => {
      it(`should have named exports only in ${entry.path}`, async () => {
        try {
          const module = await import(entry.path);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Should have at least one named export
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
        } catch (error) {
          throw new Error(`Failed to import ${entry.path}: ${error}`);
        }
      });
    });
  });

  describe('utility exports', () => {
    const utilEntries = exportPolicy.entries.filter(entry => entry.kind === 'util');

    utilEntries.forEach(entry => {
      it(`should have named exports only in ${entry.path}`, async () => {
        try {
          const module = await import(entry.path);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Should have at least one named export
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
        } catch (error) {
          throw new Error(`Failed to import ${entry.path}: ${error}`);
        }
      });
    });
  });

  describe('type exports', () => {
    const typeEntries = exportPolicy.entries.filter(entry => entry.kind === 'type');

    typeEntries.forEach(entry => {
      it(`should have named type exports only in ${entry.path}`, async () => {
        try {
          const module = await import(entry.path);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Type files should have exports (though they may be type-only)
          const hasExports = Object.keys(module).length > 0;
          expect(hasExports).toBe(true);
        } catch (error) {
          throw new Error(`Failed to import ${entry.path}: ${error}`);
        }
      });
    });
  });

  describe('barrel consistency', () => {
    it('should have all barrels defined in manifest', async () => {
      const barrelPaths = [...new Set(
        exportPolicy.entries
          .filter(entry => entry.barrel)
          .map(entry => entry.barrel)
      )];

      for (const barrelPath of barrelPaths) {
        try {
          const barrel = await import(barrelPath!);
          expect(barrel).toBeDefined();
          
          // Barrel should have at least one export
          const exports = Object.keys(barrel).filter(key => key !== 'default');
          expect(exports.length).toBeGreaterThan(0);
        } catch (error) {
          throw new Error(`Barrel ${barrelPath} is not accessible: ${error}`);
        }
      }
    });

    it('should not have mixed export patterns in component files', async () => {
      const componentEntries = exportPolicy.entries.filter(entry => entry.kind === 'component');

      for (const entry of componentEntries) {
        try {
          const module = await import(entry.path);
          
          // Should have default export
          expect(module.default).toBeDefined();
          
          // Should not have named export with same name as component
          const componentName = entry.path.split('/').pop()?.replace('.tsx', '');
          if (componentName) {
            expect(module[componentName]).toBeUndefined();
          }
        } catch (error) {
          throw new Error(`Mixed export pattern in ${entry.path}: ${error}`);
        }
      }
    });
  });
});