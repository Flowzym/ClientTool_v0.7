/**
 * Computed Spalten für zusammengesetzte Felder
 * Reine View-/Export-Felder ohne Domain-Änderungen
 */

export interface ComputedField {
  key: string;
  label: string;
  description: string;
  compute: (client: any) => string;
  dependencies: string[];
}

/**
 * AMS Betreuerin zusammengesetzt
 * Format: "<Nachname>, <Vorname> (<Titel>)"
 */
function computeAmsBetreuerin(client: any): string {
  const title = client.amsAgentTitle?.trim() || '';
  const firstName = client.amsAgentFirstName?.trim() || '';
  const lastName = client.amsAgentLastName?.trim() || '';
  
  if (!firstName && !lastName && !title) return '';
  
  const nameParts: string[] = [];
  
  if (lastName) {
    nameParts.push(lastName);
  }
  
  if (firstName) {
    if (lastName) {
      nameParts.push(`, ${firstName}`);
    } else {
      nameParts.push(firstName);
    }
  }
  
  if (title) {
    nameParts.push(` (${title})`);
  }
  
  return nameParts.join('').trim();
}

/**
 * Telefonnummer kombiniert
 * Format: "(<Landesvorwahl>) <Vorwahl> <Telefon-Nr>"
 */
function computeTelefonnummerKombiniert(client: any): string {
  const countryCode = client.countryCode?.trim() || '';
  const areaCode = client.areaCode?.trim() || '';
  const phoneNumber = client.phoneNumber?.trim() || '';
  
  if (!countryCode && !areaCode && !phoneNumber) return '';
  
  const parts: string[] = [];
  
  if (countryCode) {
    // Führendes + hinzufügen falls nicht vorhanden
    const formatted = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    parts.push(`(${formatted})`);
  }
  
  if (areaCode) {
    parts.push(areaCode);
  }
  
  if (phoneNumber) {
    parts.push(phoneNumber);
  }
  
  return parts.join(' ').trim();
}

/**
 * Alle verfügbaren computed Felder
 */
export const COMPUTED_FIELDS: ComputedField[] = [
  {
    key: 'amsBetreuerin',
    label: 'AMS Betreuerin',
    description: 'Zusammengesetzter Name der AMS-Betreuerin',
    compute: computeAmsBetreuerin,
    dependencies: ['amsAgentTitle', 'amsAgentFirstName', 'amsAgentLastName']
  },
  {
    key: 'telefonnummerKombiniert',
    label: 'Telefonnummer (kombiniert)',
    description: 'Vollständige Telefonnummer mit Vorwahlen',
    compute: computeTelefonnummerKombiniert,
    dependencies: ['countryCode', 'areaCode', 'phoneNumber']
  }
];

/**
 * Berechnet alle computed Felder für einen Client
 */
export function computeAllFields(client: any): Record<string, string> {
  const computed: Record<string, string> = {};
  
  COMPUTED_FIELDS.forEach(field => {
    computed[field.key] = field.compute(client);
  });
  
  return computed;
}

/**
 * Prüft ob alle Dependencies für ein computed Field verfügbar sind
 */
export function hasRequiredDependencies(client: any, field: ComputedField): boolean {
  return field.dependencies.some(dep => {
    const value = client[dep];
    return value != null && String(value).trim().length > 0;
  });
}