import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AnnoncesPublicComponent } from '../../annonces/annonces-public.component';
import { ErrorService } from '../../../services/error.service';
import { AuthService } from '../../../services/auth.service';
import { UtilisateurService } from '../../../services/utilisateur.service';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { catchError, of } from 'rxjs';

interface Commission {
  idCommission?: number;
  idFilleul?: number;
  montant: number;
  datePeriode?: string;
  dateVersement?: string;
  versee?: boolean;
  nomFilleul?: string;
}

interface FilleulStats {
  idUtilisateur: number;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  numeroUtilisateur: string;
  nbDepots: number;
  totalDepots: number;
  commissionGeneree: number;
}

@Component({
  selector: 'app-parrainage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    AnnoncesPublicComponent,
    FooterComponent
  ],
  templateUrl: './parrainage.component.html',
  styleUrls: ['./parrainage.component.scss']
})
export class ParrainageComponent implements OnInit {
  referralCode = '';
  userId = 0;

  parrainageCount = 0;
  filleuls: any[] = [];
  commissions: Commission[] = [];
  commissionEnAttente = 0;
  filleulsStats: FilleulStats[] = [];

  readonly milestone1 = 30;
  readonly milestone2 = 40;

  loading = false;
  generatingCode = false;

  // Visibilité des montants sensibles
  showTotalCommissions = false;
  showCommissionEnAttente = false;
  showCommissionsCard = false;

  // Retrait commission form
  showRetraitForm = false;
  retraitData = { numeroMobile: '', pays: 'BF', modePaiement: 'O' };
  retraitLoading = false;

  constructor(
    private auth: AuthService,
    private utilisateurService: UtilisateurService, private errorService: ErrorService) {}

  ngOnInit(): void {
    const u = this.auth.getUser();
    if (u) {
      this.userId = u.idUtilisateur;
      this.referralCode = u.codePromo ?? '';
      this.commissionEnAttente = u.commissionEnAttente ?? 0;
    }
    this.loadData();
    // Auto-générer le code si l'utilisateur n'en a pas encore
    if (this.userId && !this.referralCode) {
      this.genererCode();
    }
  }

  loadData(): void {
    if (!this.userId) return;
    this.loading = true;

    // Rafraîchir les données utilisateur depuis le serveur (commissions à jour)
    this.utilisateurService.getById(this.userId).pipe(
      catchError(() => of(null))
    ).subscribe(freshUser => {
      if (freshUser) {
        this.commissionEnAttente = (freshUser as any).commissionEnAttente ?? 0;
        this.auth.saveUser({ ...this.auth.getUser(), ...(freshUser as any) });
      }
    });

    this.utilisateurService.getFilleuls(this.userId).pipe(
      catchError(() => of([]))
    ).subscribe(filleuls => {
      this.filleuls = filleuls ?? [];
      this.parrainageCount = this.filleuls.length;
      this.buildFilleulsStats();
    });

    this.utilisateurService.getCommissions(this.userId).pipe(
      catchError(() => of([]))
    ).subscribe(commissions => {
      this.commissions = commissions ?? [];
      // Calculer la commission en attente (commissions non encore versées)
      const pending = this.commissions
        .filter(c => !c.versee)
        .reduce((s, c) => s + (c.montant || 0), 0);
      if (pending > 0) this.commissionEnAttente = pending;
      this.buildFilleulsStats();
      this.loading = false;
    });
  }

