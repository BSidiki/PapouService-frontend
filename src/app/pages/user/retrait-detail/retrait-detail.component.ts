import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule, formatDate } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatIcon } from "@angular/material/icon";

type Platform = 'IXBET' | 'BETWINNER' | 'MELBET' | 'IWIN' | 'STARZ' | '—';
type TxState = 'PENDING' | 'VALIDATED' | 'REJECTED';

type Utilisateur = {
  idUtilisateur?: number;
  id_1XBET?: string;
  id_BETWINNER?: string;
  id_MELBET?: string;
  id_1WIN?: string;
  id_888STARZ?: string;
  numeroUtilisateur?: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
};

type Retrait = {
  idRetrait: number;
  montant?: number;
  numeroEnvoyant?: string;
  pays?: string;
  optionRetrait?: string;
  optionDeTransaction?: string;
  dateRetrait?: string;
  file?: string | number[];
  capture?: string | number[];
  transactionState?: TxState;
  motifRejet?: string;
  motif?: string;
  utilisateur?: Utilisateur | null;
};

@Component({
  selector: 'app-retrait-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatIcon
],
  templateUrl: './retrait-detail.component.html',
  styleUrls: ['./retrait-detail.component.scss']
})
export class RetraitDetailComponent implements OnInit {
  private readonly API_HOSTS = [
    'http://192.168.11.124:8080',
    'http://192.168.11.119:8080'
  ];

  retrait: Retrait | null = null;
  motif = '';
  zoomed = false;
  imageLoading = true;

  loading = true;
  error = false;
  changingStatus = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = true;
      this.loading = false;
      return;
    }

    try {
      this.retrait = await this.getWithFallback<Retrait>(`/retraits/${id}`);

      // Support de champs variables pour l'image
      const img = this.retrait.file ?? this.retrait.capture ?? null;
      if (img != null) this.retrait.file = img;

      // Motif
      this.motif = (this.retrait.motifRejet ?? this.retrait.motif ?? '').trim();

      this.loading = false;
    } catch (e) {
      console.error('Erreur chargement retrait:', e);
      this.error = true;
      this.loading = false;
      this.showError('Erreur lors du chargement du retrait');
    }
  }

  /** GET avec fallback multi-hôtes */
  private async getWithFallback<T>(path: string): Promise<T> {
    let lastError: unknown;
    for (const host of this.API_HOSTS) {
      try {
        return await firstValueFrom(this.http.get<T>(`${host}${path}`));
      } catch (e) {
        lastError = e;
        console.warn(`Hôte ${host} inaccessible, tentative suivante...`);
      }
    }
    throw lastError;
  }

  private async putWithFallback<T = void>(path: string, body: any): Promise<T> {
    let lastError: unknown;
    for (const host of this.API_HOSTS) {
      try {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return await firstValueFrom(this.http.put<T>(`${host}${path}`, body, { headers }));
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }

  /** Base64 safe: string ou tableau d'octets */
  toBase64(media: string | number[] | undefined | null): string {
    if (!media) return '';
    if (typeof media === 'string') return 'data:image/jpeg;base64,' + media;
    // number[] → base64
    const u8 = new Uint8Array(media as number[]);
    let binary = '';
    for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
    return 'data:image/jpeg;base64,' + btoa(binary);
  }

  onImageLoad() {
    this.imageLoading = false;
  }

  onImageError() {
    this.imageLoading = false;
    console.warn('Erreur de chargement de l\'image');
  }

  goBack() {
    this.location.back();
  }

  toggleZoom() {
    this.zoomed = !this.zoomed;
  }

  /** Normalise les valeurs plateforme venant du backend */
  normalizePlatform(p?: string): Platform {
    if (!p) return '—';
    const up = p.toUpperCase();
    if (up === '1XBET' || up === 'IXBET') return 'IXBET';
    if (up === 'BETWINNER') return 'BETWINNER';
    if (up === 'MELBET') return 'MELBET';
    if (up === '1WIN' || up === 'IWIN') return 'IWIN';
    if (up === '888STARZ' || up === 'STARZ') return 'STARZ';
    return '—';
  }

  /** Récupère l'ID plateforme depuis l'utilisateur */
  getIdPlateforme(retrait: Retrait): string {
    const u = retrait.utilisateur ?? undefined;
    const plat = this.normalizePlatform(retrait.optionDeTransaction);
    if (!u) return '—';
    switch (plat) {
      case 'IXBET': return u.id_1XBET     || '—';
      case 'BETWINNER': return u.id_BETWINNER || '—';
      case 'MELBET': return u.id_MELBET   || '—';
      case 'IWIN': return u.id_1WIN       || '—';
      case 'STARZ': return u.id_888STARZ  || '—';
      default: return '—';
    }
  }

  /** Obtenir le nom complet de l'utilisateur */
  getNomUtilisateur(retrait: Retrait): string {
    const u = retrait.utilisateur;
    if (!u) return '—';
    return `${u.prenomUtilisateur || ''} ${u.nomUtilisateur || ''}`.trim() || '—';
  }

  /** Formater la date */
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
    } catch {
      return dateString;
    }
  }

  /** Valider/Rejeter */
  async changerStatut(nouveauStatut: TxState) {
    if (!this.retrait) return;

    const confirmation = confirm(
      `Êtes-vous sûr de vouloir ${nouveauStatut === 'VALIDATED' ? 'valider' : 'rejeter'} ce retrait ?`
    );

    if (!confirmation) return;

    const userId = this.retrait.utilisateur?.idUtilisateur ?? 0;
    const path = `/retraits/${userId}/${this.retrait.idRetrait}/${nouveauStatut}`;

    this.changingStatus = true;

    try {
      await this.putWithFallback(path, nouveauStatut === 'REJECTED' ? { motif: this.motif || 'Rejeté' } : {});
      if (this.retrait) {
        this.retrait.transactionState = nouveauStatut;
      }
      this.showSuccess(`Retrait ${nouveauStatut === 'VALIDATED' ? 'validé' : 'rejeté'} avec succès`);
    } catch (error) {
      console.error('Erreur changement statut:', error);
      this.showError('Erreur lors du changement de statut');
    } finally {
      this.changingStatus = false;
    }
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Helper pour les classes CSS
  getStatusClass(): string {
    if (!this.retrait) return '';
    return this.retrait.transactionState?.toLowerCase() || '';
  }

  getStatusIcon(): string {
    if (!this.retrait) return '❓';
    switch (this.retrait.transactionState) {
      case 'PENDING': return '⏳';
      case 'VALIDATED': return '✅';
      case 'REJECTED': return '❌';
      default: return '❓';
    }
  }

  getStatusText(): string {
    if (!this.retrait) return 'Inconnu';
    switch (this.retrait.transactionState) {
      case 'PENDING': return 'En attente';
      case 'VALIDATED': return 'Validé';
      case 'REJECTED': return 'Rejeté';
      default: return 'Inconnu';
    }
  }

  getOptionRetraitText(option?: string): string {
    if (!option) return '—';
    const options: { [key: string]: string } = {
      'O': 'Orange Money',
      'M': 'Moov Money',
      'W': 'Wave',
      'S': 'Stripe',
      'C': 'Carte Bancaire'
    };
    return options[option] || option;
  }
}
