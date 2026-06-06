import { ErrorService } from '../../../services/error.service';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Location } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

type Utilisateur = {
  idUtilisateur: number;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  numeroUtilisateur?: string;
  id_1XBET?: string;
  id_BETWINNER?: string;
  id_MELBET?: string;
  id_888STARZ?: string;
};

type Depot = {
  idDepot: number;
  montant: number;
  dateDepot?: string;
  transactionState?: 'PENDING'|'VALIDATED'|'REJECTED';
  utilisateur?: Utilisateur;
};

@Component({
  selector: 'app-admin-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin-client-detail.component.html',
  styleUrls: ['./admin-client-detail.component.scss']
})
export class AdminClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);
  private location = inject(Location);
  private errorService = inject(ErrorService);
  private readonly API = environment.apiBaseUrl;

  client: Utilisateur | null = null;
  isLoading = true;
  hasError = false;

  private readonly fidelityThresholds = [100_000, 1_000_000, 5_000_000, 10_000_000, 20_000_000];

  clientId: string | null = null;
  depotCount = 0;
  montantCumule = 0;
  fidelityStars = '';
  isFidele = false;

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    if (!this.clientId) {
      this.isLoading = false;
      this.hasError = true;
      return;
    }

    this.loadClientData();
  }

  private loadClientData(): void {
    const client$  = this.http.get<Utilisateur>(`${this.API}/utilisateurs/getuser/${this.clientId}`)
      .pipe(catchError(() => of(null as any)));

    const depots$  = this.http.get<Depot[]>(`${this.API}/depots`)
      .pipe(catchError(() => of([])));

    forkJoin({ client: client$, depots: depots$ }).subscribe({
      next: ({ client, depots }) => {
        this.client = client;
        if (!client) {
          this.hasError = true;
          this.isLoading = false;
          return;
        }

        this.calculateFidelity(client, depots);
        this.isLoading = false;
      },
      error: _ => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  private calculateFidelity(client: Utilisateur, depots: Depot[]): void {
    // 1) On tente par idUtilisateur (le plus fiable)
    let valides = depots.filter(d =>
      d.transactionState === 'VALIDATED' &&
      d.utilisateur?.idUtilisateur === client.idUtilisateur
    );

    // 2) Fallback par numéro si l'idUtilisateur est absent dans les dépôts
    if (valides.length === 0 && client.numeroUtilisateur) {
      valides = depots.filter(
        d => d.transactionState === 'VALIDATED' &&
             d.utilisateur?.numeroUtilisateur === client.numeroUtilisateur
      );
    }

    this.depotCount = valides.length;
    this.montantCumule = valides.reduce((sum, d) => sum + (d.montant ?? 0), 0);

    // ⭐ Fidélité basée sur le montant cumulé des dépôts validés (formule officielle Papou Service)
    const stars = this.fidelityThresholds.filter(t => this.montantCumule >= t).length;
    this.fidelityStars = '★'.repeat(stars);
    this.isFidele = stars === 5;
  }

  // Navigation methods
  voirHistorique() {
    this.router.navigate([`/admin/clients/${this.clientId}/historique`]);
  }

  voirDepots() {
    this.router.navigate([`/admin/clients/${this.clientId}/depots`]);
  }

  voirRetraits() {
    this.router.navigate([`/admin/clients/${this.clientId}/retraits`]);
  }

  goBack() {
    this.location.back();
  }

  supprimerClient(): void {
    if (!this.client) return;
    if (!confirm(`Supprimer définitivement le client ${this.getFullName()} ? Cette action est irréversible.`)) return;
    this.http.delete(`${this.API}/utilisateurs/delete/${this.client.idUtilisateur}`, { responseType: 'text' as 'json' }).subscribe({
      next: () => {
        this.errorService.info('Client supprimé avec succès.');
        this.router.navigate(['/admin/clients']);
      },
      error: () => this.errorService.info('Erreur lors de la suppression du client.')
    });
  }

  // Helper methods for template
  getFullName(): string {
    if (!this.client) return 'Non renseigné';
    const fullName = `${this.client.prenomUtilisateur || ''} ${this.client.nomUtilisateur || ''}`.trim();
    return fullName || 'Non renseigné';
  }

  getFidelityMessage(): string {
    const stars = this.fidelityStars.length;
    if (stars === 0) return 'Moins de 100 000 FCFA cumulés — Débutant';
    if (stars === 1) return '≥ 100 000 FCFA cumulés — Novice';
    if (stars === 2) return '≥ 1 000 000 FCFA cumulés — Intermédiaire';
    if (stars === 3) return '≥ 5 000 000 FCFA cumulés — Avancé';
    if (stars === 4) return '≥ 10 000 000 FCFA cumulés — Expert';
    return '≥ 20 000 000 FCFA cumulés — Maître';
  }

  hasPlatformIds(): boolean {
    if (!this.client) return false;
    return !!(this.client.id_1XBET || this.client.id_BETWINNER ||
              this.client.id_MELBET || this.client.id_888STARZ);
  }
}

