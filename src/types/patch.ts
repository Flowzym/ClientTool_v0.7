/**
 * Zentrale Patch-Typen für einheitlichen Mutationsflow
 * Phase 1: Core-Stabilisierung
 */

export interface Patch<T> {
  id: string;
  changes: Partial<T>;
}

export interface UndoRedoEntry<T> {
  id: string;
  changes: Partial<T>;
}

export interface UndoRedoStack<T> {
  undoStack: UndoRedoEntry<T>[];
  redoStack: UndoRedoEntry<T>[];
}

// Utility-Typen für Service-Layer
export interface MutationResult {
  success: boolean;
  error?: string;
}

export interface BulkMutationResult extends MutationResult {
  applied: number;
  failed: number;
}