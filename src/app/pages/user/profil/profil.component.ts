import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";
import { ErrorService } from '../../../services/error.service';
import { AuthService } from '../../../services/auth.service';
import { DepotService } from '../../../services/depot.service';
import { UtilisateurService } from '../../../services/utilisateur.service';
import { catchError, of, map, finalize } from 'rxjs';
import { FooterComponent } from "../../../layout/footer/footer.component";

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    AnnoncesPublicComponent,
    FooterComponent
],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit {
  user: any = {};
  afficherProfil = false;

  fidelityStars = '';
  isFidele = false;
  fidelityLevel = 0;
  private totalDepotAmount = 0;
  private readonly fidelityThresholds = [100_000, 1_000_000, 5_000_000, 10_000_000, 20_000_000];

  saving = false;
  loadingFidelity = false;

  // Changement de mot de passe
  showPasswordForm = false;
  passwordData = { ancienPassword: '', nouveauPassword: '', confirmPassword: '' };
  savingPassword = false;

  constructor(
    private auth: AuthService,
    private depotService: DepotService,
    private utilisateurService: UtilisateurService, private errorService: ErrorService) {}

  ngOnInit(): void {
    const u = this.auth.getUser();
    if (!u) {
      this.showError('Utilisateur non connecté.');
      return;
    }
    this.user = { ...u };
    this.chargerFidelite();
  }

  private chargerFidelite(): void {
    this.loadingFidelity = true;

    this.depotService.getAll().pipe(
      map((depots) => {
        const validDepots = (depots ?? []).filter(d =>
          d?.transactionState === 'VALIDATED' &&
          d?.utilisateur?.numeroUtilisateur === this.user?.numeroUtilisateur
        );

        this.totalDepotAmount = validDepots.reduce((sum, d) => sum + (d.montant ?? 0), 0);

        const stars = this.fidelityThresholds.filter(t => this.totalDepotAmount >= t).length;
        this.fidelityStars = '★'.repeat(stars);
        this.fidelityLevel = stars;
        this.isFidele = stars === 5;
      }),
      catchError((err) => {
        this.totalDepotAmount = 0;
        this.fidelityStars = '';
        this.fidelityLevel = 0;
        this.isFidele = false;
        this.showError('Impossible de charger la fidélité.');
        return of(void 0);
      }),
      finalize(() => {
        this.loadingFidelity = false;
      })
    ).subscribe();
  }

  toggleAffichage(): void {
    this.afficherProfil = !this.afficherProfil;
  }

  modifierProfil(): void {
    if (!this.user?.idUtilisateur) {
      this.showError('Utilisateur introuvable.');
      return;
    }

    this.saving = true;

    const userData = {
      nomUtilisateur: this.user.nomUtilisateur ?? '',
      prenomUtilisateur: this.user.prenomUtilisateur ?? '',
      numeroUtilisateur: this.user.numeroUtilisateur ?? '',
      id_1XBET: this.user.id_1XBET ?? '',
      id_BETWINNER: this.user.id_BETWINNER ?? '',
      id_MELBET: this.user.id_MELBET ?? '',
      id_888STARZ: this.user.id_888STARZ ?? ''
    };

    this.utilisateurService.update(this.user.idUtilisateur, userData)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          this.showSuccess('Profil mis à jour avec succès !');
          this.auth.saveUser(res ?? this.user);
          this.user = { ...(res ?? this.user) };
          this.chargerFidelite();
        },
        error: (err) => {
          this.showError('Erreur lors de la mise à jour du profil.');
        }
      });
  }

  getFidelityProgress(): number {
    if (this.fidelityLevel >= 5) return 100;
    const lower = this.fidelityLevel === 0 ? 0 : this.fidelityThresholds[this.fidelityLevel - 1];
    const upper = this.fidelityThresholds[this.fidelityLevel];
    return Math.min(100, ((this.totalDepotAmount - lower) / (upper - lower)) * 100);
  }

  changerMotDePasse(): void {
    if (!this.passwordData.ancienPassword || !this.passwordData.nouveauPassword || !this.passwordData.confirmPassword) {
      this.showError('Veuillez remplir tous les champs.');
      return;
    }
    if (this.passwordData.nouveauPassword !== this.passwordData.confirmPassword) {
      this.showError('Le nouveau mot de passe et la confirmation ne correspondent pas.');
      return;
    }
    if (!this.user?.idUtilisateur) {
      this.showError('Utilisateur introuvable.');
      return;
    }

    this.savingPassword = true;
    this.utilisateurService.changePassword(this.user.idUtilisateur, this.passwordData)
      .pipe(finalize(() => (this.savingPassword = false)))
      .subscribe({
        next: () => {
          this.showSuccess('Mot de passe modifié avec succès !');
          this.showPasswordForm = false;
          this.passwordData = { ancienPassword: '', nouveauPassword: '', confirmPassword: '' };
        },
        error: () => this.showError('Erreur lors du changement de mot de passe. Vérifiez l\'ancien mot de passe.')
      });
  }

  private showSuccess(message: string): void {
    this.errorService.success(message);
  }

  private showError(message: string): void {
    this.errorService.toast(message, "danger", 5000);
  }
}
