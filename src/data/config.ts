/**
 * Zentrale Feature-Konfiguration
 * Steuert aktivierbare/deaktivierbare Features wie SharePoint-Integration
 */

import { db } from './db';

export interface FeatureConfig {
  sharepoint: {
    enabled: boolean;
    clientId?: string;
    tenantId?: string;
    redirectUri?: string;
    scopes?: string[];
  };
  onedrive: {
    enabled: boolean;
    clientId?: string;
  };
  googledrive: {
    enabled: boolean;
    clientId?: string;
  };
}

const DEFAULT_CONFIG: FeatureConfig = {
  sharepoint: {
    enabled: false,
    scopes: ['https://graph.microsoft.com/Files.Read', 'https://graph.microsoft.com/Sites.Read.All']
  },
  onedrive: {
    enabled: false
  },
  googledrive: {
    enabled: false
  }
};

class ConfigManager {
  private cache: FeatureConfig | null = null;

  async getConfig(): Promise<FeatureConfig> {
    if (this.cache) return this.cache;
    
    try {
      const stored = await db.getKV('feature.config.v1');
      if (stored) {
        const decoded = new TextDecoder().decode(stored);
        this.cache = { ...DEFAULT_CONFIG, ...JSON.parse(decoded) };
      } else {
        this.cache = DEFAULT_CONFIG;
      }
    } catch (error) {
      console.warn('⚠️ Config: Failed to load, using defaults:', error);
      this.cache = DEFAULT_CONFIG;
    }
    
    return this.cache;
  }

  async updateConfig(updates: Partial<FeatureConfig>): Promise<void> {
    const current = await this.getConfig();
    const updated = { ...current, ...updates };
    
    try {
      const encoded = new TextEncoder().encode(JSON.stringify(updated));
      await db.setKV('feature.config.v1', encoded.buffer);
      this.cache = updated;
      
      // Event für UI-Updates
      document.dispatchEvent(new CustomEvent('config:updated', { detail: updated }));
      
      console.log('✅ Config: Updated successfully');
    } catch (error) {
      console.error('❌ Config: Update failed:', error);
      throw error;
    }
  }

  async isSharePointEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.sharepoint.enabled;
  }

  async enableSharePoint(clientId: string, tenantId: string): Promise<void> {
    await this.updateConfig({
      sharepoint: {
        enabled: true,
        clientId,
        tenantId,
        redirectUri: `${window.location.origin}/auth/callback`,
        scopes: ['https://graph.microsoft.com/Files.Read', 'https://graph.microsoft.com/Sites.Read.All']
      }
    });
  }

  async disableSharePoint(): Promise<void> {
    await this.updateConfig({
      sharepoint: {
        enabled: false
      }
    });
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const configManager = new ConfigManager();