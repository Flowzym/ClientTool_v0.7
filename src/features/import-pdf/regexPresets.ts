/**
 * Regex-Presets für PDF-Text-Extraktion
 * Typische Muster für österreichische/deutsche Klient:innendaten
 */

export interface RegexMatch {
  field: string;
  pattern: RegExp;
  matches: Array<{
    value: string;
    index: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

export const fieldPatterns = {
  // AMS-ID: A + 4-6 Ziffern
  amsId: {
    pattern: /\b(A\d{4,6})\b/gi,
    confidence: 'high' as const,
    description: 'AMS-Nummer (A + 4-6 Ziffern)'
  },
  
  // Geburtsdatum: dd.mm.yyyy oder dd/mm/yyyy
  birthDate: {
    pattern: /\b(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})\b/g,
    confidence: 'high' as const,
    description: 'Geburtsdatum (dd.mm.yyyy)'
  },
  
  // Telefonnummer: verschiedene Formate
  phone: {
    pattern: /(?:\+43|0043|0)\s*\d{1,4}[\s/-]*\d{3,4}[\s/-]*\d{3,4}|\+?\d{2,4}[\s/-]*\d{6,}/g,
    confidence: 'medium' as const,
    description: 'Telefonnummer'
  },
  
  // E-Mail-Adresse
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    confidence: 'high' as const,
    description: 'E-Mail-Adresse'
  },
  
  // Name: Zwei Wörter mit Großbuchstaben (Vor- und Nachname)
  fullName: {
    pattern: /\b([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?)\s+([A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?)\b/g,
    confidence: 'medium' as const,
    description: 'Vollständiger Name (Vorname Nachname)'
  },
  
  // Adresse: Straße + Hausnummer + PLZ + Ort
  address: {
    pattern: /\b([A-ZÄÖÜ][a-zäöüß]+(?:straße|gasse|weg|platz|allee|ring|str\.?))\s+(\d+\w?),?\s*(\d{4,5})\s+([A-ZÄÖÜ][a-zäöüß]+)\b/gi,
    confidence: 'medium' as const,
    description: 'Adresse (Straße Hausnr., PLZ Ort)'
  },
  
  // PLZ (separat für bessere Erkennung)
  postalCode: {
    pattern: /\b(\d{4,5})\b/g,
    confidence: 'low' as const,
    description: 'Postleitzahl'
  }
};

/**
 * Text analysieren und Regex-Treffer finden
 */
export function analyzeTextWithRegex(text: string): RegexMatch[] {
  const results: RegexMatch[] = [];
  
  Object.entries(fieldPatterns).forEach(([field, config]) => {
    const matches: RegexMatch['matches'] = [];
    let match;
    
    // Reset regex lastIndex für globale Patterns
    config.pattern.lastIndex = 0;
    
    while ((match = config.pattern.exec(text)) !== null) {
      // Verhindere Endlosschleife bei nicht-globalen Regex
      if (match.index === config.pattern.lastIndex) {
        config.pattern.lastIndex++;
      }
      
      matches.push({
        value: match[1] || match[0],
        index: match.index,
        confidence: config.confidence
      });
    }
    
    if (matches.length > 0) {
      results.push({
        field,
        pattern: config.pattern,
        matches
      });
    }
  });
  
  return results;
}

/**
 * Namen in Vor- und Nachname aufteilen
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
  
  return {
    firstName: fullName,
    lastName: ''
  };
}

/**
 * Adresse in Komponenten aufteilen
 */
export function parseAddress(address: string): {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
} {
  const match = address.match(/^(.+?)\s+(\d+\w?),?\s*(\d{4,5})\s+(.+)$/);
  
  if (match) {
    return {
      street: match[1],
      houseNumber: match[2],
      postalCode: match[3],
      city: match[4]
    };
  }
  
  return {
    street: address,
    houseNumber: '',
    postalCode: '',
    city: ''
  };
}

/**
 * Beste Treffer für jedes Feld auswählen (höchste Confidence)
 */
export function getBestMatches(regexResults: RegexMatch[]): Record<string, string> {
  const bestMatches: Record<string, string> = {};
  
  regexResults.forEach(result => {
    if (result.matches.length > 0) {
      // Sortiere nach Confidence und nimm den ersten
      const sortedMatches = result.matches.sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      });
      
      bestMatches[result.field] = sortedMatches[0].value;
    }
  });
  
  return bestMatches;
}