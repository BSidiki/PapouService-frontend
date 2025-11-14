import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

type TransactionState = 'PENDING' | 'VALIDATED' | 'REJECTED';

type Utilisateur = {
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  numeroUtilisateur?: string;
  id_1XBET?: string; id_BETWINNER?: string; id_MELBET?: string; id_1WIN?: string; id_888STARZ?: string;
};

type Depot = {
  idDepot: number;
  utilisateur?: Utilisateur;
  numeroEnvoyant?: string;
  montant?: number;
  optionDeTransaction?: string;
  dateDepot?: string;
  transactionState?: TransactionState;
};

type Retrait = {
  idRetrait: number;
  utilisateur?: Utilisateur;
  numeroEnvoyant?: string;
  montant?: number;
  optionDeTransaction?: string;
  dateRetrait?: string;
  transactionState?: TransactionState;
};

type Row = {
  type: 'DEPOT' | 'RETRAIT';
  id: number;
  utilisateur?: Utilisateur;
  numero: string;
  montant: number;
  plateforme: string;
  statut: TransactionState;
  date?: string | null;
  raw: Depot | Retrait;
};

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  templateUrl: './admin-transactions.component.html',
  styleUrls: ['./admin-transactions.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonModule
  ]
})
export class AdminTransactionsComponent implements OnInit, AfterViewInit {
  private readonly API = 'http://192.168.11.124:8080';

  type: 'ALL' | 'DEPOT' | 'RETRAIT' = 'ALL';
  statut = '';
  search = '';
  plateforme = '';
  loading = false;

  displayedColumns = ['type', 'nom', 'numero', 'montant', 'plateforme', 'statut', 'date', 'actions'];
  dataSource = new MatTableDataSource<Row>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  // ngAfterViewInit(): void {
  //   this.dataSource.paginator = this.paginator;
  //   this.dataSource.sort = this.sort;
  //   this.dataSource.sortingDataAccessor = (row: Row, column: string) => {
  //     switch (column) {
  //       case 'date': return this.parseTs(row.date ?? null);
  //       case 'montant': return row.montant;
  //       case 'nom': return this.nomComplet(row.utilisateur).toLowerCase();
  //       case 'plateforme': return row.plateforme?.toLowerCase() ?? '';
  //       default: return (row as any)[column];
  //     }
  //   };
  // }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (row: Row, column: string) => {
      switch (column) {
        case 'date': return this.parseTs(row.date ?? null);
        case 'montant': return row.montant;
        case 'nom': return this.nomComplet(row.utilisateur).toLowerCase();
        case 'plateforme': return row.plateforme?.toLowerCase() ?? '';
        default: return (row as any)[column];
      }
    };
  }

  private attachPagerSafely() {
    // petit délai pour laisser Angular insérer le paginator si *ngIf a bougé
    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
      // revenir page 1 si besoin
      this.paginator?.firstPage();
    });
  }

  dateOf(r: Row): string | null {
    return r.date ?? null;
  }

  nomComplet(u?: Utilisateur): string {
    return `${u?.prenomUtilisateur ?? ''} ${u?.nomUtilisateur ?? ''}`.trim();
  }

  private parseTs(d?: string | null): number {
    if (!d) return 0;
    const ts = Date.parse(d);
    return isNaN(ts) ? 0 : ts;
  }

  loadTransactions() {
    this.loading = true;

    forkJoin({
      depots: this.http.get<Depot[]>(`${this.API}/depots`),
      retraits: this.http.get<Retrait[]>(`${this.API}/retraits`)
    }).subscribe({
      next: ({ depots, retraits }) => {
        const rowsDepots: Row[] = (depots ?? []).map(d => ({
          type: 'DEPOT',
          id: d.idDepot,
          utilisateur: d.utilisateur,
          numero: d.numeroEnvoyant ?? d.utilisateur?.numeroUtilisateur ?? '—',
          montant: d.montant ?? 0,
          plateforme: (d.optionDeTransaction ?? '—').toString().toUpperCase(),
          statut: d.transactionState ?? 'PENDING',
          date: d.dateDepot ?? null,
          raw: d
        }));

        const rowsRetraits: Row[] = (retraits ?? []).map(r => ({
          type: 'RETRAIT',
          id: r.idRetrait,
          utilisateur: r.utilisateur,
          numero: r.numeroEnvoyant ?? r.utilisateur?.numeroUtilisateur ?? '—',
          montant: r.montant ?? 0,
          plateforme: (r.optionDeTransaction ?? '—').toString().toUpperCase(),
          statut: r.transactionState ?? 'PENDING',
          date: r.dateRetrait ?? null,
          raw: r
        }));

        const all = [...rowsDepots, ...rowsRetraits]
          .sort((a, b) => this.parseTs(b.date) - this.parseTs(a.date));
          // .sort((a, b) => (new Date(b.date ?? 0).getTime()) - (new Date(a.date ?? 0).getTime()));

          this.dataSource.data = all;
          this.setupFilterPredicate();
          this.applyFilter();   // déclenche le filtrage
          this.attachPagerSafely();   // ✅ ré-attache le paginator
          this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.dataSource.data = [];
        this.loading = false;
      }
    });
  }

  private setupFilterPredicate() {
    this.dataSource.filterPredicate = (row: Row, filter: string) => {
      const matchesType = this.type === 'ALL' || row.type === this.type;
      const matchesStatut = !this.statut || row.statut === this.statut;
      const matchesPlateforme = !this.plateforme || row.plateforme === this.plateforme;

      const searchText = this.search.toLowerCase().trim();
      const matchesSearch = !searchText ||
        this.nomComplet(row.utilisateur).toLowerCase().includes(searchText) ||
        (row.numero?.toLowerCase() ?? '').includes(searchText) ||
        String(row.montant).includes(searchText) ||
        row.plateforme.toLowerCase().includes(searchText) ||
        row.type.toLowerCase().includes(searchText);

      return matchesType && matchesStatut && matchesPlateforme && matchesSearch;
    };
  }

  applyFilter() {
    this.dataSource.filter = Math.random().toString();
    this.dataSource.filter = Math.random().toString();
    this.attachPagerSafely();
  }

  voirDetails(r: Row) {
    if (r.type === 'DEPOT') {
      this.router.navigate(['/user/depot', r.id]);
    } else {
      this.router.navigate(['/user/retrait', r.id]);
    }
  }

  getTotalTransactions(): number {
    return this.dataSource.data.length;
  }

  getDepotCount(): number {
    return this.dataSource.data.filter(t => t.type === 'DEPOT').length;
  }

  getRetraitCount(): number {
    return this.dataSource.data.filter(t => t.type === 'RETRAIT').length;
  }

  getStatusClass(statut: TransactionState): string {
    switch (statut) {
      case 'PENDING': return 'pending';
      case 'VALIDATED': return 'validated';
      case 'REJECTED': return 'rejected';
      default: return '';
    }
  }

  get pagedFilteredData(): Row[] {
    const data = this.dataSource.filteredData ?? [];
    const start = (this.paginator?.pageIndex ?? 0) * (this.paginator?.pageSize ?? data.length);
    const end = start + (this.paginator?.pageSize ?? data.length);
    return data.slice(start, end);
  }

  trackById(_i: number, r: Row) { return r.type + '-' + r.id; }

  resetFilters(): void {
    this.type = 'ALL';
    this.statut = '';
    this.search = '';
    this.plateforme = '';
    this.applyFilter();
  }
}
