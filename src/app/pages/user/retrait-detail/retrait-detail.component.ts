import { Component, OnInit } from '@angular/core';
import { ErrorService } from '../../../services/error.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Location } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatIcon } from "@angular/material/icon";
import { environment } from '../../../../environments/environment';

type TxState = 'PENDING' | 'VALIDATED' | 'REJECTED';

type Utilisateur = {
  idUtilisateur?: number;
  id_1XBET?: string;
  id_BETWINNER?: string;
  id_MELBET?: string;
  id_888STARZ?: string;
  numeroUtilisateur?: string;
  nomUtilisateur?: string;
  prenomUtilisateur?: string;
};

type Retrait = {
  idRetrait: number;
  numeroEnvoyant?: string;
  numeroInvite?: string;
  pays?: string;
  optionRetrait?: string;
  codeRetrait?: string;
  optionDeTransaction?: string;
  caisseChoisie?: string;
  dateRetrait?: string;
  file?: string | number[];
  capture?: string | number[];
  transactionState?: TxState;
  motifRejet?: string;
  motif?: string;
  isInvite?: boolean;
  nomInvite?: string;
  prenomInvite?: string;
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
  private readonly API = environment.apiBaseUrl;

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
    private location: Location, private errorService: ErrorService) {}

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

      // Parse le codeRetrait encodé "CODE||REF||Référence choisie"
      if (this.retrait.codeRetrait) {
        const parsed = this.parseCode(this.retrait.codeRetrait);
        this.retrait.codeRetrait = parsed.code || undefined;
        this.retrait.caisseChoisie = parsed.ref || undefined;
      }

      // Motif
      this.motif = (this.retrait.motifRejet ?? this.retrait.motif ?? '').trim();

      this.loading = false;
    } catch (e) {
      this.error = true;
      this.loading = false;
      this.showError('Erreur lors du chargement du retrait');
    }
  }

  /** GET avec fallback */
  private async getWithFallback<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.API}${path}`));
  }

  private async putWithFallback<T = void>(path: string, body: any): Promise<T> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return firstValueFrom(this.http.put<T>(`${this.API}${path}`, body, { headers }));
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

  /** Obtenir le nom complet de l'utilisateur */
  getNomUtilisateur(retrait: Retrait): string {
    if (retrait.isInvite) {
      return `${retrait.prenomInvite || ''} ${retrait.nomInvite || ''}`.trim() || '(Invité)';
    }
    const u = retrait.utilisateur;
    if (!u) return '—';
    return `${u.prenomUtilisateur || ''} ${u.nomUtilisateur || ''}`.trim() || '—';
  }

  getNumero(retrait: Retrait): string {
    return (retrait.isInvite ? retrait.numeroInvite : retrait.numeroEnvoyant) || '—';
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

    if (nouveauStatut === 'REJECTED' && !this.motif.trim()) {
      this.showError('Veuillez saisir un motif de rejet.');
      return;
    }

    const confirmation = confirm(
      `Êtes-vous sûr de vouloir ${nouveauStatut === 'VALIDATED' ? 'valider' : 'rejeter'} ce retrait ?`
    );

    if (!confirmation) return;

    const userId = this.retrait.utilisateur?.idUtilisateur ?? 0;
    let path = `/retraits/${userId}/${this.retrait.idRetrait}/${nouveauStatut}`;
    if (nouveauStatut === 'REJECTED') {
      path += `?motifRejet=${encodeURIComponent(this.motif.trim())}`;
    }

    this.changingStatus = true;

    try {
      await this.putWithFallback(path, {});
      if (this.retrait) {
        this.retrait.transactionState = nouveauStatut;
      }
      this.showSuccess(`Retrait ${nouveauStatut === 'VALIDATED' ? 'validé' : 'rejeté'} avec succès`);
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

  parseCode(raw?: string): { code: string; ref: string } {
    if (!raw) return { code: '', ref: '' };
    const idx = raw.indexOf('||REF||');
    if (idx === -1) return { code: raw, ref: '' };
    return { code: raw.substring(0, idx), ref: raw.substring(idx + 7) };
  }

  getOptionRetraitText(option?: string): string {
    if (!option) return '—';
    const options: { [key: string]: string } = {
      'O': 'Orange Money',
      'M': 'Moov Money',
      'W': 'Wave',
      'S': 'Sank Money',
      'C': 'Carte Bancaire'
    };
    return options[option] || option;
  }
}

