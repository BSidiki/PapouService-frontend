import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';

type TransactionState = 'PENDING' | 'VALIDATED' | 'REJECTED';

interface Utilisateur {
  idUtilisateur: number;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  numeroUtilisateur: string;
}

interface Retrait {
  idRetrait: number;
  montant: number;
  numeroEnvoyant: string;
  pays: string;
  optionDeTransaction: string;
  dateRetrait?: string;
  transactionState?: TransactionState;
  utilisateur?: Utilisateur;
}

@Component({
  selector: 'app-admin-client-retraits',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTableModule
  ],
  templateUrl: './admin-client-retraits.component.html',
  styleUrls: ['./admin-client-retraits.component.scss']
})
export class AdminClientRetraitsComponent implements OnInit {
  private readonly API = 'http://192.168.11.124:8080';

  clientId!: string;
  loading = false;
  errorMsg = '';

  // Données brutes
  retraits: Retrait[] = [];

  // Filtre statut
  statusFilter: 'ALL' | TransactionState = 'ALL';

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  length = 0;

  // Données affichées (après filtre + pagination)
  pagedRetraits: Retrait[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id')!;
    this.fetchRetraits();
  }

  // Changé de private à public pour le template
  fetchRetraits() {
    this.loading = true;
    this.errorMsg = '';
    this.http
      .get<Retrait[]>(`${this.API}/utilisateurs/${this.clientId}/listRetraits`)
      .subscribe({
        next: (data) => {
          // tri : date décroissante puis id
          this.retraits = (data ?? []).slice().sort((a, b) => {
            const da = a.dateRetrait ? new Date(a.dateRetrait).getTime() : 0;
            const db = b.dateRetrait ? new Date(b.dateRetrait).getTime() : 0;
            if (db !== da) return db - da;
            return (b.idRetrait || 0) - (a.idRetrait || 0);
          });

          this.applyFilterAndPaginate(true);
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.errorMsg = 'Erreur lors du chargement des retraits.';
          this.loading = false;
        }
      });
  }

  /** Applique le filtre par statut et calcule la page courante */
  // Changé de private à public pour le template
  applyFilterAndPaginate(resetPage = false) {
    const filtered =
      this.statusFilter === 'ALL'
        ? this.retraits
        : this.retraits.filter(r => r.transactionState === this.statusFilter);

    this.length = filtered.length;

    if (resetPage) this.pageIndex = 0;

    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedRetraits = filtered.slice(start, end);
  }

  onStatusChange() {
    this.applyFilterAndPaginate(true);
  }

  onPageChange(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.applyFilterAndPaginate(false);
  }

  voirDetails(id: number) {
    this.router.navigate(['/user/retrait', id]);
  }

  goBack() {
    this.location.back();
  }

  trackByRetrait = (_: number, r: Retrait) => r.idRetrait;

  formatNumero(num: string | undefined): string {
    if (!num) return '—';
    const digits = num.replace(/\s+/g, '');
    return digits.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }

  // Nouvelles méthodes helper
  getStatusClass(status?: TransactionState): string {
    switch (status) {
      case 'PENDING': return 'pending';
      case 'VALIDATED': return 'validated';
      case 'REJECTED': return 'rejected';
      default: return '';
    }
  }

  getStatusText(status?: TransactionState): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'VALIDATED': return 'Validé';
      case 'REJECTED': return 'Rejeté';
      default: return '—';
    }
  }

  getTotalRetraits(): number {
    return this.retraits.length;
  }

  getValidatedRetraits(): number {
    return this.retraits.filter(r => r.transactionState === 'VALIDATED').length;
  }

  getPendingRetraits(): number {
    return this.retraits.filter(r => r.transactionState === 'PENDING').length;
  }

  getRejectedRetraits(): number {
    return this.retraits.filter(r => r.transactionState === 'REJECTED').length;
  }

  resetFilters(): void {
    this.statusFilter = 'ALL';
    this.applyFilterAndPaginate(true);
  }
}
