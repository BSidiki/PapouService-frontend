export type TransactionState = 'PENDING' | 'VALIDATED' | 'REJECTED';
export type Platform = 'IXBET' | 'BETWINNER' | 'MELBET' | 'STARZ' | '—';
export type PaymentOption = 'O' | 'M' | 'T' | 'W' | 'S' | 'C';

export interface PlatformRef {
  num: number;
  ville: string;
  rue: string;
}

export interface Role {
  name: string;
}

export interface Utilisateur {
  idUtilisateur: number;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  numeroUtilisateur: string;
  id_1XBET?: string;
  id_BETWINNER?: string;
  id_MELBET?: string;
  id_888STARZ?: string;
  codeParrainage?: string;
  codePromo?: string;
  commissionEnAttente?: number;
  roles?: Role[];
}

export interface Depot {
  idDepot: number;
  montant: number;
  numeroEnvoyant?: string;
  numeroInvite?: string;
  dateDepot?: string;
  optionDeTransaction?: string;
  optionDepot?: string;
  utilisateur?: Utilisateur;
  transactionState?: TransactionState;
  capture?: string;
  pays?: string;
  motifRejet?: string;
  isInvite?: boolean;
  nomInvite?: string;
  prenomInvite?: string;
  idPlateforme?: string;
  idUtilisateur?: number;
}

export interface Retrait {
  idRetrait: number;
  montant?: number;
  numeroEnvoyant?: string;
  numeroInvite?: string;
  dateRetrait?: string;
  optionDeTransaction?: string;
  optionRetrait?: string;
  codeRetrait?: string;
  caisseChoisie?: string;
  utilisateur?: Utilisateur;
  transactionState?: TransactionState;
  file?: string;
  capture?: string;
  pays?: string;
  motifRejet?: string;
  motif?: string;
  isInvite?: boolean;
  nomInvite?: string;
  prenomInvite?: string;
  idPlateforme?: string;
  idUtilisateur?: number;
  typeRetrait?: 'NORMAL' | 'COMMISSION';
}

export interface Annonce {
  id?: number;
  idAnnonce?: number;
  titre?: string;
  texte?: string;
  media?: string;
}

/** Numéros de paiement par plateforme et par opérateur */
export const PAYMENT_NUMBERS: Record<string, { OM: string; MOOV: string; TELECEL: string }> = {
  '888STARZ':  { OM: '04116262', MOOV: '1082626', TELECEL: '04116262' },
  '1XBET':     { OM: '04116262', MOOV: '1082626', TELECEL: '04116262' },
  'MELBET':    { OM: '04116262', MOOV: '1082626', TELECEL: '04116262' },
  'BETWINNER': { OM: '04116262', MOOV: '1082626', TELECEL: '04116262' },
};
