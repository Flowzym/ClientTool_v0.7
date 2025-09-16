/**
 * Normalisierung & Domänen-Normalizer
 */
import type { Priority, Status } from '../domain/models';

export function normalize(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function trimToNull(v: any): string | null {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}

export function normalizeBool(v: any): boolean | null {
  const s = (v ?? '').toString().trim().toLowerCase();
  if (!s) return null;
  if (['1','true','yes','ja','y','wahr'].includes(s)) return true;
  if (['0','false','no','nein','n','falsch'].includes(s)) return false;
  return null;
}

export function normalizePriority(v: any): Priority {
  const s = (v ?? '').toString().trim().toLowerCase();
  const map: Record<string, Priority> = {
    'niedrig': 'niedrig',
    'low': 'niedrig',
    'normal': 'normal',
    'mittel': 'normal',
    'hoch': 'hoch',
    'high': 'hoch',
    'dringend': 'dringend',
    'urgent': 'dringend',
    'prio1': 'dringend',
    'prio2': 'hoch',
    'prio3': 'normal',
    'prio4': 'niedrig',
  };
  return map[s] ?? 'normal';
}

export function normalizeStatus(v: any): Status {
  const s = (v ?? '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const map: Record<string, Status> = {
    'offen': 'offen',
    'inbearbeitung': 'inBearbeitung',
    'in-bearbeitung': 'inBearbeitung',
    'terminvereinbart': 'terminVereinbart',
    'terminfixiert': 'terminVereinbart',
    'wartetrueckmeldung': 'wartetRueckmeldung',
    'wartetrückmeldung': 'wartetRueckmeldung',
    'dokumenteoffen': 'dokumenteOffen',
    'förderabklärung': 'foerderAbklaerung',
    'foerderabklaerung': 'foerderAbklaerung',
    'zugewiesenextern': 'zugewiesenExtern',
    'ruht': 'ruht',
    'erledigt': 'erledigt',
    'nichterreichbar': 'nichtErreichbar',
    'nicht-erreichbar': 'nichtErreichbar',
    'abgebrochen': 'abgebrochen',
  };
    if (s === 'vomtasentfernt') return 'abgebrochen';
  return map[s] ?? 'offen';
}

export type Result =
  | 'infogespraech'
  | 'terminFixiert'
  | 'nachrichtHinterlassen'
  | 'rueckrufZugesagt'
  | 'keineReaktion'
  | 'ablehnung'
  | 'massnahmeBeendet'
  | 'vermittelt'
  | 'sonstiges'
  | 'bam'
  | 'bewerbungsbuero'
  | 'lebenslauf'
  | 'mailaustausch'
  | 'gesundheitlicheMassnahme'
  | 'uebergabeAnAMS'
  | 'terminNichtEingehalten'
  | 'keinInteresse';

export function normalizeResult(v: any): Result {
  const s = (v ?? '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const map: Record<string, Result> = {
    'infogespraech': 'infogespraech',
    'infosgespraech': 'infogespraech',
    'infogespräch': 'infogespraech',
    'terminfixiert': 'terminFixiert',
    'terminvereinbart': 'terminFixiert',
    'nachrichthinterlassen': 'nachrichtHinterlassen',
    'nachricht': 'nachrichtHinterlassen',
    'rueckrufzugesagt': 'rueckrufZugesagt',
    'rückrufzugesagt': 'rueckrufZugesagt',
    'keinereaktion': 'keineReaktion',
    'ablehnung': 'ablehnung',
    'massnahmebeendet': 'massnahmeBeendet',
    'maßnahmebeendet': 'massnahmeBeendet',
    'vermittelt': 'vermittelt',
    'sonstiges': 'sonstiges'
  };
  // zusätzliche Synonyme
  if (s === 'keininteresse') return 'keinInteresse';
  if (s === 'terminvereinbart') return 'terminFixiert';
  if (s === 'rueckmeldungerwartet' || s === 'rückmeldungerwartet') return 'rueckrufZugesagt';
  if (s === 'bam') return 'bam';
  if (s === 'bewerbungsbuero' || s === 'bewerbungsbüro') return 'bewerbungsbuero';
  if (s === 'lebenslauf') return 'lebenslauf';
  if (s === 'mailaustausch') return 'mailaustausch';
  if (s === 'arbeitsaufnahme') return 'vermittelt';
  if (s === 'gesundheitlichemassnahme' || s === 'gesundheitlichemaßnahme') return 'gesundheitlicheMassnahme';
  if (s === 'uebergabeanams' || s === 'übergabeanams') return 'uebergabeAnAMS';
  if (s === 'terminnichteingehalten') return 'terminNichtEingehalten';
  return map[s] ?? 'sonstiges';
}
