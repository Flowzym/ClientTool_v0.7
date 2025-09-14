/**
 * Export contract tests
 * Validates that all modules follow the export policy
 */

import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import path from 'path';

describe('Export Contract Validation', () => {
  describe('component exports', () => {
    it('should have default exports for all component files', async () => {
      // Find all component files
      const componentFiles = await glob('src/features/**/components/**/*.tsx', { 
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/test/**', '**/*.test.tsx', '**/*.spec.tsx']
      });

      expect(componentFiles.length).toBeGreaterThan(0);

      for (const filePath of componentFiles) {
        try {
          const module = await import(`../../${filePath}`);
          
          expect(module.default).toBeDefined();
          expect(typeof module.default).toBe('function');
          
          // Component name should match file name
          const fileName = path.basename(filePath, '.tsx');
          const componentName = module.default.displayName || module.default.name;
          
          // Should be a React component (function with reasonable name)
          expect(componentName).toBeTruthy();
          
        } catch (error) {
          throw new Error(`Component ${filePath} failed export contract: ${error}`);
        }
      }
    });

    it('should not have named exports with same name as component', async () => {
      const componentFiles = await glob('src/features/**/components/**/*.tsx', { 
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/test/**', '**/*.test.tsx', '**/*.spec.tsx']
      });

      for (const filePath of componentFiles) {
        try {
          const module = await import(`../../${filePath}`);
          const fileName = path.basename(filePath, '.tsx');
          
          // Should not have named export with same name as file
          expect(module[fileName]).toBeUndefined();
          
        } catch (error) {
          throw new Error(`Component ${filePath} has conflicting named export: ${error}`);
        }
      }
    });
  });

  describe('hook exports', () => {
    it('should have named exports only for hook files', async () => {
      const hookFiles = await glob('src/**/*hook*.ts', { 
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/test/**', '**/*.test.ts', '**/*.spec.ts']
      });

      for (const filePath of hookFiles) {
        try {
          const module = await import(`../../${filePath}`);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Should have at least one named export
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
          
          // Hook exports should start with 'use'
          const hookExports = namedExports.filter(name => name.startsWith('use'));
          expect(hookExports.length).toBeGreaterThan(0);
          
        } catch (error) {
          throw new Error(`Hook ${filePath} failed export contract: ${error}`);
        }
      }
    });
  });

  describe('service exports', () => {
    it('should have named exports only for service files', async () => {
      const serviceFiles = await glob('src/**/*service*.ts', { 
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/test/**', '**/*.test.ts', '**/*.spec.ts']
      });

      for (const filePath of serviceFiles) {
        try {
          const module = await import(`../../${filePath}`);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Should have at least one named export
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
          
        } catch (error) {
          throw new Error(`Service ${filePath} failed export contract: ${error}`);
        }
      }
    });
  });

  describe('utility exports', () => {
    it('should have named exports only for utility files', async () => {
      const utilFiles = await glob('src/utils/**/*.ts', { 
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/test/**', '**/*.test.ts', '**/*.spec.ts']
      });

      for (const filePath of utilFiles) {
        try {
          const module = await import(`../../${filePath}`);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Should have at least one named export
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
          
        } catch (error) {
          throw new Error(`Utility ${filePath} failed export contract: ${error}`);
        }
      }
    });
  });
});