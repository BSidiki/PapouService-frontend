import { Component, OnInit, AfterViewInit, ViewChild, Inject, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { MatCardModule } from "@angular/material/card";
import { Router } from '@angular/router';
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

type Role = { name: string };
type Utilisateur = {
  idUtilisateur: number;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  id_1XBET?: string; id_BETWINNER?: string; id_MELBET?: string; id_1WIN?: string; id_888STARZ?: string;
  roles?: Role[];
};

type Platform = 'IXBET' | 'BETWINNER' | 'MELBET' | 'IWIN' | 'STARZ' | '—';
type TransactionState = 'PENDING' | 'VALIDATED' | 'REJECTED';

type Depot = {
  idDepot: number;
  montant: number;
  numeroEnvoyant?: string;
  dateDepot?: string;
  optionDeTransaction?: string;
  utilisateur?: Utilisateur;
  transactionState?: TransactionState;
  capture?: string;
};

type Retrait = {
  idRetrait: number;
  montant: number;
  numeroEnvoyant?: string;
  dateRetrait?: string;
  optionDeTransaction?: string;
  utilisateur?: Utilisateur;
  transactionState?: TransactionState;
  file?: string;
};

type Row = {
  type: 'Dépôt' | 'Retrait';
  id: number;
  userId: number;
  nom: string;
  numero: string;
  plateforme: Platform;
  idPlateforme: string;
  montant: number;
  date?: string;
  capture?: string | null;
  statut: TransactionState;
  dateTimestamp?: number; // Pour le tri par date
};

interface FilterState {
  type: 'ALL' | 'Dépôt' | 'Retrait';
  plateforme: 'ALL' | Platform;
  statut: 'ALL' | TransactionState;
  search: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    CommonModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatButtonModule, MatSnackBarModule, MatDialogModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, FormsModule,
    NgChartsModule, MatCardModule,
    MatIconModule, MatMenuModule, MatTooltipModule
  ]
})
export class DashboardComponent implements OnInit, AfterViewInit {

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  private readonly API = 'http://192.168.11.124:8080';

  // UI
  loading = false;
  error = false;
  lastUpdated: string | null = null;
  totalDepotsValides = 0;
  totalRetraitsValides = 0;
  depotsPendingCount = 0;
  retraitsPendingCount = 0;
  nombreClients = 0;
  filtersExpanded = false;

  dataSource = new MatTableDataSource<Row>();
  displayedColumns: string[] = ['type', 'nom', 'numero', 'plateforme', 'idPlateforme', 'montant', 'date', 'capture', 'actions'];

