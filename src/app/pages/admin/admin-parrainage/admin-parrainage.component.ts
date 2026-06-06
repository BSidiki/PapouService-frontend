import { ErrorService } from '../../../services/error.service';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface Role { name: string; }
interface DepotItem { transactionState?: string; montant?: number; }

interface Utilisateur {
  idUtilisateur: number;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  numeroUtilisateur: string;
  codePromo?: string;
  codePromoUtilise?: string;
  commissionEnAttente?: number;
  commissionTotaleVersee?: number;
  depotList?: DepotItem[];
  roles?: Role[];
}

interface ParrainView {
  idUtilisateur: number;
  nomComplet: string;
  numeroUtilisateur: string;
  codeParrainage: string;
  codeUtilise?: string;
  nbFilleuls: number;
  nbFilleulsValides: number;
  filleuls: FilleulView[];
  palier: 0 | 1 | 2;
  commissionEnAttente: number;
  commissionTotaleVersee: number;
}

interface FilleulView {
  idUtilisateur: number;
  nomComplet: string;
  numeroUtilisateur: string;
  codeParrainage: string;
  nbDepotsValides: number;
}

@Component({
  selector: 'app-admin-parrainage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './admin-parrainage.component.html',
  styleUrls: ['./admin-parrainage.component.scss']
})
export class AdminParrainageComponent implements OnInit, AfterViewInit {

  private readonly API = environment.apiBaseUrl;
  readonly milestone1 = 30;
  readonly milestone2 = 40;

  loading = false;
  search = '';

  // Taux de commission
  tauxCommission: number | null = null;
  editingTaux = false;
  tauxEdit = 0;

  // Stats globales
  totalFilleuls = 0;
  totalParrainsActifs = 0;
  totalPalier1 = 0;
  totalPalier2 = 0;

  // Table parrains
  displayedColumns: string[] = ['parrain', 'code', 'codeUtilise', 'filleuls', 'commissions', 'palier', 'actions'];
  dataSource = new MatTableDataSource<ParrainView>([]);
  private masterData: ParrainView[] = [];

  // Filleuls du parrain sélectionné
  selectedParrain: ParrainView | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator) {
    if (p) { this.dataSource.paginator = p; }
  }

  constructor(private http: HttpClient, private errorService: ErrorService) {}

  ngOnInit(): void {
    this.loadData();
    this.loadTauxCommission();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.loading = true;
    this.selectedParrain = null;

    this.http.get<Utilisateur[]>(`${this.API}/utilisateurs`).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (users) => {
        const clients = (users ?? []).filter(u => u.roles?.some(r => r.name === 'USER'));

        // Pour chaque client, trouver ses filleuls (ceux qui ont utilisé son codePromo à l'inscription)
        const views: ParrainView[] = clients.map(u => {
          const monCode = u.codePromo ? u.codePromo.toUpperCase() : null;

          const filleuls: FilleulView[] = monCode
            ? clients
              .filter(f => f.codePromoUtilise && f.codePromoUtilise.toUpperCase() === monCode)
              .map(f => {
                const nbDepotsValides = (f.depotList ?? []).filter(d => d.transactionState === 'VALIDATED').length;
                return {
                  idUtilisateur: f.idUtilisateur,
                  nomComplet: `${f.prenomUtilisateur} ${f.nomUtilisateur}`,
                  numeroUtilisateur: f.numeroUtilisateur,
                  codeParrainage: f.codePromoUtilise!,
                  nbDepotsValides
                };
              })
            : [];

          const nb = filleuls.length;
          const nbValides = filleuls.filter(f => f.nbDepotsValides > 0).length;
          const palier: 0 | 1 | 2 = nb >= this.milestone2 ? 2 : nb >= this.milestone1 ? 1 : 0;

          return {
            idUtilisateur: u.idUtilisateur,
            nomComplet: `${u.prenomUtilisateur} ${u.nomUtilisateur}`,
            numeroUtilisateur: u.numeroUtilisateur,
            codeParrainage: u.codePromo ?? '—',
            codeUtilise: u.codePromoUtilise,
            nbFilleuls: nb,
            nbFilleulsValides: nbValides,
            filleuls,
            palier,
            commissionEnAttente: u.commissionEnAttente ?? 0,
            commissionTotaleVersee: u.commissionTotaleVersee ?? 0
          };
        });

        // Trier : parrains les plus actifs en premier
        views.sort((a, b) => b.nbFilleuls - a.nbFilleuls);

        this.masterData = views;
        this.dataSource.data = views;

        // Stats
        this.totalFilleuls = clients.filter(u => !!u.codePromoUtilise).length;
        this.totalParrainsActifs = views.filter(v => v.nbFilleuls > 0).length;
        this.totalPalier1 = views.filter(v => v.palier >= 1).length;
        this.totalPalier2 = views.filter(v => v.palier === 2).length;

        this.loading = false;
      },
      error: () => {
        this.errorService.info('Erreur lors du chargement des données');
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const s = this.search.trim().toLowerCase();
    if (!s) {
      this.dataSource.data = this.masterData;
      return;
    }
    this.dataSource.data = this.masterData.filter(v =>
      v.nomComplet.toLowerCase().includes(s) ||
      v.numeroUtilisateur.toLowerCase().includes(s) ||
      v.codeParrainage.toLowerCase().includes(s) ||
      (v.codeUtilise ?? '').toLowerCase().includes(s)
    );
  }

  selectParrain(p: ParrainView): void {
    this.selectedParrain = this.selectedParrain?.idUtilisateur === p.idUtilisateur ? null : p;
  }

  getPalierLabel(palier: 0 | 1 | 2): string {
    if (palier === 2) return 'Palier Premium';
    if (palier === 1) return 'Palier 1';
    return 'Aucun';
  }

  getProgress1(nb: number): number {
    return Math.min(100, (nb / this.milestone1) * 100);
  }

  getProgress2(nb: number): number {
    if (nb < this.milestone1) return 0;
    return Math.min(100, ((nb - this.milestone1) / (this.milestone2 - this.milestone1)) * 100);
  }

  copierCode(code: string): void {
    navigator.clipboard?.writeText(code).then(() => {
      this.errorService.info('Code copié !');
    });
  }

  loadTauxCommission(): void {
    this.http.get<{ tauxCommission: number }>(`${this.API}/configurations/taux-commission`).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res) this.tauxCommission = res.tauxCommission;
    });
  }

  startEditTaux(): void {
    this.tauxEdit = this.tauxCommission ?? 0.05;
    this.editingTaux = true;
  }

  saveTauxCommission(): void {
    this.http.put(`${this.API}/configurations/taux-commission`, null, {
      params: { valeur: this.tauxEdit.toString() },
      responseType: 'text' as 'json'
    }).subscribe({
      next: () => {
        this.tauxCommission = this.tauxEdit;
        this.editingTaux = false;
        this.errorService.info('Taux de commission mis à jour.');
      },
      error: () => this.errorService.info('Erreur lors de la mise à jour du taux.')
    });
  }
}
