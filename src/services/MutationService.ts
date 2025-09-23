/**
 * Zentraler Mutations-Service für einheitlichen Patch-Flow
 * Phase 1: Alle Datenmutationen laufen über diesen Service
 */

import { db } from '../data/db';
import type { Patch, UndoRedoEntry, UndoRedoStack, MutationResult } from '../types/patch';

class MutationService {
  private undoStack: UndoRedoEntry<any>[] = [];
  private redoStack: UndoRedoEntry<any>[] = [];
  private maxStackSize = 50;

  /**
   * Einziger Mutationspfad: Patch anwenden mit automatischem Undo-Tracking
   */
  async applyPatch<T>(patch: Patch<T>): Promise<MutationResult> {
    // Guard: leere changes
    if (!patch.changes || Object.keys(patch.changes).length === 0) {
      console.warn('MutationService: Empty changes in patch, skipping');
      return { success: true };
    }

    try {
      // 1. Aktuellen Datensatz lesen für inverse Patch
      const current = await db.clients.get(patch.id);
      if (!current) {
        console.warn(`MutationService: Object with id ${patch.id} not found`);
        return { success: false, error: `Object with id ${patch.id} not found` };
      }

      // 2. Inverse Patch für Undo erzeugen (nur betroffene Felder)
      const inverseChanges: Partial<T> = {};
      Object.keys(patch.changes).forEach(key => {
        (inverseChanges as any)[key] = (current as any)[key];
      });

      const undoEntry: UndoRedoEntry<T> = {
        id: patch.id,
        changes: inverseChanges
      };

      // 3. Vollständiges Objekt mit Änderungen erstellen und persistieren
      const nextPlain = { ...current, ...patch.changes };
      await db.clients.put(nextPlain);

      // 4. Undo-Stack befüllen (nach erfolgreichem Persist)
      this.pushUndo(undoEntry);

      return { success: true };

    } catch (error) {
      console.error('❌ MutationService: Patch failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Bulk-Patches anwenden (sequentiell für Konsistenz)
   */
  async applyPatches<T>(patches: Patch<T>[]): Promise<MutationResult> {
    let failed = 0;

    for (const patch of patches) {
      const result = await this.applyPatch(patch);
      if (!result.success) {
        failed++;
        console.warn(`MutationService: Patch failed for ${patch.id}:`, result.error);
      }
    }

    return {
      success: failed === 0,
      error: failed > 0 ? `${failed} of ${patches.length} patches failed` : undefined
    };
  }

  /**
   * Letzten Patch rückgängig machen
   */
  async performUndo(): Promise<MutationResult> {
    const undoEntry = this.undoStack.pop();
    if (!undoEntry) {
      return { success: false, error: 'Nothing to undo' };
    }

    try {
      // Aktuellen Zustand für Redo sichern
      const current = await db.clients.get(undoEntry.id);
      if (!current) {
        console.warn(`MutationService: Undo target ${undoEntry.id} not found`);
        return { success: false, error: `Undo target ${undoEntry.id} not found` };
      }

      const redoChanges: Partial<any> = {};
      Object.keys(undoEntry.changes).forEach(key => {
        redoChanges[key] = (current as any)[key];
      });

      // Vollständiges Objekt mit Undo-Änderungen erstellen und persistieren
      const nextPlain = { ...current, ...undoEntry.changes };
      await db.clients.put(nextPlain);

      // Redo-Stack befüllen
      this.redoStack.push({
        id: undoEntry.id,
        changes: redoChanges
      });

      // Redo-Stack begrenzen
      if (this.redoStack.length > this.maxStackSize) {
        this.redoStack.shift();
      }

      return { success: true };

    } catch (error) {
      console.error('❌ MutationService: Undo failed:', error);
      // Undo-Entry wieder zurück auf Stack
      this.undoStack.push(undoEntry);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Undo failed' 
      };
    }
  }

  /**
   * Letzten Undo wiederholen
   */
  async performRedo(): Promise<MutationResult> {
    const redoEntry = this.redoStack.pop();
    if (!redoEntry) {
      return { success: false, error: 'Nothing to redo' };
    }

    try {
      // Aktuellen Zustand für Undo sichern
      const current = await db.clients.get(redoEntry.id);
      if (!current) {
        console.warn(`MutationService: Redo target ${redoEntry.id} not found`);
        return { success: false, error: `Redo target ${redoEntry.id} not found` };
      }

      const undoChanges: Partial<any> = {};
      Object.keys(redoEntry.changes).forEach(key => {
        undoChanges[key] = (current as any)[key];
      });

      // Vollständiges Objekt mit Redo-Änderungen erstellen und persistieren
      const nextPlain = { ...current, ...redoEntry.changes };
      await db.clients.put(nextPlain);

      // Undo-Stack befüllen
      this.pushUndo({
        id: redoEntry.id,
        changes: undoChanges
      });

      return { success: true };

    } catch (error) {
      console.error('❌ MutationService: Redo failed:', error);
      // Redo-Entry wieder zurück auf Stack
      this.redoStack.push(redoEntry);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Redo failed' 
      };
    }
  }

  /**
   * Undo-Stack-Management
   */
  private pushUndo<T>(entry: UndoRedoEntry<T>): void {
    this.undoStack.push(entry);
    
    // Stack-Größe begrenzen
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // Redo-Stack leeren bei neuer Mutation
    this.redoStack.length = 0;
  }

  /**
   * Stack-Status für UI
   */
  getStackStatus(): { canUndo: boolean; canRedo: boolean; undoCount: number; redoCount: number } {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };
  }

  /**
   * Stacks leeren (z.B. bei Daten-Reload)
   */
  clearStacks(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}

// Singleton-Instanz
export const mutationService = new MutationService();