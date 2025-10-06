/**
 * KM (Kontrollmeldung) Status Detection
 * Automatically detects if a client should have KM status based on notes content
 */

/**
 * Checks if the notes/anmerkung field contains KM or ELS indicators
 */
export function shouldSetKMStatus(note: string | undefined | null): boolean {
  if (!note) return false;

  const normalized = note.toLowerCase().trim();
  return normalized.includes('km') || normalized.includes('els');
}

/**
 * Determines the correct status based on notes content
 * If notes contain KM/ELS, returns 'KM', otherwise returns provided status or 'offen'
 */
export function determineStatusFromNotes(note: string | undefined | null, currentStatus?: string): string {
  if (shouldSetKMStatus(note)) {
    return 'KM';
  }
  return currentStatus || 'offen';
}
