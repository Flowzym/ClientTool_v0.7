/**
 * Umgebungs-Detection für Feature-Flags
 */

export function getDbName(): string {
  return import.meta.env.VITE_DB_NAMESPACE || 'clienttool';
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