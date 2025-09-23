/**
 * Header-Normalisierung mit Mojibake-Reparatur
 * Repariert kaputte Umlaute und normalisiert für Matching
 */

// Mojibake-Reparatur-Patterns
const MOJIBAKE_REPAIRS: Array<{ pattern: RegExp; replacement: string }> = [
  // Häufige kaputte Umlaute
  { pattern: /stra�e/gi, replacement: 'straße' },
  { pattern: /ma�nahme/gi, replacement: 'maßnahme' },
  { pattern: /gro�/gi, replacement: 'groß' },
  { pattern: /wei�/gi, replacement: 'weiß' },
  { pattern: /hei�/gi, replacement: 'heiß' },
  { pattern: /fu�/gi, replacement: 'fuß' },
  { pattern: /schlie�/gi, replacement: 'schließ' },
  { pattern: /genie�/gi, replacement: 'genieß' },
  { pattern: /vergie�/gi, replacement: 'vergieß' },
  { pattern: /gie�/gi, replacement: 'gieß' },
  { pattern: /flie�/gi, replacement: 'fließ' },
  { pattern: /schie�/gi, replacement: 'schieß' },
  { pattern: /sto�/gi, replacement: 'stoß' },
  { pattern: /geb�ude/gi, replacement: 'gebäude' },
  { pattern: /t�tigkeit/gi, replacement: 'tätigkeit' },
  { pattern: /qualit�t/gi, replacement: 'qualität' },
  { pattern: /aktivit�t/gi, replacement: 'aktivität' },
  { pattern: /priorit�t/gi, replacement: 'priorität' },
  { pattern: /zust�ndigkeit/gi, replacement: 'zuständigkeit' },
  { pattern: /verf�gung/gi, replacement: 'verfügung' },
  { pattern: /erl�uterung/gi, replacement: 'erläuterung' },
  { pattern: /erg�nzung/gi, replacement: 'ergänzung' },
  { pattern: /pr�fung/gi, replacement: 'prüfung' },
  { pattern: /geb�hren/gi, replacement: 'gebühren' },
  
  // UTF-8 Mojibake-Patterns
  { pattern: /Ã¤/g, replacement: 'ä' },
  { pattern: /Ã¶/g, replacement: 'ö' },
  { pattern: /Ã¼/g, replacement: 'ü' },
  { pattern: /ÃŸ/g, replacement: 'ß' },
  { pattern: /Ã„/g, replacement: 'Ä' },
  { pattern: /Ã–/g, replacement: 'Ö' },
  { pattern: /Ãœ/g, replacement: 'Ü' },
  
  // Weitere häufige Patterns
  { pattern: /([a-z])�([a-z])/gi, replacement: '$1ß$2' },
  { pattern: /([a-z])�/gi, replacement: '$1ä' }
];

export interface NormalizedHeader {
  original: string;
  repaired: string;
  normalized: string;
  tokens: string[];
  repairs: string[];
}

/**
 * Repariert Mojibake in Header-Text
 */
export function repairMojibake(text: string): { repaired: string; repairs: string[] } {
  let repaired = text;
  const repairs: string[] = [];
  
  for (const { pattern, replacement } of MOJIBAKE_REPAIRS) {
    const before = repaired;
    repaired = repaired.replace(pattern, replacement);
    if (before !== repaired) {
      repairs.push(`${before} → ${repaired}`);
    }
  }
  
  return { repaired, repairs };
}

/**
 * Normalisiert Header für Matching (behält Display-Version separat)
 */
export function normalizeHeader(raw: string): NormalizedHeader {
  if (!raw || typeof raw !== 'string') {
    return {
      original: raw || '',
      repaired: '',
      normalized: '',
      tokens: [],
      repairs: []
    };
  }

  // 1. Mojibake reparieren
  const { repaired, repairs } = repairMojibake(raw.trim());

  // 2. Für Matching normalisieren
  let normalized = repaired.toLowerCase();
  
  // 3. Diakritika für Matching entfernen
  normalized = normalized
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[áàâ]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòô]/g, 'o')
    .replace(/[úùû]/g, 'u');

  // 4. Sonderzeichen entfernen, Whitespace normalisieren
  normalized = normalized
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 5. Tokenisierung
  const tokens = normalized.split(/\s+/).filter(token => token.length > 0);

  return {
    original: raw,
    repaired,
    normalized,
    tokens,
    repairs
  };
}

/**
 * Prüft ob zwei Header semantisch gleich sind
 */
export function headersMatch(header1: string, header2: string): boolean {
  const norm1 = normalizeHeader(header1);
  const norm2 = normalizeHeader(header2);
  
  return norm1.normalized === norm2.normalized;
}

/**
 * Berechnet Token-Overlap zwischen zwei Headern
 */
export function getTokenOverlap(header1: string, header2: string): number {
  const norm1 = normalizeHeader(header1);
  const norm2 = normalizeHeader(header2);
  
  if (norm1.tokens.length === 0 && norm2.tokens.length === 0) return 1.0;
  if (norm1.tokens.length === 0 || norm2.tokens.length === 0) return 0.0;
  
  const set1 = new Set(norm1.tokens);
  const set2 = new Set(norm2.tokens);
  
  const intersection = new Set([...set1].filter(token => set2.has(token)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}