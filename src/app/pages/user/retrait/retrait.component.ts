import { AuthService } from './../../../services/auth.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AnnoncesPublicComponent } from '../../annonces/annonces-public.component';
import { MatchsComponent } from '../../matchs/matchs.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { firstValueFrom } from 'rxjs';

type Opt = { label: string; value: string; id: string | null };

@Component({
  selector: 'app-retrait',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    RouterModule,
    AnnoncesPublicComponent,
    MatchsComponent,
    FooterComponent
  ],
  templateUrl: './retrait.component.html',
  styleUrls: ['./retrait.component.scss']
})
export class RetraitComponent {
  private readonly API_HOSTS = [
    'http://192.168.11.124:8080',
    'http://192.168.11.119:8080'
  ];

  form: {
    numeroEnvoyant: string;
    pays: string;
    indicatif: string;
    optionRetrait: 'O' | 'M' | 'W' | 'S' | 'C' | '';
    codeRetrait: string;
    montant: number | null;
    optionDeTransaction: '1XBET' | 'BETWINNER' | 'MELBET' | '1WIN' | '888STARZ' | '';
  } = {
    numeroEnvoyant: '',
    pays: '',
    indicatif: '',
    optionRetrait: '',
    codeRetrait: '',
    montant: null,
    optionDeTransaction: ''
  };

  file: File | null = null;
  userId = 0;
  userInfo = '';
  submitting = false;
  filePreview: string | null = null;

  transactionOptionsDisponibles: Opt[] = [];

  paysOptions = [
    { nom: 'Burkina Faso', indicatif: '+226' },
    { nom: "Côte d'Ivoire", indicatif: '+225' },
    { nom: 'Togo', indicatif: '+228' },
    { nom: 'Bénin', indicatif: '+229' }
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private snackBar: MatSnackBar
  ) {
    const user = this.auth.getUser();
    if (user) {
      this.userId = user.idUtilisateur;
      this.userInfo = `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim();
      this.transactionOptionsDisponibles = [
        { label: '1XBET', value: '1XBET', id: user.id_1XBET },
        { label: 'BETWINNER', value: 'BETWINNER', id: user.id_BETWINNER },
        { label: 'MELBET', value: 'MELBET', id: user.id_MELBET },
        { label: '1WIN', value: '1WIN', id: user.id_1WIN },
        { label: '888STARZ', value: '888STARZ', id: user.id_888STARZ }
      ].filter(o => !!o.id);
    }
  }

  onFileSelected(event: any) {
    const f: File | undefined = event?.target?.files?.[0];
    if (!f) {
      this.file = null;
      this.filePreview = null;
      return;
    }

    // Validation du fichier (si l'utilisateur en choisit un)
    if (!f.type.startsWith('image/')) {
      this.showError('Veuillez choisir une image (PNG, JPG, JPEG, WebP).');
      event.target.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.showError('Fichier trop volumineux (maximum 5 Mo).');
      event.target.value = '';
      return;
    }

    this.file = f;

    // Aperçu de l'image
    const reader = new FileReader();
    reader.onload = () => (this.filePreview = reader.result as string);
    reader.readAsDataURL(f);
  }

  onPaysChange() {
    const selected = this.paysOptions.find(p => p.nom === this.form.pays);
    this.form.indicatif = selected?.indicatif || '';
  }

  /** Validation : le justificatif n'est plus obligatoire */
  private validate(): string | null {
    if (this.transactionOptionsDisponibles.length === 0) {
      return "Vous n'avez aucun ID de plateforme configuré dans votre profil.";
    }
    if (!this.form.pays) return 'Veuillez sélectionner un pays.';
    if (!this.form.indicatif) return "L\'indicatif n\'est pas défini.";
    if (!this.form.numeroEnvoyant || this.form.numeroEnvoyant.replace(/\D/g, '').length < 8) {
      return 'Numéro de téléphone incomplet.';
    }
    if (!this.form.optionDeTransaction) return 'Veuillez choisir une plateforme.';
    if (!this.form.optionRetrait) return 'Veuillez choisir une option de retrait.';
    if (!this.form.codeRetrait) return 'Le code de retrait est requis.';
    if (!this.form.montant || this.form.montant <= 0) return 'Montant invalide.';
    // justificatif : recommandé mais pas obligatoire -> pas de retour d'erreur ici
    return null;
  }

  private async postWithFallback(path: string, body: FormData): Promise<void> {
    for (const host of this.API_HOSTS) {
      try {
        await firstValueFrom(this.http.post(`${host}${path}`, body));
        return;
      } catch (error) {
        console.warn(`Hôte ${host} inaccessible, tentative suivante...`);
        continue;
      }
    }
    throw new Error('POST échoué sur tous les hôtes');
  }

  async submitRetrait() {
    const err = this.validate();
    if (err) {
      this.showError(err);
      return;
    }

    this.submitting = true;

    try {
      const numeroComplet = `${this.form.indicatif}${this.form.numeroEnvoyant}`;
      const fd = new FormData();

      fd.append('numeroEnvoyant', numeroComplet);
      fd.append('pays', this.form.pays);
      fd.append('optionRetrait', this.form.optionRetrait);
      fd.append('codeRetrait', this.form.codeRetrait);
      fd.append('montant', String(this.form.montant ?? ''));
      fd.append('optionDeTransaction', this.form.optionDeTransaction);

      // ✅ N'ajouter le fichier que s'il est présent
      if (this.file) {
        fd.append('file', this.file);
      }

      await this.postWithFallback(`/retraitsuser/${this.userId}`, fd);

      this.showSuccess('✅ Retrait soumis avec succès !');
      this.resetForm();
    } catch (error) {
      console.error('Erreur retrait:', error);
      this.showError(
        '❌ Erreur lors du retrait. Veuillez vérifier les informations et réessayer.'
      );
    } finally {
      this.submitting = false;
    }
  }

  private resetForm() {
    this.form = {
      numeroEnvoyant: '',
      pays: '',
      indicatif: '',
      optionRetrait: '',
      codeRetrait: '',
      montant: null,
      optionDeTransaction: ''
    };
    this.file = null;
    this.filePreview = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(`⚠️ ${message}`, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  getOptionRetraitText(option: string): string {
    const options: { [key: string]: string } = {
      O: 'Orange Money',
      M: 'Moov Money',
      W: 'Wave',
      S: 'Sank Money',
      C: 'Carte Bancaire'
    };
    return options[option] || option;
  }

  getPlatformLogo(platform: string): string {
    return `assets/images/${platform}.png`;
  }

  getPaymentLogo(option: string): string {
    const logos: { [key: string]: string } = {
      O: 'assets/images/OrangeMoney.png',
      M: 'assets/images/MoovMoney.png',
      W: 'assets/images/WaveMoney.png',
      S: 'assets/images/SankMoney.jpeg',
      C: 'assets/images/CarteBancaire.jpeg'
    };
    return logos[option] || '';
  }

  /** Désormais, le fichier n'est plus obligatoire */
  isSubmitDisabled(): boolean {
    return (
      !this.userId ||
      !this.form.pays ||
      !this.form.numeroEnvoyant ||
      !this.form.optionDeTransaction ||
      !this.form.optionRetrait ||
      !this.form.codeRetrait ||
      !this.form.montant ||
      this.form.montant <= 0 ||
      this.submitting
    );
  }
}
