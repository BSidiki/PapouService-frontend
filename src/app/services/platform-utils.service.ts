import { Injectable } from '@angular/core';
import { Platform, Utilisateur, PAYMENT_NUMBERS } from '../models';

@Injectable({ providedIn: 'root' })
export class PlatformUtilsService {

  /** Normalise les valeurs de plateforme venant du backend */
  normalize(p?: string): Platform {
    if (!p) return '—';
    const up = p.toUpperCase();
    if (up === '1XBET' || up === 'IXBET') return 'IXBET';
    if (up === 'BETWINNER') return 'BETWINNER';
    if (up === 'MELBET') return 'MELBET';
    if (up === '888STARZ' || up === 'STARZ') return 'STARZ';
    return '—';
  }

  /** Retourne l'ID plateforme de l'utilisateur selon la plateforme */
  getUserPlatformId(p?: Platform, u?: Utilisateur): string {
    if (!u || !p) return '—';
    switch (p) {
      case 'IXBET':     return u.id_1XBET     || '—';
      case 'BETWINNER': return u.id_BETWINNER  || '—';
      case 'MELBET':    return u.id_MELBET     || '—';
      case 'STARZ':     return u.id_888STARZ   || '—';
      default:          return '—';
    }
  }

  /** Retourne le numéro de paiement selon la plateforme et l'opérateur */
  getPaymentNumber(plateforme: string, operateur: 'O' | 'M'): string {
    const nums = PAYMENT_NUMBERS[plateforme];
    if (!nums) return '';
    if (operateur === 'O') return nums.OM;
    if (operateur === 'M') return nums.MOOV;
    return '';
  }

  /** Construit le code USSD selon la plateforme, l'opérateur et le montant */
  buildUssdCode(plateforme: string, operateur: 'O' | 'M', montant: number): string {
    const nums = PAYMENT_NUMBERS[plateforme];
    if (!nums || !montant) return '';
    if (operateur === 'O') return `*144*10*${nums.OM}*${montant}#`;
    if (operateur === 'M') return `*555*4*1*${nums.MOOV}*${montant}#`;
    return '';
  }

  /** Libellé lisible d'un moyen de paiement/retrait */
  getPaymentLabel(option: string): string {
    const map: Record<string, string> = {
      O: 'Orange Money', M: 'Moov Money',
      W: 'Wave', S: 'Sank Money', C: 'Carte Bancaire'
    };
    return map[option] || option;
  }

  /** Libellé lisible d'une plateforme */
  getPlatformLabel(p: Platform): string {
    const map: Record<Platform, string> = {
      IXBET: '1XBET', BETWINNER: 'BetWinner', MELBET: 'MelBet', STARZ: '888Starz', '—': '—'
    };
    return map[p] ?? p;
  }
}
