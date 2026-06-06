import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { forkJoin, of, Subscription, interval} from 'rxjs';
import { catchError, finalize, startWith, switchMap, tap } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { ModalController } from '@ionic/angular/standalone';
import { ErrorService } from '../../../services/error.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../services/auth.service';
import { DepotService } from '../../../services/depot.service';
import { RetraitService } from '../../../services/retrait.service';
import { UtilisateurService } from '../../../services/utilisateur.service';
import { PlatformUtilsService } from '../../../services/platform-utils.service';
import { ImageDialogComponent } from '../../../shared/dialogs/image-dialog.component';
import { MotifRejetDialogComponent } from '../../../shared/dialogs/motif-rejet-dialog.component';
import { Depot, Retrait, Utilisateur, Platform, TransactionState } from '../../../models';

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
  codeRetrait?: string;
  caisseChoisie?: string;
  statut: TransactionState;
  dateTimestamp?: number;
  isInvite?: boolean;
  isNew?: boolean;
  fidelityLevel: number;
  fidelityStars: string;
  isCommission?: boolean;
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
    MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, FormsModule,
    NgChartsModule, MatCardModule,
    MatIconModule, MatMenuModule, MatTooltipModule
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private errorService = inject(ErrorService);
  private modalController = inject(ModalController);
  private auth = inject(AuthService);
  private titleService = inject(Title);
  private depotService = inject(DepotService);
  private retraitService = inject(RetraitService);
  private utilisateurService = inject(UtilisateurService);
  private platformUtils = inject(PlatformUtilsService);
  private adminId = 0;
  private autoRefreshSub?: Subscription;

  private knownPendingIds = new Set<string>();
  private isFirstLoad = true;
  newRowIds = new Set<string>();
  unreadCount = 0;
  processingIds = new Set<string>();
  notifPermission: NotificationPermission = 'default';
  soundEnabled = true;

  private readonly fidelityThresholds = [100_000, 1_000_000, 5_000_000, 10_000_000, 20_000_000];
  private fidelityMap = new Map<number, number>();

  loading = false;
  error = false;
  lastUpdated: string | null = null;
  totalDepotsValides = 0;
  totalRetraitsValides = 0;
  depotsPendingCount = 0;
  retraitsPendingCount = 0;
  nombreClients = 0;
  filtersExpanded = false;
  showDepotsTotal = false;
  showRetraitsTotal = false;

  dataSource = new MatTableDataSource<Row>();
  displayedColumns: string[] = ['type', 'nom', 'plateforme', 'montant', 'date', 'capture', 'actions'];

  filters: FilterState = {
    type: 'ALL',
    plateforme: 'ALL',
    statut: 'ALL',
    search: ''
  };

  @ViewChild(MatSort) set sortRef(sort: MatSort) {
    if (!sort) return;
    this.dataSource.sort = sort;
    this.dataSource.sortingDataAccessor = (item: Row, property: string) => {
      switch (property) {
        case 'date':      return item.dateTimestamp || 0;
        case 'montant':   return item.montant;
        case 'nom':       return item.nom.toLowerCase();
        case 'type':      return item.type;
        case 'plateforme': return item.plateforme;
        default:          return (item as any)[property];
      }
    };
    this.dataSource.sortData = (data: Row[], s: MatSort): Row[] => {
      if (!s.active || s.direction === '') {
        return [...data].sort((a, b) => {
          if (b.fidelityLevel !== a.fidelityLevel) return b.fidelityLevel - a.fidelityLevel;
          return (a.dateTimestamp ?? 0) - (b.dateTimestamp ?? 0);
        });
      }
      const isAsc = s.direction === 'asc';
      return [...data].sort((a, b) => {
        switch (s.active) {
          case 'date':      return compare(a.dateTimestamp || 0, b.dateTimestamp || 0, isAsc);
          case 'montant':   return compare(a.montant, b.montant, isAsc);
          case 'nom':       return compare(a.nom.toLowerCase(), b.nom.toLowerCase(), isAsc);
          case 'type':      return compare(a.type, b.type, isAsc);
          case 'plateforme': return compare(a.plateforme, b.plateforme, isAsc);
          default:          return 0;
        }
      });
    };
  }

  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator) {
    if (p) { this.dataSource.paginator = p; }
  }

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

  refresh(): void {
    this.refresh$().subscribe();
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSub = interval(30_000)
      .pipe(startWith(0), switchMap(() => this.refresh$()))
      .subscribe();
  }

  stopAutoRefresh(): void {
    this.autoRefreshSub?.unsubscribe();
    this.autoRefreshSub = undefined;
  }

  ngOnInit(): void {
    this.adminId = this.auth.getUser()?.idUtilisateur ?? 0;
    this.requestNotifPermission();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.titleService.setTitle('Papou Service — Admin');
  }

  requestNotifPermission(): void {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      this.notifPermission = 'granted';
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { this.notifPermission = p; });
    } else {
      this.notifPermission = 'denied';
    }
  }

  clearUnread(): void {
    this.unreadCount = 0;
    this.newRowIds.clear();
  }

  private playAlertSound(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => ctx.close();
    } catch { /* AudioContext non dispo */ }
  }

  private updateTabTitle(pendingCount: number): void {
    const base = 'Papou Service — Dashboard';
    this.titleService.setTitle(pendingCount > 0 ? `(${pendingCount}) ${base}` : base);
  }

  private sendBrowserNotif(nbNew: number, hasDepot: boolean, hasRetrait: boolean): void {
    if (this.notifPermission !== 'granted') return;
    const types = [hasDepot && 'dépôt', hasRetrait && 'retrait'].filter(Boolean).join(' & ');
    new Notification('🔔 Papou Service', {
      body: `${nbNew} nouvelle${nbNew > 1 ? 's' : ''} demande${nbNew > 1 ? 's' : ''} de ${types} en attente`,
      icon: 'assets/images/logo.png',
      tag: 'papou-new-transaction'
    } as NotificationOptions);
  }

  private refresh$() {
    this.loading = true;
    this.error = false;

    const depots$ = this.depotService.getAll().pipe(catchError(() => of([] as Depot[])));
    const retraits$ = this.retraitService.getAll().pipe(catchError(() => of([] as Retrait[])));
    const users$ = this.utilisateurService.getAll().pipe(catchError(() => of([] as Utilisateur[])));

    return forkJoin({ depots: depots$, retraits: retraits$, users: users$ }).pipe(
      tap(({ depots, retraits, users }) => {
        this.totalDepotsValides = depots
          .filter(d => d.transactionState === 'VALIDATED')
          .reduce((s, d) => s + (d.montant || 0), 0);

        this.totalRetraitsValides = retraits
          .filter(r => r.transactionState === 'VALIDATED')
          .reduce((s, r) => s + (r.montant || 0), 0);

        const pendingDepots = depots.filter(d => d.transactionState === 'PENDING');
        const pendingRetraits = retraits.filter(r => r.transactionState === 'PENDING');
        this.depotsPendingCount = pendingDepots.length;
        this.retraitsPendingCount = pendingRetraits.length;

        this.donutChartData = {
          labels: ['Dépôts validés', 'Retraits validés'],
          datasets: [{
            data: [this.totalDepotsValides, this.totalRetraitsValides],
            backgroundColor: ['#4caf50', '#f44336']
          }]
        };

        const phoneToUserId = new Map<string, number>();
        for (const u of users) {
          if (u.numeroUtilisateur) phoneToUserId.set(u.numeroUtilisateur, u.idUtilisateur);
        }

        const totals = new Map<number, number>();
        for (const d of depots) {
          if (d.transactionState !== 'VALIDATED') continue;
          let uid = d.utilisateur?.idUtilisateur;
          if (!uid && d.utilisateur?.numeroUtilisateur) {
            uid = phoneToUserId.get(d.utilisateur.numeroUtilisateur);
          }
          if (!uid) continue;
          totals.set(uid, (totals.get(uid) ?? 0) + (d.montant ?? 0));
        }
        this.fidelityMap = new Map<number, number>();
        for (const [uid, total] of totals.entries()) {
          this.fidelityMap.set(uid, this.fidelityThresholds.filter(t => total >= t).length);
        }

        const depotRows: Row[] = pendingDepots.map(d => {
          const plat = this.platformUtils.normalize(d.optionDeTransaction);
          const isInvite = d.isInvite === true || (!d.utilisateur && !!d.numeroInvite);
          const nomUser = isInvite
            ? (`${d.prenomInvite ?? ''} ${d.nomInvite ?? ''}`.trim() || '(Invité)')
            : (`${d.utilisateur?.prenomUtilisateur ?? ''} ${d.utilisateur?.nomUtilisateur ?? ''}`.trim() || '—');
          const userId = d.utilisateur?.idUtilisateur || this.findUserIdFromData(d, users);
          const fidelityLevel = this.fidelityMap.get(userId) ?? 0;
          const rowKey = `Dépôt:${d.idDepot}`;
          return {
            type: 'Dépôt',
            id: d.idDepot,
            userId,
            nom: nomUser,
            numero: (isInvite ? d.numeroInvite : d.numeroEnvoyant) ?? '—',
            plateforme: plat,
            idPlateforme: isInvite ? (d.idPlateforme || '—') : this.platformUtils.getUserPlatformId(plat, d.utilisateur),
            montant: d.montant ?? 0,
            date: d.dateDepot,
            dateTimestamp: d.dateDepot ? new Date(d.dateDepot).getTime() : 0,
            capture: d.capture ?? null,
            statut: d.transactionState ?? 'PENDING',
            isInvite,
            isNew: this.newRowIds.has(rowKey),
            fidelityLevel,
            fidelityStars: '★'.repeat(fidelityLevel)
          };
        });

        const retraitRows: Row[] = pendingRetraits.map(r => {
          const plat = this.platformUtils.normalize(r.optionDeTransaction);
          const isInvite = r.isInvite === true || (!r.utilisateur && !!r.numeroInvite);
          const nomUser = isInvite
            ? (`${r.prenomInvite ?? ''} ${r.nomInvite ?? ''}`.trim() || '(Invité)')
            : (`${r.utilisateur?.prenomUtilisateur ?? ''} ${r.utilisateur?.nomUtilisateur ?? ''}`.trim() || '—');
          const userId = r.utilisateur?.idUtilisateur || this.findUserIdFromData(r, users);
          const fidelityLevel = this.fidelityMap.get(userId) ?? 0;
          const parsed = this.retraitService.parseCode(r.codeRetrait);
          const rowKey = `Retrait:${r.idRetrait}`;
          return {
            type: 'Retrait',
            id: r.idRetrait,
            userId,
            nom: nomUser,
            numero: (isInvite ? r.numeroInvite : r.numeroEnvoyant) ?? '—',
            plateforme: plat,
            idPlateforme: isInvite ? (r.idPlateforme || '—') : this.platformUtils.getUserPlatformId(plat, r.utilisateur),
            montant: r.montant ?? 0,
            date: r.dateRetrait,
            dateTimestamp: r.dateRetrait ? new Date(r.dateRetrait).getTime() : 0,
            capture: r.file ?? null,
            codeRetrait: parsed.code || undefined,
            caisseChoisie: parsed.ref || undefined,
            statut: r.transactionState ?? 'PENDING',
            isInvite,
            isNew: this.newRowIds.has(rowKey),
            fidelityLevel,
            fidelityStars: '★'.repeat(fidelityLevel),
            isCommission: r.typeRetrait === 'COMMISSION'
          };
        });

        const newRows = [...depotRows, ...retraitRows];

        if (!this.isFirstLoad) {
          const incomingIds = new Set(newRows.map(r => `${r.type}:${r.id}`));
          const newIds = [...incomingIds].filter(id => !this.knownPendingIds.has(id));

          if (newIds.length > 0) {
            this.newRowIds = new Set(newIds);
            this.unreadCount += newIds.length;
            const hasDepot   = newIds.some(id => id.startsWith('Dépôt'));
            const hasRetrait = newIds.some(id => id.startsWith('Retrait'));
            this.playAlertSound();
            this.sendBrowserNotif(newIds.length, hasDepot, hasRetrait);
            this.errorService.toast(
              `🔔 ${newIds.length} nouvelle${newIds.length > 1 ? 's' : ''} transaction${newIds.length > 1 ? 's' : ''} en attente`,
              'warning', 6000
            );
            setTimeout(() => { this.newRowIds.clear(); }, 8000);
          } else {
            this.newRowIds.clear();
          }
        }

        this.isFirstLoad = false;
        this.knownPendingIds = new Set(newRows.map(r => `${r.type}:${r.id}`));
        this.allRows = newRows;
        this.applyFilters();
        this.updateTabTitle(newRows.length);
        this.nombreClients = users.length;
        this.buildVolumesSeries(pendingDepots, pendingRetraits);
      }),

      catchError(_ => {
        this.error = true;
        this.dataSource.data = [];
        this.errorService.toast('Erreur de chargement des données.', 'danger', 3000);
        return of(null);
      }),

      finalize(() => {
        this.loading = false;
        this.lastUpdated = formatDate(new Date(), 'dd/MM/yyyy HH:mm', 'fr');
      })
    );
  }

  private findUserIdFromData(transaction: any, users: Utilisateur[]): number {
    if (transaction.idUtilisateur) return transaction.idUtilisateur;
    if (transaction.utilisateur?.idUtilisateur) return transaction.utilisateur.idUtilisateur;
    if (transaction.utilisateur) {
      const found = users.find(u =>
        u.nomUtilisateur === transaction.utilisateur.nomUtilisateur &&
        u.prenomUtilisateur === transaction.utilisateur.prenomUtilisateur
      );
      if (found) return found.idUtilisateur;
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
        } catch {}
      });
      return m;
    };

    const depMap = group(deps, (e: any) => e.dateDepot);
    const retMap = group(rets, (e: any) => e.dateRetrait);
    const allDays = Array.from(new Set([...depMap.keys(), ...retMap.keys()])).sort();

    this.lineChartData = {
      labels: allDays.map(d => { try { return formatDate(d, 'dd/MM', 'fr'); } catch { return d; } }),
      datasets: [
        { label: 'Dépôts (PENDING)', data: allDays.map(d => depMap.get(d) || 0), tension: 0.25, borderColor: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.1)' },
        { label: 'Retraits (PENDING)', data: allDays.map(d => retMap.get(d) || 0), tension: 0.25, borderColor: '#f44336', backgroundColor: 'rgba(244, 67, 54, 0.1)' }
      ]
    };
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateString || '—'; }
  }

  applyFilters(): void {
    let filtered = this.allRows;
    if (this.filters.type !== 'ALL') filtered = filtered.filter(r => r.type === this.filters.type);
    if (this.filters.plateforme !== 'ALL') filtered = filtered.filter(r => r.plateforme === this.filters.plateforme);
    if (this.filters.statut !== 'ALL') filtered = filtered.filter(r => r.statut === this.filters.statut);
    if (this.filters.search.trim()) {
      const s = this.filters.search.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.nom.toLowerCase().includes(s) ||
        r.numero.includes(s) ||
        r.idPlateforme.toLowerCase().includes(s) ||
        r.montant.toString().includes(s)
      );
    }
    filtered = filtered.slice().sort((a, b) => {
      if (b.fidelityLevel !== a.fidelityLevel) return b.fidelityLevel - a.fidelityLevel;
      return (a.dateTimestamp ?? 0) - (b.dateTimestamp ?? 0);
    });
    this.dataSource.data = filtered;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onFilterChange(): void { this.applyFilters(); }

  clearFilters(): void {
    this.filters = { type: 'ALL', plateforme: 'ALL', statut: 'ALL', search: '' };
    this.applyFilters();
  }

  private removeRowOptimistically(row: Row): void {
    this.allRows = this.allRows.filter(r => !(r.id === row.id && r.type === row.type));
    this.applyFilters();
    if (row.type === 'Dépôt') {
      this.depotsPendingCount = Math.max(0, this.depotsPendingCount - 1);
    } else {
      this.retraitsPendingCount = Math.max(0, this.retraitsPendingCount - 1);
    }
    if (this.allRows.length === 0) {
      this.clearUnread();
    } else {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    this.updateTabTitle(this.allRows.length);
  }

  async traiter(row: Row, etat: 'VALIDATED' | 'REJECTED') {
    const key = `${row.type}:${row.id}`;
    if (this.processingIds.has(key)) return;

    if (etat === 'REJECTED') {
      const modal = await this.modalController.create({
        component: MotifRejetDialogComponent,
        componentProps: { type: row.type },
        cssClass: 'motif-modal'
      });
      await modal.present();
      const { data: motif } = await modal.onDidDismiss<string>();
      if (!motif) return;

      this.processingIds.add(key);
      const uid = row.userId || this.adminId;
      const request$ = row.type === 'Dépôt'
        ? this.depotService.updateState(uid, row.id, 'REJECTED', motif)
        : this.retraitService.updateState(uid, row.id, 'REJECTED', motif);

      request$.subscribe({
        next: () => {
          this.processingIds.delete(key);
          this.errorService.toast(`Transaction rejetée | Motif: ${motif}`, 'warning', 5000);
          this.removeRowOptimistically(row);
          this.refresh$().subscribe();
        },
        error: () => {
          this.processingIds.delete(key);
          this.errorService.toast('Erreur lors du rejet', 'danger', 3000);
        }
      });
    } else {
      this.processingIds.add(key);
      const uid = row.userId || this.adminId;
      const request$ = row.type === 'Dépôt'
        ? this.depotService.updateState(uid, row.id, 'VALIDATED')
        : this.retraitService.updateState(uid, row.id, 'VALIDATED');

      request$.subscribe({
        next: () => {
          this.processingIds.delete(key);
          this.errorService.success('Transaction validée');
          this.removeRowOptimistically(row);
          this.refresh$().subscribe();
        },
        error: () => {
          this.processingIds.delete(key);
          this.errorService.toast('Erreur lors de la validation', 'danger', 3000);
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

  toggleFilters(): void { this.filtersExpanded = !this.filtersExpanded; }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.errorService.info(`Copié : ${text}`);
    });
  }

  async showImageZoom(base64?: string | null) {
    if (!base64) {
      this.errorService.info('Aucune image disponible');
      return;
    }
    const modal = await this.modalController.create({
      component: ImageDialogComponent,
      componentProps: { image: `data:image/jpeg;base64,${base64}` },
      cssClass: 'image-modal'
    });
    await modal.present();
  }

  getMobileTransactions(): Row[] {
    const p = this.dataSource.paginator;
    if (!p) return this.dataSource.data;
    const start = p.pageIndex * p.pageSize;
    return this.dataSource.data.slice(start, start + p.pageSize);
  }
}

function compare(a: number | string, b: number | string, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
