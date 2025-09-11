/**
 * PWA-Utilities für Service Worker Registration und App-Updates
 * Mit robuster Umgebungsprüfung für dev-sichere Abschaltung
 */

export type PWARegistrationStatus = 
  | 'registered'
  | 'disabledInHost' 
  | 'unsupported'
  | 'insecure'
  | 'devDisabled'
  | 'failed';

export interface PWARegistrationResult {
  status: PWARegistrationStatus;
  error?: Error;
  registration?: ServiceWorkerRegistration;
}

interface PWAUpdateAvailableEvent {
  type: 'updateAvailable';
  registration: ServiceWorkerRegistration;
}

interface PWAInstalledEvent {
  type: 'installed';
}

type PWAEvent = PWAUpdateAvailableEvent | PWAInstalledEvent;

class PWAManager {
  private eventListeners: Map<string, ((event: PWAEvent) => void)[]> = new Map();
  
  /**
   * Service Worker registrieren mit robuster Umgebungsprüfung
   */
  public async registerServiceWorker(): Promise<PWARegistrationResult> {
    const host = location.hostname.toLowerCase();
    const blockedHosts = ['stackblitz', 'webcontainer', 'bolt.new'];
    const isBlockedHost = blockedHosts.some(h => host.includes(h));
    
    // Feature-Detection
    if (!('serviceWorker' in navigator)) {
      console.info('ℹ️ PWA: Service Worker not supported in this browser');
      return { status: 'unsupported' };
    }
    
    // Secure Context prüfen
    if (!isSecureContext) {
      console.info('ℹ️ PWA: Service Worker requires secure context (HTTPS)');
      return { status: 'insecure' };
    }
    
    // Host-Blockliste prüfen
    if (isBlockedHost) {
      console.info(`ℹ️ PWA: Service Worker disabled in this host environment: ${host}`);
      return { status: 'disabledInHost' };
    }
    
    // Dev-Umgebung: nur auf localhost/127.0.0.1 registrieren
    if (import.meta.env.DEV && !(host === 'localhost' || host === '127.0.0.1')) {
      console.info('ℹ️ PWA: DEV build - Service Worker registration disabled for non-localhost');
      return { status: 'devDisabled' };
    }
    
    try {
      console.log('🔄 PWA: Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      // Warte auf Ready-State
      await navigator.serviceWorker.ready;
      
      console.log('✅ PWA: Service Worker registered successfully', {
        scope: registration.scope,
        state: registration.active?.state
      });
      
      // Update-Handler
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 PWA: Update available');
              this.emit({
                type: 'updateAvailable',
                registration
              });
            }
          });
        }
      });
      
      // Prüfe auf existierende Updates
      await registration.update();
      
      return { 
        status: 'registered',
        registration
      };
      
    } catch (error) {
      console.warn('⚠️ PWA: Service Worker registration failed:', error);
      return { 
        status: 'failed', 
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * App-Update aktivieren (neue Version laden)
   */
  public async activateUpdate(registration: ServiceWorkerRegistration): Promise<void> {
    const waitingWorker = registration.waiting;
    if (!waitingWorker) {
      console.warn('⚠️ PWA: No waiting worker found');
      return;
    }
    
    console.log('🔄 PWA: Activating update...');
    
    // Warte auf Controller-Change
    await new Promise<void>((resolve) => {
      const handleControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      // Aktiviere wartenden Worker
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    });
    
    // Reload nach Update
    window.location.reload();
  }
  
  /**
   * Prüfe ob App installiert werden kann
   */
  public async checkInstallability(): Promise<boolean> {
    // A2HS-Event-Handler
    let deferredPrompt: any = null;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });
    
    return new Promise((resolve) => {
      setTimeout(() => resolve(!!deferredPrompt), 1000);
    });
  }
  
  private emit(event: PWAEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
  }
  
  public on(eventType: PWAEvent['type'], listener: (event: PWAEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }
}

export const pwaManager = new PWAManager();

/**
 * PWA initialisieren - wird in main.tsx aufgerufen
 */
export async function initializePWA(): Promise<PWARegistrationResult> {
  console.log('🚀 PWA: Initializing...');
  
  try {
    const result = await pwaManager.registerServiceWorker();
    
    // Installability nur prüfen wenn SW registriert
    if (result.status === 'registered') {
      const canInstall = await pwaManager.checkInstallability();
      if (canInstall) {
        console.log('📱 PWA: App can be installed');
      }
    }
    
    console.log(`✅ PWA: Initialization complete (Status: ${result.status})`);
    return result;
    
  } catch (error) {
    console.error('❌ PWA: Initialization failed:', error);
    return { 
      status: 'failed', 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * PWA-Status für UI-Badge formatieren
 */
export function getPWAStatusLabel(status: PWARegistrationStatus): {
  label: string;
  variant: 'success' | 'default';
} {
  switch (status) {
    case 'registered':
      return {
        label: 'Local-Only aktiv',
        variant: 'success'
      };
    case 'disabledInHost':
      return {
        label: 'Local-Only (SW deaktiviert in dieser Umgebung)',
        variant: 'default'
      };
    case 'unsupported':
      return {
        label: 'Local-Only (SW nicht unterstützt)',
        variant: 'default'
      };
    case 'insecure':
      return {
        label: 'Local-Only (HTTPS erforderlich)',
        variant: 'default'
      };
    case 'devDisabled':
      return {
        label: 'Local-Only (SW in DEV deaktiviert)',
        variant: 'default'
      };
    case 'failed':
      return {
        label: 'Local-Only (SW-Registrierung fehlgeschlagen)',
        variant: 'default'
      };
    default:
      return {
        label: 'Local-Only',
        variant: 'default'
      };
  }
}