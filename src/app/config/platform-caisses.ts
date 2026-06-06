import { PlatformRef } from '../models';

export const PLATFORM_CAISSES: Record<string, PlatformRef[]> = {
  '1XBET': [
    { num: 1, ville: 'Ouahigouya',  rue: 'Ps flasbet service' },
    { num: 2, ville: 'Ouahigouya',  rue: 'Ps papou service' },
    { num: 3, ville: 'Ouahigouya',  rue: 'PS Annexe' },
    { num: 4, ville: 'Ouahigouya',  rue: 'Papou service international' },
    { num: 5, ville: 'Ouagadougou', rue: 'Papou Service International (24/7)' },
    { num: 6, ville: 'Ouahigouya',  rue: 'Papou service espèce' },
    { num: 7, ville: 'Dedougou',    rue: 'Papou Service international' },
    { num: 8, ville: 'Ouahigouya',  rue: 'Boomer Service' },
  ],
  'BETWINNER': [
    { num: 1, ville: 'Ouahigouya', rue: 'Papou Service Inter' },
    { num: 2, ville: 'Ouahigouya', rue: 'Papou Service annexe' },
    { num: 3, ville: 'Ouahigouya', rue: 'Papou services bf (24/7)' },
    { num: 4, ville: 'Dedougou',   rue: 'Papou Service international' },
  ],
  'MELBET': [
    { num: 1, ville: 'Ouahigouya', rue: 'Ps annexe OHG' },
    { num: 2, ville: 'Ouahigouya', rue: 'Chez PS papou service' },
  ],
  '888STARZ': [
    { num: 1, ville: 'Ouahigouya', rue: 'Papou cash service' },
  ],
};

export function buildCaisseKey(ref: PlatformRef): string {
  return `N°${ref.num} - ${ref.rue} (${ref.ville})`;
}
