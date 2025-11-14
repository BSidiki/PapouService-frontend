import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

type TransactionState = 'PENDING' | 'VALIDATED' | 'REJECTED';
type Platform = 'IXBET' | 'BETWINNER' | 'MELBET' | 'IWIN' | 'STARZ' | '—';

type Utilisateur = {
  idUtilisateur: number;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
  id_1XBET?: string; id_BETWINNER?: string; id_MELBET?: string; id_1WIN?: string; id_888STARZ?: string;
};

type Depot = {
  idDepot: number;
  montant: number;
  numeroEnvoyant?: string;
  dateDepot?: string;
  optionDeTransaction?: string;
  utilisateur?: Utilisateur;
  transactionState?: TransactionState;
  capture?: string; // base64
  pays?: string;
};

type Retrait = {
  idRetrait: number;
  montant: number;
  numeroEnvoyant?: string;
  dateRetrait?: string;
  optionDeTransaction?: string;
  utilisateur?: Utilisateur;
  transactionState?: TransactionState;
  file?: string; // base64
  pays?: string;
};

@Component({
  selector: 'app-admin-validations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatCardModule, MatButtonModule],
  templateUrl: './admin-validations.component.html',
  styleUrls: ['./admin-validations.component.scss']
})
export class AdminValidationsComponent implements OnInit {

  /** ⚙️ Adapte seulement cette base si besoin */
  private readonly API = 'http://192.168.11.124:8080';

  private isDepot(t: Depot | Retrait): t is Depot {
    return (t as Depot).idDepot !== undefined;
  }
  private isRetrait(t: Depot | Retrait): t is Retrait {
    return (t as Retrait).idRetrait !== undefined;
  }

  filter: 'DEPOT' | 'RETRAIT' = 'DEPOT';
  transactions: Array<Depot | Retrait> = [];
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void { this.chargerTransactions(); }

  onFilterChange() { this.chargerTransactions(); }

  // chargerTransactions() {
  //   this.loading = true;
  //   const endpoint = this.filter === 'DEPOT' ? `${this.API}/depots` : `${this.API}/retraits`;

  //   this.http.get<any[]>(endpoint).subscribe({
  //     next: data => {
  //       // On garde uniquement les PENDING
  //       this.transactions = (data || []).filter(t => (t.transactionState ?? 'PENDING') === 'PENDING')
  //         // tri par date décroissante (prend en compte les 2 modèles)
  //         .sort((a: any, b: any) => {
  //           const da = new Date(a.dateDepot || a.dateRetrait || 0).getTime();
  //           const db = new Date(b.dateDepot || b.dateRetrait || 0).getTime();
  //           return db - da;
  //         });
  //       this.loading = false;
  //     },
  //     error: () => {
  //       alert('Erreur lors du chargement des transactions.');
  //       this.loading = false;
  //     }
  //   });
  // }

  chargerTransactions() {
    this.loading = true;
    const endpoint = this.filter === 'DEPOT' ? `${this.API}/depots` : `${this.API}/retraits`;

    this.http.get<any[]>(endpoint).subscribe({
      next: data => {
        this.transactions = (data || [])
          .filter(t => (t.transactionState ?? 'PENDING') === 'PENDING')
          // ✅ tri via helper pour éviter l’accès direct dans le template
          .sort((a, b) => {
            const da = this.dateOf(a) ? new Date(this.dateOf(a)!).getTime() : 0;
            const db = this.dateOf(b) ? new Date(this.dateOf(b)!).getTime() : 0;
            return db - da;
          });
        this.loading = false;
      },
      error: () => {
        alert('Erreur lors du chargement des transactions.');
        this.loading = false;
      }
    });
  }

  /** Raccourci: ID transaction + userId + type */
  private getIds(t: Depot | Retrait): { id: number, userId: number | null, type: 'DEPOT' | 'RETRAIT' } {
    if (this.filter === 'DEPOT') {
      const d = t as Depot;
      return { id: d.idDepot, userId: d.utilisateur?.idUtilisateur ?? null, type: 'DEPOT' };
    } else {
      const r = t as Retrait;
      return { id: r.idRetrait, userId: r.utilisateur?.idUtilisateur ?? null, type: 'RETRAIT' };
    }
  }

