/**
 * Zentraler Mutations-Service für einheitlichen Patch-Flow
 * Phase 1: Alle Datenmutationen laufen über diesen Service
 */

import { db } from '../data/db';
import type { Patch, UndoRedoEntry, MutationResult } from '../types/patch';

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

      // 3. Partial Update durchführen (triggert korrekten Dexie Hook)
      const updateCount = await db.clients.update(patch.id, patch.changes);

      if (updateCount === 0) {
        console.warn(`MutationService: Update failed for ${patch.id}`);
        return { success: false, error: 'Update failed - record not found or unchanged' };
      }

      // 4. Undo-Stack befüllen (nach erfolgreichem Persist)
      this.pushUndo(undoEntry);

      // 5. Trigger Event für Optimistic Overlay Reconciliation
      window.dispatchEvent(new CustomEvent('mutation:committed', {
        detail: { patches: [patch] }
      }));

      return { success: true };

    } catch (error) {
      console.warn('❌ MutationService: Patch failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Bulk-Patches anwenden (transaktional für Atomicity)
   */
  async applyPatches<T>(patches: Patch<T>[]): Promise<MutationResult> {
    if (patches.length === 0) {
      return { success: true };
    }

    // Collect all undo entries before transaction
    const undoEntries: Array<{ id: any; changes: Partial<T> }> = [];

    try {
      // Wrap in Dexie transaction for atomicity
      await db.transaction('rw', [db.clients], async () => {
        for (const patch of patches) {
          // Guard: leere changes
          if (!patch.changes || Object.keys(patch.changes).length === 0) {
            continue;
          }

          // 1. Aktuellen Datensatz lesen für inverse Patch
          const current = await db.clients.get(patch.id);
          if (!current) {
            throw new Error(`Object with id ${patch.id} not found`);
          }

          // 2. Inverse Patch für Undo erzeugen
          const inverseChanges: Partial<T> = {};
          Object.keys(patch.changes).forEach(key => {
            (inverseChanges as any)[key] = (current as any)[key];
          });

          undoEntries.push({
            id: patch.id,
            changes: inverseChanges
          });

          // 3. Partial Update durchführen
          const updateCount = await db.clients.update(patch.id, patch.changes);

          if (updateCount === 0) {
            throw new Error(`Update failed for ${patch.id}`);
          }
        }
      });

      // 4. Nach erfolgreicher Transaktion: Undo-Stack befüllen
      undoEntries.forEach(entry => {
        this.pushUndo(entry);
      });

      // 5. Trigger Event für Optimistic Overlay Reconciliation
      window.dispatchEvent(new CustomEvent('mutation:committed', {
        detail: { patches }
      }));

      return { success: true };

    } catch (error) {
      console.error('❌ MutationService: Bulk patches failed (rolled back):', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk patches failed'
      };
    }
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

      // Partial Update für Undo
      await db.clients.update(undoEntry.id, undoEntry.changes);

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

      // Partial Update für Redo
      await db.clients.update(redoEntry.id, redoEntry.changes);

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

  /**
   * Bulk-Create für neue Clients (z.B. bei Import)
   * Kein Undo-Tracking, da Import typischerweise als atomare Operation behandelt wird
   */
  async createClients(clients: Partial<any>[]): Promise<MutationResult> {
    if (clients.length === 0) {
      return { success: true };
    }

    try {
      const now = new Date().toISOString();

      const normalizedClients = clients.map(client => {
        const id = client.id || crypto.randomUUID();

        return {
          id,
          firstName: client.firstName || '',
          lastName: client.lastName || '',
          priority: client.priority || 'normal',
          status: client.status || 'offen',
          contactCount: client.contactCount ?? 0,
          contactLog: client.contactLog || [],
          isArchived: client.isArchived ?? false,
          lastActivity: client.lastActivity || now,
          ...client
        };
      });

      await db.clients.bulkAdd(normalizedClients);

      return { success: true };

    } catch (error) {
      console.error('❌ MutationService: Bulk create failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk create failed'
      };
    }
  }
}

// Singleton-Instanz
export const mutationService = new MutationService();