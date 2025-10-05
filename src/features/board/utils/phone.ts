/**
 * Telefonnummer-Formatierung für Board-Anzeige
 * Kombiniert phone-Feld oder Einzelkomponenten (countryCode, areaCode, phoneNumber)
 */

export function formatPhoneNumber(client: any): string {
  if (!client) {
    if (import.meta.env.DEV) console.log('📞 formatPhoneNumber: client is null/undefined');
    return '—';
  }

  // Debug: Zeige verfügbare Telefon-Felder (nur erste 3 Clients um Log nicht zu überfluten)
  if (import.meta.env.DEV && Math.random() < 0.05) {
    console.log('📞 formatPhoneNumber:', {
      id: client.id,
      phone: client.phone,
      countryCode: client.countryCode,
      areaCode: client.areaCode,
      phoneNumber: client.phoneNumber,
      allKeys: Object.keys(client)
    });
  }

  // Strategy 1: Verwende phone-Feld wenn vorhanden und nicht leer
  if (client.phone && String(client.phone).trim()) {
    return String(client.phone).trim();
  }

  // Strategy 2: Kombiniere aus Einzelteilen (DB-Normalisierung oder Import)
  const countryCode = client.countryCode ? String(client.countryCode).trim() : '';
  const areaCode = client.areaCode ? String(client.areaCode).trim() : '';
  const phoneNumber = client.phoneNumber ? String(client.phoneNumber).trim() : '';

  if (countryCode || areaCode || phoneNumber) {
    const parts: string[] = [];

    if (countryCode) {
      parts.push(countryCode.startsWith('+') ? countryCode : `+${countryCode}`);
    }
    if (areaCode) {
      parts.push(areaCode);
    }
    if (phoneNumber) {
      parts.push(phoneNumber);
    }

    return parts.join(' ');
  }

  // Kein Telefon vorhanden
  return '—';
}
