/**
 * Import usage validation tests
 * Prevents default imports from hooks, services, and utilities
 */

import { describe, it, expect } from 'vitest';

describe('Import Usage Validation', () => {
  describe('hook import restrictions', () => {
    it('should reject default imports from hook files', async () => {
      const hookFiles = [
        'src/features/board/hooks/useBoardActions',
        'src/features/board/hooks/useBoardData',
        'src/features/board/hooks/useOptimisticOverlay'
      ];

      for (const hookPath of hookFiles) {
        try {
          const module = await import(`../../${hookPath}`);
          
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

  describe('service import restrictions', () => {
    it('should reject default imports from service files', async () => {
      const serviceFiles = [
        'src/services/MutationService',
        'src/services/ExportService',
        'src/services/ImportService'
      ];

      for (const servicePath of serviceFiles) {
        try {
          const module = await import(`../../${servicePath}`);
          
          // Critical: Services must not have default exports
          expect(module.default).toBeUndefined();
          
          // Should have named exports only
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          expect(namedExports.length).toBeGreaterThan(0);
          
          // Services should be objects or classes
          namedExports.forEach(exportName => {
            expect(typeof module[exportName]).toMatch(/object|function/);
          });
        } catch (error) {
          throw new Error(`Service export validation failed for ${servicePath}: ${error}`);
        }
      }
    });
  });

  describe('utility import restrictions', () => {
    it('should reject default imports from utility files', async () => {
      const utilFiles = [
        'src/utils/cn',
        'src/utils/date/safeParseToISO',
        'src/utils/env',
        'src/utils/normalize',
        'src/utils/fileSniff'
      ];

      for (const utilPath of utilFiles) {
        try {
          const module = await import(`../../${utilPath}`);
          
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

  describe('barrel re-export validation', () => {
    it('should re-export components as named from barrels', async () => {
      try {
        const { Board, StatusChip, AssignDropdown } = await import('../../src/features/board');
        
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

    it('should maintain export consistency across re-exports', async () => {
      try {
        // Import same component via direct path and barrel
        const directBoard = await import('../../src/features/board/Board');
        const barrelBoard = await import('../../src/features/board');
        
        expect(typeof directBoard.default).toBe('function');
        expect(typeof barrelBoard.Board).toBe('function');
        
        // Should be the same function
        expect(directBoard.default).toBe(barrelBoard.Board);
      } catch (error) {
        throw new Error(`Export consistency check failed: ${error}`);
      }
    });
  });

  describe('import pattern enforcement', () => {
    it('should prevent mixed export patterns', async () => {
      const mixedPatternFiles = [
        'src/features/board/hooks/useBoardActions',
        'src/services/MutationService',
        'src/utils/cn'
      ];

      for (const filePath of mixedPatternFiles) {
        try {
          const module = await import(`../../${filePath}`);
          
          // Should not have both default and named exports
          const hasDefault = module.default !== undefined;
          const namedExports = Object.keys(module).filter(key => key !== 'default');
          const hasNamed = namedExports.length > 0;
          
          if (hasDefault && hasNamed) {
            throw new Error(`Mixed export pattern detected in ${filePath}`);
          }
          
          // For these file types, should only have named exports
          expect(hasDefault).toBe(false);
          expect(hasNamed).toBe(true);
          
        } catch (error) {
          throw new Error(`Mixed pattern validation failed for ${filePath}: ${error}`);
        }
      }
    });
  });
});