import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ModalController } from '@ionic/angular/standalone';
import { Observable, forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { DepotService } from '../../../services/depot.service';
import { RetraitService } from '../../../services/retrait.service';
import { AuthService } from '../../../services/auth.service';
import { ErrorService } from '../../../services/error.service';
import { MotifRejetDialogComponent } from '../../../shared/dialogs/motif-rejet-dialog.component';
import { Depot, Retrait, Utilisateur } from '../../../models';

@Component({
  selector: 'app-admin-validations',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatSelectModule, MatCardModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatIconModule
  ],
  templateUrl: './admin-validations.component.html',
  styleUrls: ['./admin-validations.component.scss']
})
export class AdminValidationsComponent implements OnInit {
  private isDepot(t: Depot | Retrait): t is Depot {
    return (t as Depot).idDepot !== undefined;
  }

  filter: 'DEPOT' | 'RETRAIT' = 'DEPOT';
  transactions: Array<Depot | Retrait> = [];
  loading = false;
  processingIds = new Set<number>();
  private adminId = 0;

  private readonly fidelityThresholds = [100_000, 1_000_000, 5_000_000, 10_000_000, 20_000_000];
  private fidelityMap = new Map<number, number>();

  constructor(
    private depotService: DepotService,
    private retraitService: RetraitService,
    private router: Router,
    private errorService: ErrorService,
    private modalController: ModalController,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.adminId = this.auth.getUser()?.idUtilisateur ?? 0;
    this.chargerTransactions();
  }

  onFilterChange() { this.chargerTransactions(); }

