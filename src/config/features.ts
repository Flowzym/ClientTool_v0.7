/**
 * Feature flags for optional functionality
 * Controls experimental and performance features
 */

export interface FeatureFlags {
  virtualRows: boolean;
  advancedFilters: boolean;
  bulkOperations: boolean;
  exportFormats: boolean;
}

const DEFAULT_FEATURES: FeatureFlags = {
  virtualRows: false, // Default: off for stability
  advancedFilters: true,
  bulkOperations: true,
  exportFormats: true
};

class FeatureManager {
  private features: FeatureFlags = { ...DEFAULT_FEATURES };
  private listeners: Set<(features: FeatureFlags) => void> = new Set();

  getFeatures(): FeatureFlags {
    return { ...this.features };
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.features[feature];
  }

  setFeature(feature: keyof FeatureFlags, enabled: boolean): void {
    this.features[feature] = enabled;
    this.notifyListeners();
    
    // Persist to localStorage for development
    if (import.meta.env.DEV) {
      try {
        localStorage.setItem('features', JSON.stringify(this.features));
      } catch {
        // Ignore storage errors
      }
    }
  }

  subscribe(listener: (features: FeatureFlags) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.features));
  }

  // Load persisted features in development
  loadFromStorage(): void {
    if (!import.meta.env.DEV) return;
    
    try {
      const stored = localStorage.getItem('features');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.features = { ...DEFAULT_FEATURES, ...parsed };
      }
    } catch {
      // Ignore parsing errors, use defaults
    }
  }
}

export const featureManager = new FeatureManager();

// Load persisted features on module load
featureManager.loadFromStorage();