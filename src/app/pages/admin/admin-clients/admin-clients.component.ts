import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { NgChartsModule } from 'ng2-charts';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChartConfiguration, ChartType } from 'chart.js';

interface Role { name: string; }

interface Utilisateur {
  idUtilisateur: number;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  numeroUtilisateur: string;
  roles?: Role[];
}

type TransactionState = 'PENDING' | 'VALIDATED' | 'REJECTED';

interface Depot {
  idDepot: number;
  montant: number;
  numeroEnvoyant?: string;
  optionDeTransaction?: string;
  transactionState: TransactionState;
  utilisateur?: Utilisateur | null;
  dateDepot?: string;   // ISO
}

interface Retrait {
  idRetrait: number;
  montant: number;
  numeroEnvoyant?: string;
  optionDeTransaction?: string;
  transactionState: TransactionState;
  utilisateur?: Utilisateur | null;
  dateRetrait?: string; // ISO
}

interface ClientView extends Utilisateur {
  depotCount: number;
  retraitCount: number;
  totalDepot: number;
  totalRetrait: number;
  stars: number;
  fidelityStars: string;
  isFidele: boolean;
  lastActivity?: string;
}

@Component({
  selector: 'app-admin-clients',
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    NgChartsModule,
    MatSnackBarModule
  ],
})
export class AdminClientsComponent implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Filtres
  search = '';
  selectedStarFilter = '';

  // Table
  displayedColumns: string[] = ['prenom', 'nom', 'numero', 'stats', 'fidelity', 'actions'];
  dataSource = new MatTableDataSource<ClientView>([]);
  private masterData: ClientView[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Graph
  chartLabels: string[] = ['0⭐', '1⭐', '2⭐', '3⭐', '4⭐', '5⭐'];
  chartData: number[] = [0, 0, 0, 0, 0, 0];
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
  };
  public chartType: ChartType = 'bar';

  // UI States
  loading = false;
  totalClients = 0;
  fideleClients = 0;

  private API = 'http://192.168.11.124:8080';

  ngOnInit(): void { this.loadClientsData(); }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.configureFilterPredicate();
  }

  /** Normalise un numéro pour matcher de façon fiable (enlève espaces, +, 226, tirets) */
  private normalizePhone(num?: string): string {
    if (!num) return '';
    let n = num.replace(/[\s\-]/g, '');
    n = n.replace(/^\+/, '');
    n = n.replace(/^226/, ''); // ajuste au besoin
    return n;
  }

  /** True si la transaction appartient au client */
  private belongsToClient(client: Utilisateur, t: { utilisateur?: Utilisateur | null; numeroEnvoyant?: string }): boolean {
    // 1) par id si dispo
    if (t.utilisateur?.idUtilisateur && client.idUtilisateur) {
      if (t.utilisateur.idUtilisateur === client.idUtilisateur) return true;
    }
    // 2) fallback par numéro
    const cNum = this.normalizePhone(client.numeroUtilisateur);
    const tUserNum = this.normalizePhone(t.utilisateur?.numeroUtilisateur);
    const tNum = this.normalizePhone(t.numeroEnvoyant);
    return !!cNum && (cNum === tUserNum || cNum === tNum);
  }

  /** Renvoie la date la plus récente entre dépôts/retraits du client (en ISO) */
  private computeLastActivity(clientDepots: Depot[], clientRetraits: Retrait[]): string | undefined {
    let latest: number = 0;

    for (const d of clientDepots) {
      const ts = d.dateDepot ? Date.parse(d.dateDepot) : NaN;
      if (!isNaN(ts) && ts > latest) latest = ts;
    }
    for (const r of clientRetraits) {
      const ts = r.dateRetrait ? Date.parse(r.dateRetrait) : NaN;
      if (!isNaN(ts) && ts > latest) latest = ts;
    }
    return latest ? new Date(latest).toISOString() : undefined;
  }

  /** Recharge toutes les données et recalcule la fidélité + activité */
  public loadClientsData(): void {
    this.loading = true;

    forkJoin({
      users: this.http.get<Utilisateur[]>(`${this.API}/utilisateurs`).pipe(catchError(() => of([]))),
      depots: this.http.get<Depot[]>(`${this.API}/depots`).pipe(catchError(() => of([]))),
      retraits: this.http.get<Retrait[]>(`${this.API}/retraits`).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ users, depots, retraits }) => {
        const clients = (users ?? []).filter(u => u.roles?.some(r => r.name === 'USER'));

        // On garde toutes les transactions, mais on calculera les compteurs avec VALIDATED uniquement
        const clientViews: ClientView[] = clients.map(client => {
          const dForClient = (depots ?? []).filter(d => this.belongsToClient(client, d));
          const rForClient = (retraits ?? []).filter(r => this.belongsToClient(client, r));

          const dValidated = dForClient.filter(d => d.transactionState === 'VALIDATED');
          const rValidated = rForClient.filter(r => r.transactionState === 'VALIDATED');

          const depotCount = dValidated.length;
          const retraitCount = rValidated.length;

          const totalDepot = dValidated.reduce((s, d) => s + (d.montant || 0), 0);
          const totalRetrait = rValidated.reduce((s, r) => s + (r.montant || 0), 0);

          // ★ règle: 1 étoile / 5 dépôts validés
          const stars = Math.min(5, Math.floor(depotCount / 5));
          const fidelityStars = '★'.repeat(stars) + '☆'.repeat(5 - stars);
          const isFidele = stars === 5;

          // Activité = derniere date (VALIDATED ou pas) pour refléter la vraie activité
          const lastActivity = this.computeLastActivity(dForClient, rForClient);

          return {
            ...client,
            depotCount,
            retraitCount,
            totalDepot,
            totalRetrait,
            stars,
            fidelityStars,
            isFidele,
            lastActivity
          };
        });

        this.masterData = clientViews;
        this.totalClients = clientViews.length;
        this.fideleClients = clientViews.filter(c => c.isFidele).length;

        // Update table
        this.dataSource.data = clientViews;
        this.configureFilterPredicate();
        this.applyFilter(); // met à jour filteredData + graphe

        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement clients:', err);
        this.snackBar.open('Erreur lors du chargement des clients', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private configureFilterPredicate() {
    this.dataSource.filterPredicate = (data: ClientView, filter: string) => {
      const f = JSON.parse(filter) as { search: string; stars: string };
      const search = (f.search || '').trim().toLowerCase();
      const starsFilter = f.stars;

      const matchesSearch =
        !search ||
        data.nomUtilisateur?.toLowerCase().includes(search) ||
        data.prenomUtilisateur?.toLowerCase().includes(search) ||
        data.numeroUtilisateur?.toLowerCase().includes(search);

      const matchesStars = starsFilter === '' ? true : data.stars === +starsFilter;

      return matchesSearch && matchesStars;
    };
  }

  getAverageStars(): string {
    if (!this.masterData.length) return '0.0';
    const average = this.masterData.reduce((sum, c) => sum + c.stars, 0) / this.masterData.length;
    return average.toFixed(1);
    // (petite correction: moyenne sur le dataset courant ; si tu veux la moyenne du filtre, remplace masterData par dataSource.filteredData)
  }

  getTotalAmount(client: ClientView): number {
    return (client.totalDepot || 0) + (client.totalRetrait || 0);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Inconnue';
    const d = new Date(dateString);
    return isNaN(+d) ? 'Date invalide' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  public activityTooltip(date?: string): string {
    return 'Dernière activité: ' + (date ? this.formatDate(date) : 'Inconnue');
  }

  get chartDataConfig(): any {
    return {
      labels: this.chartLabels,
      datasets: [{
        data: this.chartData,
        label: 'Nombre de clients'
      }]
    };
  }

  applyFilter() {
    // reset à la source
    this.dataSource.data = this.masterData.slice();

    this.dataSource.filter = JSON.stringify({
      search: this.search,
      stars: this.selectedStarFilter
    });

    // rafraîchir le graphe sur les données filtrées
    const counts = [0, 0, 0, 0, 0, 0];
    for (const c of this.dataSource.filteredData) counts[c.stars]++;
    this.chartData = counts;
  }

  resetFilter() {
    this.search = '';
    this.selectedStarFilter = '';
    this.applyFilter();
  }

  // Actions
  voirProfil(id: number) { this.router.navigate(['/admin/clients', id]); }
  voirHistorique(id: number) { this.router.navigate(['/admin/clients', id, 'historique']); }

  getActivityBadge(lastActivity?: string): string {
    if (!lastActivity) return 'Inactif';
    const activityDate = new Date(lastActivity);
    if (isNaN(+activityDate)) return 'Inactif';

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / 86400000);

    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
    return `${Math.floor(diffDays / 30)}mois`;
  }

  getActivityColor(lastActivity?: string): string {
    if (!lastActivity) return '#6b7280';
    const activityDate = new Date(lastActivity);
    if (isNaN(+activityDate)) return '#6b7280';

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / 86400000);

    if (diffDays === 0) return '#10b981';
    if (diffDays < 3) return '#3b82f6';
    if (diffDays < 7) return '#f59e0b';
    return '#ef4444';
  }
}
