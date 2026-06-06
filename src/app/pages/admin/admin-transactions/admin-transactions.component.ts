import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Depot, Retrait, Utilisateur, TransactionState } from '../../../models';
import { DepotService } from '../../../services/depot.service';
import { RetraitService } from '../../../services/retrait.service';
import { ExportService, ExportRow } from '../../../services/export.service';
import { PlatformUtilsService } from '../../../services/platform-utils.service';

type Row = {
  type: 'DEPOT' | 'RETRAIT';
  id: number;
  utilisateur?: Utilisateur;
  numero: string;
  montant: number;
  plateforme: string;
  statut: TransactionState;
  date?: string | null;
  isInvite: boolean;
  caisseChoisie?: string;
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
  type: 'ALL' | 'DEPOT' | 'RETRAIT' = 'ALL';
  statut = '';
  search = '';
  plateforme = '';
  loading = false;

  selectedRow: Row | null = null;

  displayedColumns = ['type', 'nom', 'numero', 'montant', 'plateforme', 'statut', 'date', 'actions'];
  dataSource = new MatTableDataSource<Row>([]);

  @ViewChild(MatSort) sort!: MatSort;
  private _paginator: MatPaginator | null = null;
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator) {
    this._paginator = p ?? null;
    if (p) { this.dataSource.paginator = p; }
  }

  constructor(
    private depotService: DepotService,
    private retraitService: RetraitService,
    private exportService: ExportService,
    private platformUtils: PlatformUtilsService
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (row: Row, column: string) => {
      switch (column) {
        case 'date': return this.parseTs(row.date ?? null);
        case 'montant': return row.montant;
        case 'nom': return this.nomComplet(row.utilisateur, row).toLowerCase();
        case 'plateforme': return row.plateforme?.toLowerCase() ?? '';
        default: return (row as any)[column];
      }
    };
  }

  dateOf(r: Row): string | null { return r.date ?? null; }

  nomComplet(u?: Utilisateur, row?: Row): string {
    if (row?.isInvite) {
      const nom = `${(row.raw as any).prenomInvite ?? ''} ${(row.raw as any).nomInvite ?? ''}`.trim();
      return nom || '(Invité)';
    }
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
      depots: this.depotService.getAll(),
      retraits: this.retraitService.getAll()
    }).subscribe({
      next: ({ depots, retraits }) => {
        const rowsDepots: Row[] = (depots ?? []).map(d => ({
          type: 'DEPOT' as const,
          id: d.idDepot,
          utilisateur: d.utilisateur,
          numero: d.isInvite ? (d.numeroInvite ?? '—') : (d.numeroEnvoyant ?? d.utilisateur?.numeroUtilisateur ?? '—'),
          montant: d.montant ?? 0,
          plateforme: (d.optionDeTransaction ?? '—').toString().toUpperCase(),
          statut: d.transactionState ?? 'PENDING',
          date: d.dateDepot ?? null,
          isInvite: !!d.isInvite,
          raw: d
        }));

        const rowsRetraits: Row[] = (retraits ?? []).map(r => {
          const parsed = this.retraitService.parseCode(r.codeRetrait);
          return {
            type: 'RETRAIT' as const,
            id: r.idRetrait,
            utilisateur: r.utilisateur,
            numero: r.isInvite ? (r.numeroInvite ?? '—') : (r.numeroEnvoyant ?? r.utilisateur?.numeroUtilisateur ?? '—'),
            montant: 0,
            plateforme: (r.optionDeTransaction ?? '—').toString().toUpperCase(),
            statut: r.transactionState ?? 'PENDING',
            date: r.dateRetrait ?? null,
            isInvite: !!r.isInvite,
            caisseChoisie: parsed.ref || undefined,
            raw: r
          };
        });

        this.dataSource.data = [...rowsDepots, ...rowsRetraits]
          .filter(r => r.statut === 'VALIDATED' || r.statut === 'REJECTED')
          .sort((a, b) => this.parseTs(b.date) - this.parseTs(a.date));
        this.setupFilterPredicate();
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.dataSource.data = [];
        this.loading = false;
      }
    });
  }

  voirDetail(row: Row): void { this.selectedRow = row; }
  fermerDetail(): void { this.selectedRow = null; }

  private setupFilterPredicate() {
    this.dataSource.filterPredicate = (row: Row, _filter: string) => {
      const matchesType = this.type === 'ALL' || row.type === this.type;
      const matchesStatut = !this.statut || row.statut === this.statut;
      const matchesPlateforme = !this.plateforme || row.plateforme === this.plateforme;
      const s = this.search.toLowerCase().trim();
      const matchesSearch = !s ||
        this.nomComplet(row.utilisateur, row).toLowerCase().includes(s) ||
        (row.numero?.toLowerCase() ?? '').includes(s) ||
        String(row.montant).includes(s) ||
        row.plateforme.toLowerCase().includes(s) ||
        row.type.toLowerCase().includes(s);
      return matchesType && matchesStatut && matchesPlateforme && matchesSearch;
    };
  }

  applyFilter() {
    this.dataSource.filter = Math.random().toString();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  getTotalTransactions(): number { return this.dataSource.data.length; }
  getDepotCount(): number { return this.dataSource.data.filter(t => t.type === 'DEPOT').length; }
  getRetraitCount(): number { return this.dataSource.data.filter(t => t.type === 'RETRAIT').length; }

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
    const start = (this._paginator?.pageIndex ?? 0) * (this._paginator?.pageSize ?? data.length);
    return data.slice(start, start + (this._paginator?.pageSize ?? data.length));
  }

  trackById(_i: number, r: Row) { return r.type + '-' + r.id; }

  resetFilters(): void {
    this.type = 'ALL';
    this.statut = '';
    this.search = '';
    this.plateforme = '';
    this.applyFilter();
  }

  getPlatformId(row: Row): string {
    if (row.isInvite) return (row.raw as Depot).idPlateforme ?? '—';
    return this.platformUtils.getUserPlatformId(
      this.platformUtils.normalize(row.plateforme),
      row.utilisateur
    );
  }

  getCodeRetrait(row: Row): string {
    if (row.type !== 'RETRAIT') return '';
    return this.retraitService.parseCode((row.raw as Retrait).codeRetrait).code;
  }

  getMoyenPaiement(row: Row): string {
    const code = row.type === 'DEPOT'
      ? (row.raw as Depot).optionDepot
      : (row.raw as Retrait).optionRetrait;
    return code ? this.platformUtils.getPaymentLabel(code) : '—';
  }

  async exportPdf(): Promise<void> {
    const rows = this.dataSource.filteredData;
    if (!rows.length) return;
    const exportRows: ExportRow[] = rows.map(r => ({
      type: r.type,
      nom: this.nomComplet(r.utilisateur, r),
      numero: r.numero,
      montant: r.montant,
      plateforme: r.plateforme,
      caisseOuId: r.type === 'DEPOT' ? this.getPlatformId(r) : (r.caisseChoisie ?? '—'),
      moyen: this.getMoyenPaiement(r),
      statut: r.statut,
      date: r.date,
      isInvite: r.isInvite
    }));
    await this.exportService.exportPdf(exportRows);
  }

  exportCsv(): void {
    const rows = this.dataSource.filteredData;
    if (!rows.length) return;
    const exportRows: ExportRow[] = rows.map(r => ({
      type: r.type,
      nom: this.nomComplet(r.utilisateur, r),
      numero: r.numero,
      montant: r.montant,
      plateforme: r.plateforme,
      caisseOuId: r.type === 'DEPOT' ? this.getPlatformId(r) : (r.caisseChoisie ?? '—'),
      moyen: this.getMoyenPaiement(r),
      statut: r.statut,
      date: r.date,
      isInvite: r.isInvite
    }));
    this.exportService.exportCsv(exportRows, 'transactions');
  }
}
