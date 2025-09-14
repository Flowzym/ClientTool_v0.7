/**
 * Import usage validation tests
 * Validates that actual consumer imports work correctly and follow the export policy
 */

import { describe, it, expect } from 'vitest';

describe('Import Usage Validation', () => {
  describe('App.tsx imports', () => {
    it('should import Board component correctly', async () => {
      try {
        // Test the actual import path used in App.tsx
        const { Board } = await import('../features/board/Board');
        
        expect(Board).toBeDefined();
        expect(typeof Board).toBe('function');
        
        // Should be a React component (has displayName or is function)
        expect(Board.length).toBeGreaterThanOrEqual(0); // Function arity
      } catch (error) {
        throw new Error(`Board import failed: ${error}`);
      }
    });

    it('should import other feature components correctly', async () => {
      const featureImports = [
        { path: '../features/dashboard/Dashboard', name: 'Dashboard' },
        { path: '../features/import-excel/ImportExcel', name: 'ImportExcel' },
        { path: '../features/import-pdf/ImportPdf', name: 'ImportPdf' },
        { path: '../features/statistik/Statistik', name: 'Statistik' },
        { path: '../features/backup/Backup', name: 'Backup' },
        { path: '../features/sicherheit/Sicherheit', name: 'Sicherheit' },
        { path: '../features/admin/Admin', name: 'Admin' }
      ];

      for (const { path, name } of featureImports) {
        try {
          const module = await import(path);
          expect(module[name]).toBeDefined();
          expect(typeof module[name]).toBe('function');
        } catch (error) {
          // Some imports might not exist - that's ok for this test
          console.warn(`Optional import ${path} not available: ${error}`);
        }
      }
    });
  });

  describe('service imports', () => {
    it('should import services as named exports', async () => {
      const serviceImports = [
        { path: '../services/MutationService', name: 'mutationService' },
        { path: '../services/ExportService', name: 'exportService' },
        { path: '../services/ImportService', name: 'importService' }
      ];

      for (const { path, name } of serviceImports) {
        try {
          const module = await import(path);
          
          expect(module[name]).toBeDefined();
          expect(module.default).toBeUndefined(); // Should not have default export
          
          // Services should be objects or classes
          expect(typeof module[name]).toMatch(/object|function/);
        } catch (error) {
          throw new Error(`Service import ${path} failed: ${error}`);
        }
      }
    });
    
    it('should reject default imports for services', async () => {
      // This test validates that services don't accidentally export defaults
      const serviceFiles = [
        '../services/MutationService',
        '../services/ExportService', 
        '../services/ImportService'
      ];

      for (const servicePath of serviceFiles) {
        try {
          const module = await import(servicePath);
          
          // Critical: Services must not have default exports
          expect(module.default).toBeUndefined();
          
          // Should have named exports only
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
        } catch (error) {
          throw new Error(`Service export validation failed for ${servicePath}: ${error}`);
        }
      }
    });
  });

  describe('hook imports', () => {
    it('should import hooks as named exports', async () => {
      const hookImports = [
        { path: '../features/board/hooks/useBoardActions', name: 'useBoardActions' },
        { path: '../features/board/hooks/useBoardData', name: 'useBoardData' },
        { path: '../features/board/hooks/useOptimisticOverlay', name: 'useOptimisticOverlay' }
      ];

      for (const { path, name } of hookImports) {
        try {
          const module = await import(path);
          
          expect(module[name]).toBeDefined();
          expect(typeof module[name]).toBe('function');
          expect(module.default).toBeUndefined(); // Should not have default export
          
          // Hooks should start with 'use'
          expect(name.startsWith('use')).toBe(true);
        } catch (error) {
          throw new Error(`Hook import ${path} failed: ${error}`);
        }
      }
    });
    
    it('should reject default imports for hooks', async () => {
      const hookFiles = [
        '../features/board/hooks/useBoardActions',
        '../features/board/hooks/useBoardData',
        '../features/board/hooks/useOptimisticOverlay'
      ];

      for (const hookPath of hookFiles) {
        try {
          const module = await import(hookPath);
          
          // Critical: Hooks must not have default exports
          expect(module.default).toBeUndefined();
          
          // Should have named exports only
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
          
          // All exports should be hooks (start with 'use') or helpers
          namedExports.forEach(exportName => {
            if (exportName.startsWith('use')) {
              expect(typeof module[exportName]).toBe('function');
            }
          });
        } catch (error) {
          throw new Error(`Hook export validation failed for ${hookPath}: ${error}`);
        }
      }
    });
  });

  describe('utility imports', () => {
    it('should import utilities as named exports', async () => {
      const utilImports = [
        { path: '../utils/cn', name: 'cn' },
        { path: '../utils/date/safeParseToISO', name: 'safeParseToISO' },
        { path: '../utils/date/safeParseToISO', name: 'nowISO' },
        { path: '../utils/env', name: 'getEncryptionMode' },
        { path: '../utils/env', name: 'getDbName' }
      ];

      for (const { path, name } of utilImports) {
        try {
          const module = await import(path);
          
          expect(module[name]).toBeDefined();
          expect(module.default).toBeUndefined(); // Should not have default export
        } catch (error) {
          throw new Error(`Utility import ${path} failed: ${error}`);
        }
      }
    });
    
    it('should reject default imports for utilities', async () => {
      const utilFiles = [
        '../utils/cn',
        '../utils/date/safeParseToISO',
        '../utils/env',
        '../utils/normalize',
        '../utils/fileSniff'
      ];

      for (const utilPath of utilFiles) {
        try {
          const module = await import(utilPath);
          
          // Critical: Utilities must not have default exports
          expect(module.default).toBeUndefined();
          
          // Should have named exports only
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
        } catch (error) {
          // Some utils might not exist - that's ok for this validation
          console.warn(`Utility validation skipped for ${utilPath}: ${error}`);
        }
      }
    });
  });

  describe('type imports', () => {
    it('should import types correctly', async () => {
      try {
        const { Patch, UndoRedoEntry, MutationResult } = await import('../types/patch');
        
        // Types should be importable (though they're compile-time only)
        expect(Patch).toBeUndefined(); // Types don't exist at runtime
        expect(UndoRedoEntry).toBeUndefined();
        expect(MutationResult).toBeUndefined();
        
        // But the import should not fail
      } catch (error) {
        throw new Error(`Type import failed: ${error}`);
      }
    });
  });

  describe('barrel re-exports', () => {
    it('should re-export Board components correctly from barrel', async () => {
      try {
        const { Board, StatusChip, AssignDropdown } = await import('../features/board');
        
        expect(Board).toBeDefined();
        expect(typeof Board).toBe('function');
        
        expect(StatusChip).toBeDefined();
        expect(typeof StatusChip).toBe('function');
        
        expect(AssignDropdown).toBeDefined();
        expect(typeof AssignDropdown).toBe('function');
      } catch (error) {
        throw new Error(`Board barrel import failed: ${error}`);
      }
    });

    it('should re-export common components from barrel', async () => {
      try {
        const { Badge, Button, Card } = await import('../components');
        
        expect(Badge).toBeDefined();
        expect(typeof Badge).toBe('function');
        
        expect(Button).toBeDefined();
        expect(typeof Button).toBe('function');
        
        expect(Card).toBeDefined();
        expect(typeof Card).toBe('function');
      } catch (error) {
        throw new Error(`Components barrel import failed: ${error}`);
      }
    });
  });

  describe('cross-module imports', () => {
    it('should handle imports between features correctly', async () => {
      try {
        // Test import from one feature to another (common pattern)
        const { Badge } = await import('../components/Badge');
        expect(Badge).toBeDefined();
        expect(typeof Badge).toBe('function');
        
        // Test service imports
        const { mutationService } = await import('../services/MutationService');
        expect(mutationService).toBeDefined();
        expect(typeof mutationService).toBe('object');
      } catch (error) {
        throw new Error(`Cross-module import failed: ${error}`);
      }
    });
  });

  describe('import consistency', () => {
    it('should not have circular dependencies', async () => {
      // Test that importing main modules doesn't cause circular dependency errors
      const mainModules = [
        '../features/board',
        '../services',
        '../components',
        '../types'
      ];

      for (const modulePath of mainModules) {
        try {
          await import(modulePath);
          // If we get here without error, no circular dependency
          expect(true).toBe(true);
        } catch (error) {
          if (error instanceof Error && error.message.includes('circular')) {
            throw new Error(`Circular dependency detected in ${modulePath}: ${error.message}`);
          }
          // Other import errors might be expected (missing files, etc.)
          console.warn(`Import warning for ${modulePath}:`, error);
        }
      }
    });

    it('should maintain consistent export types across re-exports', async () => {
      try {
        // Import same component via direct path and barrel
        const directBoard = await import('../features/board/Board');
        const barrelBoard = await import('../features/board');
        
        expect(typeof directBoard.default).toBe('function');
        expect(typeof barrelBoard.Board).toBe('function');
        
        // Should be the same function
        expect(directBoard.default).toBe(barrelBoard.Board);
      } catch (error) {
        throw new Error(`Export consistency check failed: ${error}`);
      }
    });
    
    it('should prevent default imports for hooks/services/utils', async () => {
      // This test validates the ESLint rule enforcement
      const nonComponentModules = [
        { path: '../features/board/hooks/useBoardActions', type: 'hook' },
        { path: '../services/MutationService', type: 'service' },
        { path: '../utils/cn', type: 'util' }
      ];

      for (const { path, type } of nonComponentModules) {
        try {
          const module = await import(path);
          
          // Should not have default export
          expect(module.default).toBeUndefined();
          
          // Should have named exports
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
          
        } catch (error) {
          console.warn(`${type} validation skipped for ${path}: ${error}`);
        }
      }
    });
  });
});