  chargerTransactions() {
    this.loading = true;
    const transactions$: Observable<any[]> = this.filter === 'DEPOT'
      ? this.depotService.getAll()
      : this.retraitService.getAll();

    forkJoin({
      transactions: transactions$,
      allDepots: this.depotService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ transactions, allDepots }) => {
        const totals = new Map<number, number>();
        for (const d of (allDepots ?? [])) {
          if (d.transactionState === 'VALIDATED' && d.utilisateur?.idUtilisateur) {
            const prev = totals.get(d.utilisateur.idUtilisateur) ?? 0;
            totals.set(d.utilisateur.idUtilisateur, prev + (d.montant ?? 0));
          }
        }
        this.fidelityMap = new Map<number, number>();
        for (const [userId, total] of totals.entries()) {
          this.fidelityMap.set(userId, this.fidelityThresholds.filter(t => total >= t).length);
        }

        this.transactions = (transactions || [])
          .filter((t: any) => (t.transactionState ?? 'PENDING') === 'PENDING')
          .sort((a: any, b: any) => {
            const starsA = this.getFidelityLevel(a);
            const starsB = this.getFidelityLevel(b);
            if (starsB !== starsA) return starsB - starsA;
            const da = this.dateOf(a) ? new Date(this.dateOf(a)!).getTime() : 0;
            const db = this.dateOf(b) ? new Date(this.dateOf(b)!).getTime() : 0;
            return da - db;
          });
        this.loading = false;
      },
      error: () => {
        this.errorService.toast('Erreur lors du chargement des transactions.', 'danger', 3000);
        this.loading = false;
      }
    });
  }

  getFidelityLevel(t: Depot | Retrait): number {
    const userId = (t as any).utilisateur?.idUtilisateur;
    return userId ? (this.fidelityMap.get(userId) ?? 0) : 0;
  }

  getFidelityStars(t: Depot | Retrait): string {
    return '★'.repeat(this.getFidelityLevel(t));
  }

  private getIds(t: Depot | Retrait): { id: number; userId: number; type: 'DEPOT' | 'RETRAIT' } {
    if (this.filter === 'DEPOT') {
      const d = t as Depot;
      return { id: d.idDepot, userId: d.utilisateur?.idUtilisateur ?? this.adminId, type: 'DEPOT' };
    } else {
      const r = t as Retrait;
      return { id: r.idRetrait, userId: r.utilisateur?.idUtilisateur ?? this.adminId, type: 'RETRAIT' };
    }
  }

  isProcessing(t: Depot | Retrait): boolean {
    return this.processingIds.has(this.getIds(t).id);
  }

  validerTransaction(t: Depot | Retrait) {
    const { id, userId, type } = this.getIds(t);
    if (this.processingIds.has(id)) return;
    this.processingIds.add(id);

    const request$ = type === 'DEPOT'
      ? this.depotService.updateState(userId, id, 'VALIDATED')
      : this.retraitService.updateState(userId, id, 'VALIDATED');

    request$.subscribe({
      next: () => {
        this.transactions = this.transactions.filter(x => this.getIds(x).id !== id);
        this.processingIds.delete(id);
        this.errorService.success('Transaction validée avec succès.');
      },
      error: () => {
        this.processingIds.delete(id);
        this.errorService.toast('Erreur lors de la validation.', 'danger', 3000);
      }
    });
  }

  async rejeterTransaction(t: Depot | Retrait) {
    const { id, userId, type } = this.getIds(t);
    if (this.processingIds.has(id)) return;

    const modal = await this.modalController.create({
      component: MotifRejetDialogComponent,
      componentProps: { type: type === 'DEPOT' ? 'Dépôt' : 'Retrait' },
      cssClass: 'motif-modal'
    });
    await modal.present();
    const { data: motif } = await modal.onDidDismiss<string>();
    if (!motif) return;

    this.processingIds.add(id);
    const request$ = type === 'DEPOT'
      ? this.depotService.updateState(userId, id, 'REJECTED', motif)
      : this.retraitService.updateState(userId, id, 'REJECTED', motif);

    request$.subscribe({
      next: () => {
        this.transactions = this.transactions.filter(x => this.getIds(x).id !== id);
        this.processingIds.delete(id);
        this.errorService.toast(`Transaction rejetée | Motif: ${motif}`, 'warning', 5000);
      },
      error: () => {
        this.processingIds.delete(id);
        this.errorService.toast('Erreur lors du rejet.', 'danger', 3000);
      }
    });
  }

  voirDetails(t: any) {
    if (this.filter === 'DEPOT') this.router.navigate(['/user/depot', t.idDepot]);
    else this.router.navigate(['/user/retrait', t.idRetrait]);
  }

  getImageSrc(t: Depot | Retrait): string | null {
    const raw = (this.filter === 'DEPOT') ? (t as Depot).capture : (t as Retrait).file;
    return raw ? `data:image/jpeg;base64,${raw}` : null;
  }

  dateOf(t: Depot | Retrait): string | null {
    return this.isDepot(t) ? (t.dateDepot ?? null) : (t.dateRetrait ?? null);
  }

  isInvite(t: Depot | Retrait): boolean {
    return (t as any).isInvite === true || (!(t as any).utilisateur && !!(t as any).numeroInvite);
  }

  getNomClient(t: Depot | Retrait): string {
    if (this.isInvite(t)) {
      const prenom = (t as any).prenomInvite ?? '';
      const nom = (t as any).nomInvite ?? '';
      return `${prenom} ${nom}`.trim() || '(Invité)';
    }
    const u = (t as any).utilisateur;
    return u ? `${u.prenomUtilisateur ?? ''} ${u.nomUtilisateur ?? ''}`.trim() || '—' : '—';
  }

  getNumero(t: Depot | Retrait): string {
    if (this.isInvite(t)) return (t as any).numeroInvite || '—';
    return (t as any).numeroEnvoyant || '—';
  }

  parseCode(raw?: string): { code: string; ref: string } {
    if (!raw) return { code: '', ref: '' };
    const idx = raw.indexOf('||REF||');
    if (idx === -1) return { code: raw, ref: '' };
    return { code: raw.substring(0, idx), ref: raw.substring(idx + 7) };
  }

  getCodeRetrait(t: Depot | Retrait): string {
    return this.parseCode((t as Retrait).codeRetrait).code;
  }

  getCaisseChoisie(t: Depot | Retrait): string {
    return this.parseCode((t as Retrait).codeRetrait).ref || '—';
  }

  getIdPlateforme(t: Depot | Retrait): string {
    const u = (t as any).utilisateur as Utilisateur | undefined;
    if (!u) return '—';
    const p = ((t as any).optionDeTransaction || '').toString().toUpperCase();
    switch (p) {
      case '1XBET':
      case 'IXBET':     return u.id_1XBET || '—';
      case 'BETWINNER': return u.id_BETWINNER || '—';
      case 'MELBET':    return u.id_MELBET || '—';
      case '888STARZ':
      case 'STARZ':     return u.id_888STARZ || '—';
      default:          return '—';
    }
  }
}
