/**
 * SharePoint-Integration über Microsoft Graph API
 * Nur aktiv wenn Feature-Flag aktiviert ist
 */

import { configManager } from '../data/config';

export interface SharePointFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  downloadUrl: string;
  webUrl: string;
  mimeType: string;
}

export interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
}

export interface AuthResult {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

class SharePointService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Prüft ob SharePoint-Integration aktiviert ist
   */
  async isEnabled(): Promise<boolean> {
    return await configManager.isSharePointEnabled();
  }

  /**
   * Authentifizierung mit Microsoft Identity Platform
   */
  async authenticate(): Promise<AuthResult> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new Error('SharePoint-Integration ist deaktiviert');
    }

    const config = await configManager.getConfig();
    const { clientId, tenantId, redirectUri, scopes } = config.sharepoint;

    if (!clientId || !tenantId) {
      throw new Error('SharePoint-Konfiguration unvollständig (Client ID oder Tenant ID fehlt)');
    }

    // OAuth 2.0 Authorization Code Flow mit PKCE
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri || `${window.location.origin}/auth/callback`);
    authUrl.searchParams.set('scope', scopes?.join(' ') || 'https://graph.microsoft.com/Files.Read');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', crypto.randomUUID());

    // Popup-Fenster für Auth
    const popup = window.open(
      authUrl.toString(),
      'sharepoint-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          reject(new Error('Authentifizierung abgebrochen'));
        }
      }, 1000);

      // Message-Handler für Auth-Callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'sharepoint-auth-success') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          
          try {
            const tokenResult = await this.exchangeCodeForToken(
              event.data.code,
              codeVerifier,
              clientId,
              tenantId,
              redirectUri || `${window.location.origin}/auth/callback`
            );
            
            this.accessToken = tokenResult.accessToken;
            this.tokenExpiresAt = tokenResult.expiresAt;
            
            resolve(tokenResult);
          } catch (error) {
            reject(error);
          }
        } else if (event.data.type === 'sharepoint-auth-error') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  /**
   * Dateien aus SharePoint-Bibliothek auflisten
   */
  async listFiles(siteId?: string, driveId?: string, folderId?: string): Promise<SharePointFile[]> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new Error('SharePoint-Integration ist deaktiviert');
    }

    await this.ensureValidToken();

    const baseUrl = siteId && driveId 
      ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}`
      : 'https://graph.microsoft.com/v1.0/me/drive';
    
    const endpoint = folderId 
      ? `${baseUrl}/items/${folderId}/children`
      : `${baseUrl}/root/children`;

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SharePoint API-Fehler: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.value || [])
      .filter((item: any) => item.file) // Nur Dateien, keine Ordner
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        lastModified: item.lastModifiedDateTime,
        downloadUrl: item['@microsoft.graph.downloadUrl'],
        webUrl: item.webUrl,
        mimeType: item.file.mimeType
      }));
  }

  /**
   * Datei von SharePoint herunterladen
   */
  async downloadFile(file: SharePointFile): Promise<ArrayBuffer> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new Error('SharePoint-Integration ist deaktiviert');
    }

    const response = await fetch(file.downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Download fehlgeschlagen: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * SharePoint-Sites auflisten
   */
  async listSites(): Promise<Array<{ id: string; name: string; webUrl: string }>> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new Error('SharePoint-Integration ist deaktiviert');
    }

    await this.ensureValidToken();

    const response = await fetch('https://graph.microsoft.com/v1.0/sites?search=*', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SharePoint Sites API-Fehler: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.value || []).map((site: any) => ({
      id: site.id,
      name: site.displayName || site.name,
      webUrl: site.webUrl
    }));
  }

  // Private Helper-Methoden
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    clientId: string,
    tenantId: string,
    redirectUri: string
  ): Promise<AuthResult> {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token-Exchange fehlgeschlagen: ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      refreshToken: data.refresh_token
    };
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      throw new Error('Keine gültige Authentifizierung. Bitte erneut anmelden.');
    }
  }
}

export const sharepointService = new SharePointService();