  /** Validation (PUT /depots/{userId}/{id}/VALIDATED) ou /retraits/... */
  validerTransaction(t: Depot | Retrait) {
    const { id, userId, type } = this.getIds(t);
    if (!userId) { alert('Utilisateur introuvable pour cette transaction.'); return; }
    const url = type === 'DEPOT'
      ? `${this.API}/depots/${userId}/${id}/VALIDATED`
      : `${this.API}/retraits/${userId}/${id}/VALIDATED`;

    this.http.put(url, {}).subscribe({
      next: () => {
        // retire de la liste localement
        this.transactions = this.transactions.filter(x => this.getIds(x).id !== id);
        alert('✅ Validé avec succès.');
      },
      error: () => alert('Erreur lors de la validation.')
    });
  }

  /** Rejet simple (si ton backend gère un body { motif }, tu peux dé-commenter) */
  rejeterTransaction(t: Depot | Retrait) {
    const { id, userId, type } = this.getIds(t);
    if (!userId) { alert('Utilisateur introuvable pour cette transaction.'); return; }
    const url = type === 'DEPOT'
      ? `${this.API}/depots/${userId}/${id}/REJECTED`
      : `${this.API}/retraits/${userId}/${id}/REJECTED`;

    // const motif = prompt('Motif du rejet ? (optionnel)');
    // const body = motif ? { motif } : {};
    const body = {};
    this.http.put(url, body).subscribe({
      next: () => {
        this.transactions = this.transactions.filter(x => this.getIds(x).id !== id);
        alert('❌ Rejeté avec succès.');
      },
      error: () => alert('Erreur lors du rejet.')
    });
  }

  /** Navigation vers la page de détail */
  voirDetails(t: any) {
    if (this.filter === 'DEPOT') this.router.navigate(['/user/depot', t.idDepot]);
    else this.router.navigate(['/user/retrait', t.idRetrait]);
  }

  /** Base64 d’illustration (capture pour dépôt, file pour retrait) */
  getImageSrc(t: Depot | Retrait): string | null {
    const raw = (this.filter === 'DEPOT') ? (t as Depot).capture : (t as Retrait).file;
    return raw ? `data:image/jpeg;base64,${raw}` : null;
  }

  /** ✅ Date pour tri/affichage */
  dateOf(t: Depot | Retrait): string | null {
    return this.isDepot(t) ? (t.dateDepot ?? null) : (t.dateRetrait ?? null);
  }

  /** ✅ Image base64 pour vignette */
  // getImageSrc(t: Depot | Retrait): string | null {
  //   const raw = this.isDepot(t) ? t.capture : t.file;
  //   return raw ? `data:image/jpeg;base64,${raw}` : null;
  // }

  /** Affiche l’ID plateforme du user selon la plateforme de la transaction */
  // getIdPlateforme(t: Depot | Retrait): string {
  //   const u = (t as any).utilisateur as Utilisateur | undefined;
  //   if (!u) return '—';
  //   const p = ((t as any).optionDeTransaction || '').toString().toUpperCase();
  //   switch (p) {
  //     case '1XBET': case 'IXBET': return u.id_1XBET || '—';
  //     case 'BETWINNER':           return u.id_BETWINNER || '—';
  //     case 'MELBET':              return u.id_MELBET || '—';
  //     case '1WIN': case 'IWIN':   return u.id_1WIN || '—';
  //     case '888STARZ': case 'STARZ': return u.id_888STARZ || '—';
  //     default: return '—';
  //   }
  // }

  /** ✅ ID plateforme selon la plateforme et l’utilisateur */
  getIdPlateforme(t: Depot | Retrait): string {
    const u = (t as any).utilisateur as Utilisateur | undefined;
    if (!u) return '—';
    const p = ((t as any).optionDeTransaction || '').toString().toUpperCase();
    switch (p) {
      case '1XBET':
      case 'IXBET':   return u.id_1XBET || '—';
      case 'BETWINNER': return u.id_BETWINNER || '—';
      case 'MELBET':    return u.id_MELBET || '—';
      case '1WIN':
      case 'IWIN':      return u.id_1WIN || '—';
      case '888STARZ':
      case 'STARZ':     return u.id_888STARZ || '—';
      default:          return '—';
    }
  }
}
