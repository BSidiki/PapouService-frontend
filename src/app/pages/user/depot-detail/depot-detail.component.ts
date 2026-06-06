import { Component, OnInit } from '@angular/core';
import { ErrorService } from '../../../services/error.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Location } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatIcon } from "@angular/material/icon";
import { environment } from '../../../../environments/environment';

type Utilisateur = {
  idUtilisateur?: number;
  id_1XBET?: string; id_BETWINNER?: string; id_MELBET?: string; id_888STARZ?: string;
  numeroUtilisateur?: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
};

type Depot = {
  idDepot: number;
  montant?: number;
  numeroEnvoyant?: string;
  numeroInvite?: string;
  pays?: string;
  optionDepot?: string;
  optionDeTransaction?: string;
  idPlateforme?: string;
  dateDepot?: string;
  capture?: string | number[];
  file?: string | number[];
  transactionState?: 'PENDING'|'VALIDATED'|'REJECTED';
  motifRejet?: string;
  motif?: string;
  isInvite?: boolean;
  nomInvite?: string;
  prenomInvite?: string;
  utilisateur?: Utilisateur | null;
};

@Component({
  selector: 'app-depot-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatIcon
],
  templateUrl: './depot-detail.component.html',
  styleUrls: ['./depot-detail.component.scss']
})
export class DepotDetailComponent implements OnInit {
  private readonly API = environment.apiBaseUrl;

  depot: Depot | null = null;
  motif = '';
  zoomed = false;
  imageLoading = true;

  loading = true;
  error = false;
  changingStatus = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private location: Location, private errorService: ErrorService) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = true;
      this.loading = false;
      return;
    }

    try {
      this.depot = await this.getWithFallback<Depot>(`/depots/${id}`);

      // Support de champs variables pour l'image
      const img = this.depot.capture ?? this.depot.file ?? null;
      if (img != null) this.depot.capture = img;

      // Motif
      this.motif = (this.depot.motifRejet ?? this.depot.motif ?? '').trim();

      this.loading = false;
    } catch (e) {
      this.error = true;
      this.loading = false;
      this.showError('Erreur lors du chargement du dépôt');
    }
  }

  private async getWithFallback<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.API}${path}`));
  }

  private async putWithFallback<T = void>(path: string, body: any): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${this.API}${path}`, body));
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
  }

  goBack() {
    this.location.back();
  }

  toggleZoom() {
    this.zoomed = !this.zoomed;
  }

  /** Normalise les valeurs plateforme venant du backend */
  private normalizePlatform(p?: string): 'IXBET'|'BETWINNER'|'MELBET'|'IWIN'|'STARZ'|'—' {
    if (!p) return '—';
    const up = p.toUpperCase();
    if (up === '1XBET' || up === 'IXBET') return 'IXBET';
    if (up === 'BETWINNER') return 'BETWINNER';
    if (up === 'MELBET') return 'MELBET';
    if (up === '1WIN' || up === 'IWIN') return 'IWIN';
    if (up === '888STARZ' || up === 'STARZ') return 'STARZ';
    return '—';
  }

  /** Récupère l'ID plateforme */
  getIdPlateforme(depot: Depot): string {
    if (depot.isInvite) return depot.idPlateforme || '—';
    const u = depot.utilisateur ?? undefined;
    if (!u) return '—';
    const plat = this.normalizePlatform(depot.optionDeTransaction);
    switch (plat) {
      case 'IXBET':     return u.id_1XBET      || '—';
      case 'BETWINNER': return u.id_BETWINNER  || '—';
      case 'MELBET':    return u.id_MELBET     || '—';
      case 'IWIN':
      case 'STARZ':     return u.id_888STARZ   || '—';
      default:          return '—';
    }
  }

  /** Obtenir le nom complet de l'utilisateur */
  getNomUtilisateur(depot: Depot): string {
    if (depot.isInvite) {
      return `${depot.prenomInvite || ''} ${depot.nomInvite || ''}`.trim() || '(Invité)';
    }
    const u = depot.utilisateur;
    if (!u) return '—';
    return `${u.prenomUtilisateur || ''} ${u.nomUtilisateur || ''}`.trim() || '—';
  }

  getNumero(depot: Depot): string {
    return (depot.isInvite ? depot.numeroInvite : depot.numeroEnvoyant) || '—';
  }

  getOptionDepotText(option?: string): string {
    if (!option) return '—';
    const labels: Record<string, string> = {
      O: 'Orange Money', M: 'Moov Money', W: 'Wave', S: 'Sank Money', C: 'Carte Bancaire'
    };
    return labels[option] ?? option;
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
  async changerStatut(nouveauStatut: 'VALIDATED' | 'REJECTED') {
    if (!this.depot) return;

    if (nouveauStatut === 'REJECTED' && !this.motif.trim()) {
      this.showError('Veuillez saisir un motif de rejet.');
      return;
    }

    const confirmation = confirm(
      `Êtes-vous sûr de vouloir ${nouveauStatut === 'VALIDATED' ? 'valider' : 'rejeter'} ce dépôt ?`
    );

    if (!confirmation) return;

    const userId = this.depot.utilisateur?.idUtilisateur ?? 0;
    let path = `/depots/${userId}/${this.depot.idDepot}/${nouveauStatut}`;
    if (nouveauStatut === 'REJECTED') {
      path += `?motifRejet=${encodeURIComponent(this.motif.trim())}`;
    }

    this.changingStatus = true;

    try {
      await this.putWithFallback(path, {});
      this.depot.transactionState = nouveauStatut;
      this.showSuccess(`Dépôt ${nouveauStatut === 'VALIDATED' ? 'validé' : 'rejeté'} avec succès`);
    } catch (error) {
      this.showError('Erreur lors du changement de statut');
    } finally {
      this.changingStatus = false;
    }
  }

  private showSuccess(message: string) {
    this.errorService.success(message);
  }

  private showError(message: string) {
    this.errorService.toast(message, "danger", 5000);
  }

  // Helper pour les classes CSS
  getStatusClass(): string {
    if (!this.depot) return '';
    return this.depot.transactionState?.toLowerCase() || '';
  }

  getStatusIcon(): string {
    if (!this.depot) return '❓';
    switch (this.depot.transactionState) {
      case 'PENDING': return '⏳';
      case 'VALIDATED': return '✅';
      case 'REJECTED': return '❌';
      default: return '❓';
    }
  }

  getStatusText(): string {
    if (!this.depot) return 'Inconnu';
    switch (this.depot.transactionState) {
      case 'PENDING': return 'En attente';
      case 'VALIDATED': return 'Validé';
      case 'REJECTED': return 'Rejeté';
      default: return 'Inconnu';
    }
  }
}

