/**
 * Umgebungs-Detection für Feature-Flags
 */

export type EncryptionMode = 'plain' | 'dev-enc' | 'prod-enc';

let encryptionModeWarningShown = false;
let cachedEncryptionMode: EncryptionMode | null = null;

export function getEncryptionMode(): EncryptionMode {
  if (cachedEncryptionMode) {
    return cachedEncryptionMode;
  }

  let mode = import.meta.env.VITE_ENCRYPTION_MODE as string;

  // Dev-Fallback: Wenn in Development und Mode leer/undefined → dev-enc
  if (import.meta.env.MODE === 'development' && (!mode || mode.trim() === '')) {
    if (!encryptionModeWarningShown) {
      console.warn(
        '⚠️ VITE_ENCRYPTION_MODE nicht gesetzt - verwende dev-enc als Default für Development.\n' +
        'Setzen Sie VITE_ENCRYPTION_MODE explizit in .env.development für konsistentes Verhalten.'
      );
      encryptionModeWarningShown = true;
    }
    mode = 'dev-enc';
  }

  if (!mode || !['plain', 'dev-enc', 'prod-enc'].includes(mode)) {
    throw new Error(
      `Ungültiger VITE_ENCRYPTION_MODE: "${mode}". ` +
      'Erlaubt: plain | dev-enc | prod-enc\n' +
      'Setzen Sie die Variable in .env.development, .env.production oder als Umgebungsvariable.'
    );
  }

  cachedEncryptionMode = mode as EncryptionMode;
  return cachedEncryptionMode;
}

export function getDbName(): string {
  const namespace = import.meta.env.VITE_DB_NAMESPACE || 'clienttool';
  const mode = getEncryptionMode();
  const modeKey = mode.replace('-', '_'); // dev-enc → dev_enc
  
  return `${namespace}_${modeKey}`;
}

export function isLocalhostOrigin(): boolean {
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

export const isEmbedded = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin error bedeutet embedded
    return true;
  }
};

export const isBoltHost = (): boolean => {
  return /webcontainer-api\.io|stackblitz|bolt\.new/i.test(location.hostname);
};

export const supportsFSAccess = (): boolean => {
  return (
    'showOpenFilePicker' in window && 
    isSecureContext && 
    !isEmbedded() &&
    !isBoltHost()
  );
};

export const getEnvironmentInfo = () => ({
  isEmbedded: isEmbedded(),
  isBoltHost: isBoltHost(),
  supportsFSAccess: supportsFSAccess(),
  isSecureContext,
  hostname: location.hostname
});