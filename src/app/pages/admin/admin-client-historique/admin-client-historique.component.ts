import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, map, of } from 'rxjs';

type TransactionType = 'DEPOT' | 'RETRAIT';
type Statut = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'INCONNU';

@Component({
  selector: 'app-admin-client-historique',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './admin-client-historique.component.html',
  styleUrls: ['./admin-client-historique.component.scss']
})
export class AdminClientHistoriqueComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);

  private readonly API = 'http://192.168.11.124:8080';

  historiques: any[] = [];
  filtered: any[] = [];

  // Propriétés pour les statistiques
  totalTransactions = 0;
  depotsCount = 0;
  retraitsCount = 0;

  filterType: 'ALL' | TransactionType = 'ALL';
  statusFilter: 'ALL' | Statut = 'ALL';

  clientId!: string;
  userId = 0;

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user) this.userId = user.idUtilisateur;

    this.clientId = this.route.snapshot.paramMap.get('id')!;

    this.http.get<any[]>(`${this.API}/utilisateurs/${this.clientId}/historiques`).subscribe({
      next: (data) => {
        this.historiques = (data ?? []).sort((a, b) => b.id_transaction - a.id_transaction);

        // Calculer les statistiques
        this.calculateStats();

        const detailRequests = this.historiques.map(item => {
          const url = item.transaction === 'DEPOT'
            ? `${this.API}/depots/${item.id_transaction}`
            : `${this.API}/retraits/${item.id_transaction}`;

          return this.http.get<any>(url).pipe(
            map(details => ({
              ...item,
              date: details.dateDepot || details.dateRetrait || null,
              utilisateur: details.utilisateur,
              details,
              statut: (details.transactionState as Statut) ?? 'INCONNU'
            }))
          );
        });

        forkJoin(detailRequests.length ? detailRequests : [of([])]).subscribe({
          next: (items: any) => {
            this.historiques = Array.isArray(items) ? items : [];
            this.calculateStats(); // Recalculer après chargement des détails
            this.applyFilter();
          },
          error: () => {
            this.historiques = this.historiques.map(it => ({
              ...it,
              details: {},
              date: null,
              statut: 'INCONNU' as Statut
            }));
            this.calculateStats();
            this.applyFilter();
          }
        });
      },
      error: (err) => {
        console.error(err);
        alert('Erreur lors du chargement des historiques');
      }
    });
  }

  // Méthode pour calculer les statistiques
  private calculateStats(): void {
    this.totalTransactions = this.historiques.length;
    this.depotsCount = this.historiques.filter(t => t.transaction === 'DEPOT').length;
    this.retraitsCount = this.historiques.filter(t => t.transaction === 'RETRAIT').length;
  }

  applyFilter(): void {
    this.filtered = this.historiques.filter((t: any) => {
      const matchType = this.filterType === 'ALL' || t.transaction === this.filterType;
      const matchStatus = this.statusFilter === 'ALL' || t.statut === this.statusFilter;
      return matchType && matchStatus;
    });
  }

  // Méthode pour obtenir l'icône de transaction
  getTransactionIcon(transactionType: string): string {
    return transactionType === 'DEPOT' ? '💸' : '💼';
  }

  // Méthode pour obtenir le texte du statut
  getStatusText(statut: Statut): string {
    switch (statut) {
      case 'PENDING': return 'En attente';
      case 'VALIDATED': return 'Validé';
      case 'REJECTED': return 'Rejeté';
      default: return 'Inconnu';
    }
  }

  voirDetails(item: any): void {
    const base = item.transaction === 'DEPOT' ? '/user/depot' : '/user/retrait';
    this.router.navigate([base, item.id_transaction]);
  }

  goBack(): void {
    this.location.back();
  }
}
