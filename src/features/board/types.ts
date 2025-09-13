/**
 * Board-specific types
 */

export type OfferValue = 'BAM' | 'LL/B+' | 'BwB' | 'NB';

export type PriorityValue = 'niedrig' | 'normal' | 'hoch' | 'dringend';

export type StatusValue = 
  | 'offen'
  | 'inBearbeitung'
  | 'terminVereinbart'
  | 'wartetRueckmeldung'
  | 'dokumenteOffen'
  | 'foerderAbklaerung'
  | 'zugewiesenExtern'
  | 'ruht'
  | 'erledigt'
  | 'nichtErreichbar'
  | 'abgebrochen';