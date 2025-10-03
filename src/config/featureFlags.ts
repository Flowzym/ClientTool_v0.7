/**
 * Feature flags for experimental and new functionality
 * Controls rollout of new features and A/B testing
 */

export const FEATURES = {
  IMPORTER_V2: true, // default OFF - new import pipeline with enhanced mapping
  VIRTUAL_ROWS: false, // existing virtual rows feature
  ADVANCED_FILTERS: true, // existing advanced filters
  BULK_OPERATIONS: true, // existing bulk operations
  EXPORT_FORMATS: true, // existing export formats
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}

/**
 * Runtime feature flag override (development only)
 */
export function setFeatureFlag(feature: FeatureKey, enabled: boolean): void {
  if (import.meta.env.DEV) {
    (FEATURES as any)[feature] = enabled;
    console.log(`🚩 Feature flag ${feature} set to ${enabled}`);
  } else {
    console.warn(`⚠️ Feature flags can only be changed in development mode`);
  }
}

/**
 * Get all feature flags for debugging
 */
export function getAllFeatureFlags(): Record<FeatureKey, boolean> {
  return { ...FEATURES };
}