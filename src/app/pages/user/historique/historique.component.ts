import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AuthService } from './../../../services/auth.service';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";
import { catchError, forkJoin, from, map, mergeMap, of, tap, toArray } from 'rxjs';

type TransactionType = 'DEPOT'|'RETRAIT';
type Statut = 'PENDING'|'VALIDATED'|'REJECTED'|undefined;

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatSelectModule, FormsModule, AnnoncesPublicComponent],
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.scss']
})
export class HistoriqueComponent implements OnInit {
  // === CONFIG API (si tu as plusieurs hôtes, ajoute-les ici et on garde le 1er qui répond)
  private readonly API_HOSTS = [
    'http://192.168.11.124:8080',
    // 'http://192.168.11.121:8080',
  ];
  private api = this.API_HOSTS[0];

  historiques: any[] = [];
  filteredHistoriques: any[] = [];

  filter: 'ALL'|TransactionType = 'ALL';
  statusFilter: 'ALL'|'PENDING'|'VALIDATED'|'REJECTED' = 'ALL';
  userId = 0;

  loading = false;
  errorMsg = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {
    const user = this.auth.getUser();
    if (user) this.userId = user.idUtilisateur;
  }

  ngOnInit(): void {
    this.fetchHistorique();
  }

  // ---------- LOAD ----------
  private fetchHistorique(): void {
    if (!this.userId) {
      this.errorMsg = 'Utilisateur non connecté.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    // 1) On récupère la liste brute (id_transaction + type)
    this.http.get<any[]>(`${this.api}/utilisateurs/${this.userId}/historiques`).pipe(
      map(list => list?.slice()?.sort((a, b) => (b.id_transaction ?? 0) - (a.id_transaction ?? 0)) || []),
      // 2) Pour chaque élément, on charge les détails avec une concurrence limitée à 5
      mergeMap(list => {
        if (!list.length) return of([] as any[]);

        return from(list).pipe(
          mergeMap(item => this.fetchDetailsForItem(item), 5),
          toArray()
        );
      }),
      tap(rows => {
        this.historiques = rows;
        this.applyFilter();
      }),
      catchError(err => {
        console.error(err);
        this.errorMsg = 'Erreur lors du chargement des historiques.';
        return of([]);
      })
    ).subscribe({
      complete: () => this.loading = false
    });
  }

  private fetchDetailsForItem(item: any) {
    const type: TransactionType = item.transaction === 'DEPOT' ? 'DEPOT' : 'RETRAIT';
    const id = item.id_transaction;

    const endpoint = type === 'DEPOT'
      ? `/depots/${id}`
      : `/retraits/${id}`;

    return this.getWithFallback<any>(endpoint).pipe(
      map(details => {
        const date = details?.dateDepot || details?.dateRetrait || null;
        const statut: Statut = details?.transactionState;
        return {
          ...item,
          transaction: type,
          date,
          utilisateur: details?.utilisateur,
          details,
          statut
        };
      }),
      catchError(() => {
        // si un détail échoue, on garde au moins la ligne d’historique
        return of({
          ...item,
          transaction: type,
          date: null,
          utilisateur: null,
          details: null,
          statut: undefined as Statut
        });
      })
    );
  }

  // ---------- Filtres ----------
  applyFilter() {
    this.filteredHistoriques = this.historiques.filter(h => {
      const okType = this.filter === 'ALL' || h.transaction === this.filter;
      const okStatut = this.statusFilter === 'ALL' || h.statut === this.statusFilter;
      return okType && okStatut;
    });
  }

  // ---------- Navigation ----------
  goToDetails(transaction: any) {
    if (transaction.transaction === 'DEPOT') {
      this.router.navigate(['/user/depot', transaction.id_transaction]);
    } else if (transaction.transaction === 'RETRAIT') {
      this.router.navigate(['/user/retrait', transaction.id_transaction]);
    }
  }

  // ---------- Helpers API avec fallback hôte ----------
  private getWithFallback<T>(path: string) {
    const calls = this.API_HOSTS.map(h => this.http.get<T>(`${h}${path}`).pipe(catchError(() => of(null as any))));
    // Essaye chaque host jusqu’à obtenir une réponse non-nulle
    return forkJoin(calls).pipe(
      map(results => {
        const ok = results.find(r => r !== null && r !== undefined);
        if (ok == null) throw new Error('Tous les hôtes ont échoué');
        // mémorise le premier hôte qui a répondu pour les prochains appels
        const idx = results.indexOf(ok);
        this.api = this.API_HOSTS[idx];
        return ok as T;
      })
    );
  }
}