  genererCode(): void {
    if (!this.userId) return;
    this.generatingCode = true;
    this.utilisateurService.genererCodePromo(this.userId).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      this.generatingCode = false;
      if (res?.codePromo) {
        this.referralCode = res.codePromo;
        // Mettre à jour le localStorage pour que les autres pages voient le bon code
        const u = this.auth.getUser();
        if (u) { this.auth.saveUser({ ...u, codePromo: res.codePromo }); }
        this.showSuccess('Code de parrainage généré !');
      } else {
        this.showError('Erreur lors de la génération du code.');
      }
    });
  }

  getRegistrationLink(): string {
    return `https://papouservice.com/register?ref=${encodeURIComponent(this.referralCode)}`;
  }

  getParrainageProgress1(): number {
    return Math.min(100, (this.parrainageCount / this.milestone1) * 100);
  }

  getParrainageProgress2(): number {
    if (this.parrainageCount < this.milestone1) return 0;
    return Math.min(100, ((this.parrainageCount - this.milestone1) / (this.milestone2 - this.milestone1)) * 100);
  }

  getParrainageCountForMilestone2(): number {
    return Math.max(0, this.parrainageCount - this.milestone1);
  }

  getTotalCommissions(): number {
    return this.commissions.reduce((s, c) => s + (c.montant || 0), 0);
  }

  copyReferralCode(): void {
    navigator.clipboard?.writeText(this.referralCode).then(() => {
      this.showSuccess('Code copié dans le presse-papiers !');
    }).catch(() => {
      this.showError('Impossible de copier. Code : ' + this.referralCode);
    });
  }

  copyRegistrationLink(): void {
    navigator.clipboard?.writeText(this.getRegistrationLink()).then(() => {
      this.showSuccess('Lien d\'inscription copié !');
    }).catch(() => {
      this.showError('Impossible de copier le lien.');
    });
  }

  private async shareWithLogo(text: string, title: string, fallback?: () => void): Promise<void> {
    try {
      const response = await fetch('assets/images/logo.png');
      const blob = await response.blob();
      const file = new File([blob], 'PapouService.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, title });
        return;
      }
    } catch { /* ignore, use fallback */ }
    fallback?.();
  }

  shareViaWhatsApp(): void {
    const link = this.getRegistrationLink();
    const text =
      `🌟 *Papou Service* — Dépôts & Retraits de paris sportifs\n\n` +
      `Rejoins-moi avec mon code de parrainage *${this.referralCode}* et profite de nos services !\n` +
      `👉 Inscris-toi ici (code pré-rempli) : ${link}`;
    this.shareWithLogo(text, 'Papou Service', () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });
  }

  shareViaFacebook(): void {
    const link = this.getRegistrationLink();
    const text =
      `🌟 Papou Service — Rejoins-moi avec mon code de parrainage ${this.referralCode} !\n👉 ${link}`;
    this.shareWithLogo(text, 'Papou Service', () => {
      const url = encodeURIComponent(link);
      const quote = encodeURIComponent(`🌟 Papou Service — Rejoins-moi avec mon code de parrainage ${this.referralCode} !`);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
    });
  }

  shareViaMessenger(): void {
    const link = this.getRegistrationLink();
    const text =
      `🌟 Papou Service — Rejoins-moi avec mon code de parrainage ${this.referralCode} !\n👉 ${link}`;
    this.shareWithLogo(text, 'Papou Service', () => {
      const url = encodeURIComponent(link);
      window.open(`https://www.facebook.com/dialog/send?link=${url}&redirect_uri=${url}`, '_blank');
    });
  }

  shareViaInstagram(): void {
    const link = this.getRegistrationLink();
    const text =
      `🌟 Papou Service — Dépôts & Retraits de paris sportifs\n\n` +
      `Rejoins-moi avec mon code de parrainage : ${this.referralCode}\n` +
      `👉 Inscris-toi ici (code pré-rempli) : ${link}`;
    this.shareWithLogo(text, 'Papou Service', () => {
      navigator.clipboard?.writeText(text).then(() => {
        this.showSuccess('Message copié ! Collez-le dans votre story ou message Instagram.');
      }).catch(() => {
        this.showSuccess(`Code : ${this.referralCode}`);
      });
    });
  }

  demanderRetrait(): void {
    if (!this.retraitData.numeroMobile.trim()) {
      this.showError('Veuillez saisir votre numéro mobile.');
      return;
    }
    this.retraitLoading = true;
    this.utilisateurService.retraitCommission(this.userId, this.retraitData).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      this.retraitLoading = false;
      if (res !== null) {
        this.showSuccess('Demande de retrait envoyée avec succès !');
        this.showRetraitForm = false;
        this.retraitData = { numeroMobile: '', pays: 'BF', modePaiement: 'O' };
        this.loadData();
      } else {
        this.showError('Erreur lors de la demande de retrait.');
      }
    });
  }

  private buildFilleulsStats(): void {
    if (!this.filleuls.length) { this.filleulsStats = []; return; }

    // Grouper les commissions par idFilleul
    const commByFilleul = new Map<number, Commission[]>();
    for (const c of this.commissions) {
      if (c.idFilleul == null) continue;
      if (!commByFilleul.has(c.idFilleul)) commByFilleul.set(c.idFilleul, []);
      commByFilleul.get(c.idFilleul)!.push(c);
    }

    this.filleulsStats = this.filleuls.map(f => {
      const comms = commByFilleul.get(f.idUtilisateur) ?? [];
      const commissionGeneree = comms.reduce((s, c) => s + (c.montant || 0), 0);
      // montant = depot * 1% → depot = montant / 0.01
      const totalDepots = commissionGeneree / 0.01;
      return {
        idUtilisateur: f.idUtilisateur,
        nomUtilisateur: f.nomUtilisateur,
        prenomUtilisateur: f.prenomUtilisateur,
        numeroUtilisateur: f.numeroUtilisateur,
        nbDepots: comms.length,
        totalDepots,
        commissionGeneree,
      };
    });
  }

  private showSuccess(message: string): void {
    this.errorService.success(message);
  }

  private showError(message: string): void {
    this.errorService.toast(message, "danger", 5000);
  }
}
