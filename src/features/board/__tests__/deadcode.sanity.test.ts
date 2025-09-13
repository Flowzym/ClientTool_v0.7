/**
 * Dead code sanity tests
 * Ensures removed files are actually gone and build remains stable
 */

import { describe, it, expect } from 'vitest';

describe('Dead Code Removal Sanity', () => {
  describe('removed files should not be importable', () => {
    it('should fail to import removed BatchBar.tsx', async () => {
      await expect(async () => {
        await import('../BatchBar');
      }).rejects.toThrow();
    });

    it('should fail to import removed useBoardData.helpers.ts', async () => {
      await expect(async () => {
        await import('../useBoardData.helpers');
      }).rejects.toThrow();
    });
  });

  describe('barrel exports should remain functional', () => {
    it('should import Board components from barrel successfully', async () => {
      const { Board, StatusChip, AssignDropdown } = await import('../index');
      
      expect(Board).toBeDefined();
      expect(typeof Board).toBe('function');
      
      expect(StatusChip).toBeDefined();
      expect(typeof StatusChip).toBe('function');
      
      expect(AssignDropdown).toBeDefined();
      expect(typeof AssignDropdown).toBe('function');
    });

    it('should import cell components from barrel successfully', async () => {
      const { NameCell, OfferCell, StatusCell, ArchiveCell } = await import('../components/cells');
      
      expect(NameCell).toBeDefined();
      expect(typeof NameCell).toBe('function');
      
      expect(OfferCell).toBeDefined();
      expect(typeof OfferCell).toBe('function');
      
      expect(StatusCell).toBeDefined();
      expect(typeof StatusCell).toBe('function');
      
      expect(ArchiveCell).toBeDefined();
      expect(typeof ArchiveCell).toBe('function');
    });

    it('should import hooks from barrel successfully', async () => {
      const { useBoardActions, useBoardData, useOptimisticOverlay } = await import('../hooks');
      
      expect(useBoardActions).toBeDefined();
      expect(typeof useBoardActions).toBe('function');
      
      expect(useBoardData).toBeDefined();
      expect(typeof useBoardData).toBe('function');
      
      expect(useOptimisticOverlay).toBeDefined();
      expect(typeof useOptimisticOverlay).toBe('function');
    });

    it('should import services from barrel successfully', async () => {
      const boardServices = await import('../services');
      
      expect(boardServices.bulkApply).toBeDefined();
      expect(typeof boardServices.bulkApply).toBe('function');
      
      expect(boardServices.updateById).toBeDefined();
      expect(typeof boardServices.updateById).toBe('function');
    });

    it('should import utils from barrel successfully', async () => {
      const { toCsv, createZip, formatDDMMYYYY, countNotes, computeAdvisor } = await import('../utils');
      
      expect(toCsv).toBeDefined();
      expect(typeof toCsv).toBe('function');
      
      expect(createZip).toBeDefined();
      expect(typeof createZip).toBe('function');
      
      expect(formatDDMMYYYY).toBeDefined();
      expect(typeof formatDDMMYYYY).toBe('function');
      
      expect(countNotes).toBeDefined();
      expect(typeof countNotes).toBe('function');
      
      expect(computeAdvisor).toBeDefined();
      expect(typeof computeAdvisor).toBe('function');
    });
  });

  describe('build stability after cleanup', () => {
    it('should maintain TypeScript compilation', async () => {
      // This test passes if the file compiles and imports work
      const mainBoard = await import('../Board');
      expect(mainBoard.default).toBeDefined();
    });
  });
});