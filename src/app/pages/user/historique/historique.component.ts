import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AuthService } from './../../../services/auth.service';
import { UtilisateurService } from '../../../services/utilisateur.service';
import { DepotService } from '../../../services/depot.service';
import { RetraitService } from '../../../services/retrait.service';
import { NotificationService } from '../../../services/notification.service';
import { AnnoncesPublicComponent } from "../../annonces/annonces-public.component";
import { Observable, catchError, from, map, mergeMap, of, tap, toArray, finalize } from 'rxjs';

type TransactionType = 'DEPOT' | 'RETRAIT';
type Statut = 'PENDING' | 'VALIDATED' | 'REJECTED' | undefined;

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    AnnoncesPublicComponent
  ],
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.scss']
})
export class HistoriqueComponent implements OnInit {
  historiques: any[] = [];
  filteredHistoriques: any[] = [];

  filter: 'ALL' | TransactionType = 'ALL';
  statusFilter: 'ALL' | 'PENDING' | 'VALIDATED' | 'REJECTED' = 'ALL';
  dateFrom = '';
  dateTo = '';
  userId = 0;

  loading = false;
  errorMsg = '';

  // Pagination
  pageIndex = 0;
  pageSize = 10;

  get paginatedItems(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredHistoriques.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredHistoriques.length / this.pageSize);
  }

  nextPage(): void {
    if (this.pageIndex < this.totalPages - 1) this.pageIndex++;
  }

  prevPage(): void {
    if (this.pageIndex > 0) this.pageIndex--;
  }

  setPage(n: number): void {
    this.pageIndex = n;
  }

  // Mini dashboard stats
  totalRetrait = 0;
  commissionBalance = 0;

  constructor(
    private auth: AuthService,
    private router: Router,
    private utilisateurService: UtilisateurService,
    private depotService: DepotService,
    private retraitService: RetraitService,
    private notificationService: NotificationService
  ) {
    const user = this.auth.getUser();
    if (user) this.userId = user.idUtilisateur;
  }

  ngOnInit(): void {
    this.notificationService.clearBadge();
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

    this.utilisateurService.getHistoriques(this.userId).pipe(
      map(list => {
        const sorted = list?.slice()?.sort((a, b) => (b.id_transaction ?? 0) - (a.id_transaction ?? 0)) || [];
        const role = this.auth.getUserRole();
        if (role === 'ADMIN') return sorted;
        // Clients: last 15 depots + last 20 retraits
        const depots   = sorted.filter(i => i.transaction === 'DEPOT').slice(0, 15);
        const retraits = sorted.filter(i => i.transaction === 'RETRAIT' || i.transaction === 'RETRAIT_COMMISSION').slice(0, 20);
        return [...depots, ...retraits].sort((a, b) => (b.id_transaction ?? 0) - (a.id_transaction ?? 0));
      }),

      mergeMap(list => {
        if (!list.length) return of([] as any[]);
        return from(list).pipe(
          mergeMap(item => this.fetchDetailsForItem(item), 5),
          toArray()
        );
      }),

      tap(rows => {
        this.historiques = rows;
        // Compute mini-dashboard stats
        this.totalRetrait = rows
          .filter(r => r.transaction === 'RETRAIT' && r.originalTransaction !== 'RETRAIT_COMMISSION' && r.statut === 'VALIDATED')
          .reduce((s, r) => s + (r.details?.montant ?? 0), 0);
        this.commissionBalance = rows
          .filter(r => r.originalTransaction === 'RETRAIT_COMMISSION' && r.statut === 'VALIDATED')
          .reduce((s, r) => s + (r.details?.montant ?? 0), 0);
        // Notification badge
        this.notificationService.checkTransactions(rows);
        this.applyFilter();
      }),

      catchError(_ => {
        this.errorMsg = 'Erreur lors du chargement des historiques.';
        this.historiques = [];
        this.filteredHistoriques = [];
        return of([] as any[]);
      }),

      finalize(() => {
        this.loading = false;
      })
    ).subscribe();
  }

  private fetchDetailsForItem(item: any) {
    const type: TransactionType = item.transaction === 'DEPOT' ? 'DEPOT' : 'RETRAIT';
    // RETRAIT_COMMISSION est traité comme un RETRAIT normal pour la récupération des détails
    const id = item.id_transaction;

    const request$: Observable<any> = type === 'DEPOT'
      ? this.depotService.getById(id)
      : this.retraitService.getById(id);

    return request$.pipe(
      map((details: any) => {
        const date = details?.dateDepot || details?.dateRetrait || null;
        const statut: Statut = details?.transactionState;
        return { ...item, transaction: type, originalTransaction: item.transaction, date, utilisateur: details?.utilisateur, details, statut };
      }),
      catchError(() => of({
        ...item,
        transaction: type,
        originalTransaction: item.transaction,
        date: null,
        utilisateur: null,
        details: null,
        statut: undefined as Statut
      }))
    );
  }

  // ---------- Filtres ----------
  applyFilter(): void {
    this.pageIndex = 0;
    this.filteredHistoriques = this.historiques.filter(h => {
      const okType = this.filter === 'ALL'
        || h.transaction === this.filter
        || (this.filter === 'RETRAIT' && h.originalTransaction === 'RETRAIT_COMMISSION');
      const okStatut = this.statusFilter === 'ALL' || h.statut === this.statusFilter;

      let okDate = true;
      if (h.date) {
        const d = new Date(h.date);
        if (this.dateFrom) {
          okDate = okDate && d >= new Date(this.dateFrom);
        }
        if (this.dateTo) {
          const toDate = new Date(this.dateTo);
          toDate.setHours(23, 59, 59, 999);
          okDate = okDate && d <= toDate;
        }
      } else if (this.dateFrom || this.dateTo) {
        okDate = false;
      }

      return okType && okStatut && okDate;
    });
  }

  // ---------- Export PDF ----------
  async exportPDF(): Promise<void> {
    const rows = this.filteredHistoriques;
    if (!rows.length) return;

    // Chargement du logo en base64 pour l'embarquer dans le PDF
    let logoBase64 = '';
    try {
      const res  = await fetch('assets/images/logo.png');
      const blob = await res.blob();
      logoBase64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* logo non disponible — on continue sans */ }

    const user = this.auth.getUser();
    const userName = user
      ? `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim()
      : '';
    const now = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const statutLabel = (s: string) =>
      s === 'VALIDATED' ? 'Validé' :
      s === 'REJECTED'  ? 'Rejeté' :
      s === 'PENDING'   ? 'En attente' : '—';

    const typeLabel = (item: any) =>
      item.originalTransaction === 'RETRAIT_COMMISSION' ? 'Retrait Commission' :
      item.transaction === 'DEPOT' ? 'Dépôt' : 'Retrait';

    const tableRows = rows.map(item => `
      <tr>
        <td>N${item.id_transaction}PS</td>
        <td>${typeLabel(item)}</td>
        <td>${item.details?.montant != null ? Number(item.details.montant).toLocaleString('fr-FR') + ' FCFA' : '—'}</td>
        <td>${item.details?.numeroEnvoyant || item.details?.numeroInvite || '—'}</td>
        <td>${item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
        <td class="s-${(item.statut || '').toLowerCase()}">${statutLabel(item.statut || '')}</td>
      </tr>`).join('');

    const logoImg   = logoBase64 ? `<img src="${logoBase64}" alt="Papou Service" class="logo" />` : '';
    const watermark = logoBase64
      ? `background-image: url('${logoBase64}');
         background-repeat: no-repeat;
         background-position: center center;
         background-size: 340px auto;
         background-attachment: fixed;`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Historique des Transactions — Papou Service</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; padding: 28px;
      position: relative;
      ${watermark}
    }
    /* Filigrane — superposé sur le contenu avec très faible opacité */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      ${logoBase64 ? `background-image: url('${logoBase64}');` : ''}
      background-repeat: no-repeat;
      background-position: center center;
      background-size: 340px auto;
      opacity: 0.07;
      pointer-events: none;
      z-index: 0;
    }
    /* Tout le contenu passe au-dessus du filigrane */
    .doc-header, table, .doc-footer { position: relative; z-index: 1; }

    .doc-header { display: flex; justify-content: space-between; align-items: center;
                  margin-bottom: 22px; padding-bottom: 14px; border-bottom: 3px solid #991f23; }
    .doc-header .brand { display: flex; align-items: center; gap: 12px; }
    .doc-header .logo { height: 52px; width: auto; object-fit: contain; }
    .doc-header h1 { font-size: 18px; color: #991f23; margin-bottom: 3px; }
    .doc-header .sub { font-size: 11px; color: #4b5563; margin-top: 3px; }
    .doc-header .meta { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.7; }

    table { width: 100%; border-collapse: collapse; }
    th { background: #991f23; color: #fff; padding: 8px 10px; text-align: left;
         font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 7px 10px; border-bottom: 1px solid #e6edf5; font-size: 11px; vertical-align: middle; }
    tr:nth-child(even) td { background: #f6f7fb; }
    .s-validated { color: #16a34a; font-weight: 700; }
    .s-rejected  { color: #dc2626; font-weight: 700; }
    .s-pending   { color: #d97706; font-weight: 700; }

    .doc-footer { margin-top: 18px; font-size: 10px; color: #9ca3af; text-align: center;
                  border-top: 1px solid #e6edf5; padding-top: 10px; }
    @media print {
      @page { margin: 15mm; }
      body::before { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="brand">
      ${logoImg}
      <div>
        <h1>Historique des Transactions</h1>
        ${userName ? `<p class="sub">Client : <strong>${userName}</strong></p>` : ''}
        <p class="sub">${rows.length} transaction(s) exportée(s)</p>
      </div>
    </div>
    <div class="meta">
      <div><strong>Papou Service</strong></div>
      <div>Exporté le ${now}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Référence</th>
        <th>Type</th>
        <th>Montant</th>
        <th>Numéro</th>
        <th>Date</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="doc-footer">Papou Service — Document généré automatiquement le ${now}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank', 'width=960,height=700');
    if (!win) { URL.revokeObjectURL(url); return; }
    win.addEventListener('afterprint', () => URL.revokeObjectURL(url));
    setTimeout(() => win.print(), 500);
  }

  // ---------- Navigation ----------
  goToDetails(transaction: any): void {
    if (transaction.transaction === 'DEPOT') {
      this.router.navigate(['/user/depot', transaction.id_transaction]);
    } else if (transaction.transaction === 'RETRAIT') {
      this.router.navigate(['/user/retrait', transaction.id_transaction]);
    }
  }
}
