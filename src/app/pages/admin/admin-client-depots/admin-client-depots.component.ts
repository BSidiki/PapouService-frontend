import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Location } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';

type TransactionState = 'PENDING' | 'VALIDATED' | 'REJECTED';
type Platform = 'IXBET'|'BETWINNER'|'MELBET'|'IWIN'|'STARZ'|'—';

type Depot = {
  idDepot: number;
  montant: number;
  numeroEnvoyant?: string;
  pays?: string;
  optionDeTransaction?: Platform;
  dateDepot?: string;
  transactionState?: TransactionState;
};

@Component({
  selector: 'app-admin-client-depots',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTableModule // AJOUT IMPORTANT
  ],
  templateUrl: './admin-client-depots.component.html',
  styleUrls: ['./admin-client-depots.component.scss']
})
export class AdminClientDepotsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);
  private location = inject(Location);

  private readonly API = 'http://192.168.11.124:8080';

  clientId!: string;
  depots: Depot[] = [];
  q = '';
  statusFilter: 'ALL' | TransactionState = 'ALL';
  pageSize = 10;
  pageIndex = 0;
  length = 0;
  pagedDepots: Depot[] = [];
  loading = false;
  error = false;

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  // CHANGÉ DE PRIVATE À PUBLIC POUR LE TEMPLATE
  load(): void {
    this.loading = true;
    this.error = false;

    this.http
      .get<Depot[]>(`${this.API}/utilisateurs/${this.clientId}/listDepots`)
      .subscribe({
        next: (data) => {
          const list: Depot[] = (data ?? []).map(d => ({
            ...d,
            optionDeTransaction: this.normalizePlatform(d.optionDeTransaction)
          }));

          list.sort((a, b) => {
            const da = a.dateDepot ? new Date(a.dateDepot).getTime() : 0;
            const db = b.dateDepot ? new Date(b.dateDepot).getTime() : 0;
            if (db !== da) return db - da;
            return (b.idDepot || 0) - (a.idDepot || 0);
          });

          this.depots = list;
          this.applyAll(true);
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.error = true;
          this.loading = false;
        }
      });
  }

  private normalizePlatform(p?: string): Platform {
    if (!p) return '—';
    const up = p.toUpperCase();
    if (up === '1XBET' || up === 'IXBET') return 'IXBET';
    if (up === 'BETWINNER') return 'BETWINNER';
    if (up === 'MELBET') return 'MELBET';
    if (up === '1WIN' || up === 'IWIN') return 'IWIN';
    if (up === '888STARZ' || up === 'STARZ') return 'STARZ';
    return '—';
  }

  // CHANGÉ DE PRIVATE À PUBLIC POUR LE TEMPLATE
  applyAll(resetPage = false) {
    const q = (this.q || '').trim().toLowerCase();

    let filtered = !q
      ? this.depots
      : this.depots.filter(d => {
          const numero = (d.numeroEnvoyant || '').toLowerCase();
          const pays   = (d.pays || '').toLowerCase();
          const plat   = (d.optionDeTransaction || '').toLowerCase();
          return numero.includes(q) || pays.includes(q) || plat.includes(q);
        });

    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(d => d.transactionState === this.statusFilter);
    }

    this.length = filtered.length;
    if (resetPage) this.pageIndex = 0;

    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedDepots = filtered.slice(start, end);
  }

  onSearchChange() {
    this.applyAll(true);
  }

  onStatusChange() {
    this.applyAll(true);
  }

  onPageChange(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.applyAll(false);
  }

  voirDetails(id: number) {
    this.router.navigate(['/user/depot', id]);
  }

  goBack() {
    this.location.back();
  }

  formatNumero(num?: string): string {
    if (!num) return '—';
    const digits = num.replace(/\s+/g, '');
    return digits.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }

  // New helper methods
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

  getTotalDepots(): number {
    return this.depots.length;
  }

  getValidatedDepots(): number {
    return this.depots.filter(d => d.transactionState === 'VALIDATED').length;
  }

  getPendingDepots(): number {
    return this.depots.filter(d => d.transactionState === 'PENDING').length;
  }

  getRejectedDepots(): number {
    return this.depots.filter(d => d.transactionState === 'REJECTED').length;
  }

  resetFilters(): void {
    this.q = '';
    this.statusFilter = 'ALL';
    this.applyAll(true);
  }

  trackByDepot = (_: number, d: Depot) => d.idDepot;
}