  // Filtres améliorés
  filters: FilterState = {
    type: 'ALL',
    plateforme: 'ALL',
    statut: 'ALL',
    search: ''
  };

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  donutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Dépôts validés', 'Retraits validés'],
    datasets: [{ data: [0, 0], backgroundColor: ['#4caf50', '#f44336'] }]
  };

  allRows: Row[] = [];

  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Dépôts (PENDING)',
        data: [],
        tension: 0.25,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)'
      },
      {
        label: 'Retraits (PENDING)',
        data: [],
        tension: 0.25,
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)'
      }
    ]
  };

  ngOnInit(): void {
    this.refresh();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    // Tri personnalisé pour les dates
    this.dataSource.sortingDataAccessor = (item: Row, property: string) => {
      switch (property) {
        case 'date':
          return item.dateTimestamp || 0;
        case 'montant':
          return item.montant;
        case 'nom':
          return item.nom.toLowerCase();
        case 'type':
          return item.type;
        case 'plateforme':
          return item.plateforme;
        case 'statut':
          return item.statut;
        default:
          return (item as any)[property];
      }
    };
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

  private getUserPlatformId(p?: Platform, u?: Utilisateur): string {
    if (!u || !p) return '—';
    switch (p) {
      case 'IXBET': return u.id_1XBET || '—';
      case 'BETWINNER': return u.id_BETWINNER || '—';
      case 'MELBET': return u.id_MELBET || '—';
      case 'IWIN': return u.id_1WIN || '—';
      case 'STARZ': return u.id_888STARZ || '—';
      default: return '—';
    }
  }

  refresh(): void {
    this.loading = true;
    this.error = false;

    const depots$ = this.http.get<Depot[]>(`${this.API}/depots`).pipe(catchError(() => of([])));
    const retraits$ = this.http.get<Retrait[]>(`${this.API}/retraits`).pipe(catchError(() => of([])));
    const users$ = this.http.get<Utilisateur[]>(`${this.API}/utilisateurs`).pipe(catchError(() => of([])));

    forkJoin({ depots: depots$, retraits: retraits$, users: users$ })
      .pipe(finalize(() => {
        this.loading = false;
        this.lastUpdated = formatDate(new Date(), 'dd/MM/yyyy HH:mm', 'fr');
      }))
      .subscribe(({ depots, retraits, users }) => {
        // Calcul des statistiques
        this.totalDepotsValides = depots
          .filter(d => d.transactionState === 'VALIDATED')
          .reduce((s, d) => s + (d.montant || 0), 0);

        this.totalRetraitsValides = retraits
          .filter(r => r.transactionState === 'VALIDATED')
          .reduce((s, r) => s + (r.montant || 0), 0);

        // Comptes PENDING
        const pendingDepots = depots.filter(d => d.transactionState === 'PENDING');
        const pendingRetraits = retraits.filter(r => r.transactionState === 'PENDING');
        this.depotsPendingCount = pendingDepots.length;
        this.retraitsPendingCount = pendingRetraits.length;

        // Mise à jour du graphique donut
        this.donutChartData = {
          labels: ['Dépôts validés', 'Retraits validés'],
          datasets: [{
            data: [this.totalDepotsValides, this.totalRetraitsValides],
            backgroundColor: ['#4caf50', '#f44336']
          }]
        };

        // Construction des rows avec timestamp
        const depotRows: Row[] = pendingDepots.map(d => {
          const plat = this.normalizePlatform(d.optionDeTransaction);
          const nom = `${d.utilisateur?.prenomUtilisateur ?? ''} ${d.utilisateur?.nomUtilisateur ?? ''}`.trim() || '—';
          const userId = d.utilisateur?.idUtilisateur || this.findUserIdFromData(d, users);

          return {
            type: 'Dépôt',
            id: d.idDepot,
            userId: userId,
            nom,
            numero: d.numeroEnvoyant ?? '—',
            plateforme: plat,
            idPlateforme: this.getUserPlatformId(plat, d.utilisateur),
            montant: d.montant ?? 0,
            date: d.dateDepot,
            dateTimestamp: d.dateDepot ? new Date(d.dateDepot).getTime() : 0,
            capture: d.capture ?? null,
            statut: d.transactionState ?? 'PENDING'
          };
        });

        const retraitRows: Row[] = pendingRetraits.map(r => {
          const plat = this.normalizePlatform(r.optionDeTransaction);
          const nom = `${r.utilisateur?.prenomUtilisateur ?? ''} ${r.utilisateur?.nomUtilisateur ?? ''}`.trim() || '—';
          const userId = r.utilisateur?.idUtilisateur || this.findUserIdFromData(r, users);

          return {
            type: 'Retrait',
            id: r.idRetrait,
            userId: userId,
            nom,
            numero: r.numeroEnvoyant ?? '—',
            plateforme: plat,
            idPlateforme: this.getUserPlatformId(plat, r.utilisateur),
            montant: r.montant ?? 0,
            date: r.dateRetrait,
            dateTimestamp: r.dateRetrait ? new Date(r.dateRetrait).getTime() : 0,
            capture: r.file ?? null,
            statut: r.transactionState ?? 'PENDING'
          };
        });

        // Filtrer les rows qui ont un userId valide
        this.allRows = [...depotRows, ...retraitRows].filter(row => row.userId > 0);
        this.applyFilters();

        // Nombre de clients
        this.nombreClients = users.length;

        // Courbe volumes PENDING
        this.buildVolumesSeries(pendingDepots, pendingRetraits);
      }, error => {
        console.error('Erreur lors du chargement:', error);
        this.error = true;
        this.dataSource.data = [];
        this.snackBar.open('Erreur de chargement des données.', 'Fermer', { duration: 3000 });
      });
  }

  private findUserIdFromData(transaction: any, users: Utilisateur[]): number {
    if (transaction.idUtilisateur) {
      return transaction.idUtilisateur;
    }

    if (transaction.utilisateur?.idUtilisateur) {
      return transaction.utilisateur.idUtilisateur;
    }

    if (transaction.utilisateur) {
      const foundUser = users.find(u =>
        u.nomUtilisateur === transaction.utilisateur.nomUtilisateur &&
        u.prenomUtilisateur === transaction.utilisateur.prenomUtilisateur
      );
      if (foundUser) {
        return foundUser.idUtilisateur;
      }
    }

    return 0;
  }

  private buildVolumesSeries(deps: Depot[], rets: Retrait[]) {
    const group = (arr: { montant?: number }[], dateGetter: (e: any) => string | undefined) => {
      const m = new Map<string, number>();
      arr.forEach(e => {
        const raw = dateGetter(e);
        if (!raw) return;
        try {
          const key = formatDate(raw, 'yyyy-MM-dd', 'fr');
          m.set(key, (m.get(key) || 0) + (e.montant || 0));
        } catch (error) {
          console.warn('Erreur de formatage de date:', raw, error);
        }
      });
      return m;
    };

    const depMap = group(deps, (e: any) => e.dateDepot);
    const retMap = group(rets, (e: any) => e.dateRetrait);

    const allDays = Array.from(new Set([...depMap.keys(), ...retMap.keys()])).sort();

    const labels = allDays.map(d => {
      try {
        return formatDate(d, 'dd/MM', 'fr');
      } catch (error) {
        return d;
      }
    });

    const depData = allDays.map(d => depMap.get(d) || 0);
    const retData = allDays.map(d => retMap.get(d) || 0);

    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Dépôts (PENDING)',
          data: depData,
          tension: 0.25,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)'
        },
        {
          label: 'Retraits (PENDING)',
          data: retData,
          tension: 0.25,
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)'
        }
      ]
    };
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error){
      return dateString || '—';
    }
  }

  applyFilters(): void {
    let filtered = this.allRows;

    // Filtre par type
    if (this.filters.type !== 'ALL') {
      filtered = filtered.filter(r => r.type === this.filters.type);
    }

    // Filtre par plateforme
    if (this.filters.plateforme !== 'ALL') {
      filtered = filtered.filter(r => r.plateforme === this.filters.plateforme);
    }

    // Filtre par statut
    if (this.filters.statut !== 'ALL') {
      filtered = filtered.filter(r => r.statut === this.filters.statut);
    }

    // Filtre de recherche
    if (this.filters.search.trim()) {
      const searchTerm = this.filters.search.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.nom.toLowerCase().includes(searchTerm) ||
        r.numero.includes(searchTerm) ||
        r.idPlateforme.toLowerCase().includes(searchTerm) ||
        r.montant.toString().includes(searchTerm)
      );
    }

    this.dataSource.data = filtered;

    // Réinitialiser la pagination
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = {
      type: 'ALL',
      plateforme: 'ALL',
      statut: 'ALL',
      search: ''
    };
    this.applyFilters();
  }

  traiter(row: Row, etat: 'VALIDATED' | 'REJECTED') {
    if (!row.userId || row.userId <= 0) {
      this.snackBar.open('Erreur : Utilisateur introuvable pour cette transaction', 'Fermer', { duration: 5000 });
      return;
    }

    if (etat === 'REJECTED') {
      const dialogRef = this.dialog.open(MotifRejetDialogComponent, {
        width: '400px',
        data: { type: row.type }
      });

      dialogRef.afterClosed().subscribe(motif => {
        if (motif) {
          const url = row.type === 'Dépôt'
            ? `${this.API}/depots/${row.userId}/${row.id}/REJECTED`
            : `${this.API}/retraits/${row.userId}/${row.id}/REJECTED`;

          this.http.put(url, { motif }).subscribe({
            next: () => {
              this.snackBar.open(`Transaction rejetée ❌ | Motif: ${motif}`, 'Fermer', { duration: 5000 });
              this.refresh();
            },
            error: (error) => {
              console.error('Erreur rejet:', error);
              this.snackBar.open('Erreur lors du rejet', 'Fermer', { duration: 3000 });
            }
          });
        }
      });
    } else {
      const url = row.type === 'Dépôt'
        ? `${this.API}/depots/${row.userId}/${row.id}/VALIDATED`
        : `${this.API}/retraits/${row.userId}/${row.id}/VALIDATED`;

      this.http.put(url, {}).subscribe({
        next: () => {
          this.snackBar.open('Transaction validée ✅', 'Fermer', { duration: 3000 });
          this.refresh();
        },
        error: (error) => {
          console.error('Erreur validation:', error);
          this.snackBar.open('Erreur lors de la validation', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.filters.type !== 'ALL') count++;
    if (this.filters.plateforme !== 'ALL') count++;
    if (this.filters.statut !== 'ALL') count++;
    if (this.filters.search.trim()) count++;
    return count;
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  showImageZoom(base64?: string | null) {
    if (!base64) {
      this.snackBar.open('Aucune image disponible', 'Fermer', { duration: 2000 });
      return;
    }
    this.dialog.open(ImageDialogComponent, {
      data: { image: `data:image/jpeg;base64,${base64}` },
      panelClass: 'image-dialog',
      width: '800px',
      maxHeight: '90vh'
    });
  }

  // Tri personnalisé
  sortData(sort: Sort) {
    if (!sort.active || sort.direction === '') {
      return;
    }

    this.dataSource.data = this.dataSource.data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'date':
          return compare(a.dateTimestamp || 0, b.dateTimestamp || 0, isAsc);
        case 'montant':
          return compare(a.montant, b.montant, isAsc);
        case 'nom':
          return compare(a.nom.toLowerCase(), b.nom.toLowerCase(), isAsc);
        case 'type':
          return compare(a.type, b.type, isAsc);
        case 'plateforme':
          return compare(a.plateforme, b.plateforme, isAsc);
        default:
          return 0;
      }
    });
  }

  getMobileTransactions() {
    return this.dataSource.filteredData;
  }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

@Component({
  selector: 'image-dialog',
  standalone: true,
  template: `<img [src]="data.image" class="zoomed-image" alt="Preuve"/>`,
  styles: [`
    .zoomed-image {
      width: 100%;
      height: auto;
      max-width: 100%;
      border-radius: 8px;
      display: block;
    }
  `],
  imports: [CommonModule]
})
export class ImageDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { image: string }) { }
}

@Component({
  selector: 'motif-rejet-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>Motif de rejet</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Motif</mat-label>
        <textarea matInput [(ngModel)]="motif" rows="3" placeholder="Raison du rejet..."></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="motif" [disabled]="!motif.trim()">Rejeter</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
  `],
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule]
})
export class MotifRejetDialogComponent {
  motif = '';
}
