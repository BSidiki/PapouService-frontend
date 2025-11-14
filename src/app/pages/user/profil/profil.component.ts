import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";
import { AuthService } from '../../../services/auth.service';
import { catchError, forkJoin, map, of } from 'rxjs';

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
    AnnoncesPublicComponent
  ],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit {
  private readonly API_HOSTS = [
    'http://192.168.11.124:8080',
  ];
  private api = this.API_HOSTS[0];

  user: any = {};
  afficherProfil = false;

  depotCount = 0;
  fidelityStars = '';
  isFidele = false;
  fidelityLevel = 0;
  private readonly fidelityStep = 5;

  saving = false;
  loadingFidelity = false;

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const u = this.auth.getUser();
    if (!u) {
      this.showError('Utilisateur non connecté.');
      return;
    }
    this.user = { ...u };
    this.chargerFidelite();
  }

  /** Calcule la fidélité en se basant sur les dépôts VALIDATED de ce user */
  private chargerFidelite() {
    this.loadingFidelity = true;

    const calls = this.API_HOSTS.map(h => this.http.get<any[]>(`${h}/depots`).pipe(
      catchError(() => of(null))
    ));

    forkJoin(calls).pipe(
      map(results => {
        const ok = results.find(r => Array.isArray(r));
        if (!ok) throw new Error('Aucun hôte ne répond');

        const idx = results.indexOf(ok);
        this.api = this.API_HOSTS[idx];

        const validDepots = ok.filter(d =>
          d?.transactionState === 'VALIDATED' &&
          d?.utilisateur?.numeroUtilisateur === this.user?.numeroUtilisateur
        );
        this.depotCount = validDepots.length;

        const stars = Math.min(5, Math.floor(this.depotCount / this.fidelityStep));
        this.fidelityStars = '★'.repeat(stars);
        this.fidelityLevel = stars;
        this.isFidele = stars === 5;
      }),
      catchError(() => {
        this.depotCount = 0;
        this.fidelityStars = '';
        this.fidelityLevel = 0;
        this.isFidele = false;
        return of(void 0);
      })
    ).subscribe(() => {
      this.loadingFidelity = false;
    });
  }

  toggleAffichage() {
    this.afficherProfil = !this.afficherProfil;
  }

  modifierProfil() {
    if (!this.user?.idUtilisateur) {
      this.showError('Utilisateur introuvable.');
      return;
    }

    this.saving = true;

    // Utiliser POST avec body JSON au lieu de params URL
    const userData = {
      nomUtilisateur: this.user.nomUtilisateur ?? '',
      prenomUtilisateur: this.user.prenomUtilisateur ?? '',
      numeroUtilisateur: this.user.numeroUtilisateur ?? '',
      id_1XBET: this.user.id_1XBET ?? '',
      id_BETWINNER: this.user.id_BETWINNER ?? '',
      id_MELBET: this.user.id_MELBET ?? '',
      id_1WIN: this.user.id_1WIN ?? '',
      id_888STARZ: this.user.id_888STARZ ?? ''
    };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.put<any>(`${this.api}/utilisateurs/update/${this.user.idUtilisateur}`, userData, { headers })
      .subscribe({
        next: (res) => {
          this.showSuccess('Profil mis à jour avec succès !');
          this.auth.saveUser(res ?? this.user);
          this.user = { ...(res ?? this.user) };
          this.chargerFidelite();
        },
        error: (err) => {
          console.error(err);
          this.showError('Erreur lors de la mise à jour du profil.');
        }
      }).add(() => this.saving = false);
  }

  getFidelityProgress(): number {
    return ((this.depotCount % this.fidelityStep) / this.fidelityStep) * 100;
  }

  getNextLevelDepots(): number {
    return this.fidelityStep - (this.depotCount % this.fidelityStep);
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
