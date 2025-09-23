/**
 * Pure functions for Optimistic Overlay Reconciliation
 * Extracted from useOptimisticOverlay for testability
 */

/**
 * Determines if an overlay entry should be dropped because the base data
 * now reflects the same changes that were optimistically applied.
 * 
 * @param base - The current persisted/server state
 * @param overlay - The optimistic changes that were applied
 * @returns true if overlay should be dropped (base matches overlay), false otherwise
 */
export function shouldDropOverlay<T extends Record<string, any>>(
  base: T, 
  overlay: Partial<T>
): boolean {
  if (!base || !overlay) return false;
  
  // Check if all overlay fields match the base values
  return Object.keys(overlay).every(field => {
    const baseValue = base[field];
    const overlayValue = overlay[field];
    
    return deepEqual(baseValue, overlayValue);
  });
}

/**
 * Reconciles an overlay with base data and determines if overlay should be kept
 * 
 * @param base - The current persisted/server state  
 * @param overlay - The optimistic changes that were applied
 * @returns object with keepOverlay flag
 */
export function reconcileOverlay<T extends Record<string, any>>(
  base: T,
  overlay: Partial<T>
): { keepOverlay: boolean } {
  const shouldDrop = shouldDropOverlay(base, overlay);
  return { keepOverlay: !shouldDrop };
}

/**
 * Deep equality check for overlay reconciliation
 * Treats null and undefined as different values (preserves current semantics)
 * Array order is semantically relevant
 */
function deepEqual(a: any, b: any): boolean {
  // Strict equality for primitives and same reference
  if (a === b) return true;
  
  // null vs undefined are different (preserve current semantics)
  if (a == null || b == null) return false;
  
  // Different types
  if (typeof a !== typeof b) return false;
  
  // Arrays - order matters semantically
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && deepEqual(a[key], b[key])
    );
  }
  
  return false;
}

/**
 * Normalizes ID for comparison (handles string/number type mixing)
 */
export function normalizeId(id: any): string {
  return String(id);
}