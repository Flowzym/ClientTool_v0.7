/**
 * Netzwerk-Guard (hardened):
 * - Blockiert alle externen Requests (fetch & XHR) im Local-Only-Modus.
 * - Erlaubt nur Same-Origin und sichere Schemes: blob:, data:
 * - DEV-Only Logging; in PROD minimal.
 * - Testfreundlich: install() idempotent, uninstall() stellt Originale wieder her.
 */

import { configManager } from '../data/config';

interface BlockedRequest {
  url: string;
  method: string;
  timestamp: Date;
  source: 'fetch' | 'xhr';
}

class NetworkGuard {
  private blockedRequests: BlockedRequest[] = [];
  private originalFetch: typeof globalThis.fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private installed = false;
  private allowedDomains: Set<string> = new Set();

  private isDev(): boolean {
    // vite define replacement
    // @ts-expect-error - import.meta.env is replaced by Vite at build time
    return typeof import.meta !== 'undefined' && !!import.meta.env && !!import.meta.env.DEV;
  }

  private sameOrigin(url: string): boolean {
    try {
      const u = new URL(url, (globalThis as any).location?.href || 'http://localhost');
      const origin = (globalThis as any).location?.origin || 'http://localhost';
      return u.origin === origin;
    } catch {
      return false;
    }
  }

  private async updateAllowedDomains(): Promise<void> {
    this.allowedDomains.clear();
    
    try {
      const config = await configManager.getConfig();
      
      // SharePoint-Domains hinzufügen wenn aktiviert
      if (config.sharepoint.enabled) {
        this.allowedDomains.add('graph.microsoft.com');
        this.allowedDomains.add('login.microsoftonline.com');
        this.allowedDomains.add('sharepoint.com');
        
        // Tenant-spezifische Domain
        if (config.sharepoint.tenantId) {
          this.allowedDomains.add(`${config.sharepoint.tenantId}.sharepoint.com`);
        }
      }
      
      // OneDrive-Domains
      if (config.onedrive.enabled) {
        this.allowedDomains.add('graph.microsoft.com');
        this.allowedDomains.add('login.microsoftonline.com');
      }
      
      // Google Drive-Domains
      if (config.googledrive.enabled) {
        this.allowedDomains.add('www.googleapis.com');
        this.allowedDomains.add('accounts.google.com');
      }
      
      if (this.isDev() && this.allowedDomains.size > 0) {
        console.log('🌐 NetworkGuard: External domains allowed:', Array.from(this.allowedDomains));
      }
    } catch (error) {
      console.warn('⚠️ NetworkGuard: Failed to update allowed domains:', error);
    }
  }

  private isAllowed(url: string): boolean {
    try {
      // Allow relative & same-origin URLs
      if (this.sameOrigin(url)) return true;

      // Allow safe local schemes
      if (url.startsWith('blob:')) return true;
      if (url.startsWith('data:')) return true;

      // Check dynamically allowed external domains
      if (this.allowedDomains.size > 0) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        for (const domain of this.allowedDomains) {
          if (hostname === domain || hostname.endsWith('.' + domain)) {
            return true;
          }
        }
      }

      // Everything else is blocked (http(s) external, chrome-extension:, file:, etc.)
      return false;
    } catch {
      return false;
    }
  }

  private logBlocked(source: 'fetch'|'xhr', method: string, url: string) {
    this.blockedRequests.push({ url, method, timestamp: new Date(), source });
    if (this.isDev()) {
      console.warn(`⛔ NetworkGuard: External request blocked - ${method} ${url}`);
    }
  }

  public install(): void {
    if (this.installed) return;
    this.installed = true;
    
    // Initial domain update
    this.updateAllowedDomains();
    
    // Listen for config changes
    document.addEventListener('config:updated', () => {
      this.updateAllowedDomains();
    });

    // Wrap fetch
    this.originalFetch = globalThis.fetch;
    globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const method = (init && init.method) ? init.method.toUpperCase() : 'GET';
      const url = typeof input === 'string' ? input : (input as any).url;
      if (!this.isAllowed(url)) {
        this.logBlocked('fetch', method, url);
        return Promise.reject(new TypeError(`NetworkGuard: External request blocked - ${url}`));
      }
      // @ts-expect-error: fetch context binding differs in our environment
      return this.originalFetch.call(globalThis, input, init);
    }

    // Wrap XHR
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    const original = this.originalXHROpen;
    XMLHttpRequest.prototype.open = function(this: XMLHttpRequest, method: string, url: string, async?: boolean, user?: string|null, password?: string|null) {
      const m = (method || 'GET').toUpperCase();
      if (!networkGuard.isAllowed(url)) {
        networkGuard.logBlocked('xhr', m, url);
        throw new TypeError(`NetworkGuard: External request blocked - ${url}`);
      }
      // @ts-expect-error XHR method signature varies across environments
      return original.apply(this, [method, url, async, user, password]);
    };
  }

  public uninstall(): void {
    if (!this.installed) return;
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch as any;
      this.originalFetch = null;
    }
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      this.originalXHROpen = null;
    }
    this.installed = false;
  }

  public getBlockedRequests(): BlockedRequest[] {
    return [...this.blockedRequests];
  }

  public clearLog(): void {
    this.blockedRequests = [];
    if (this.isDev()) console.log('🧹 NetworkGuard: Blocked requests log cleared');
  }

  public async refreshAllowedDomains(): Promise<void> {
    await this.updateAllowedDomains();
  }

  public getAllowedDomains(): string[] {
    return Array.from(this.allowedDomains);
  }
}

// Singleton-Instanz
export const networkGuard = new NetworkGuard();

// Auto-Installation
networkGuard.install();