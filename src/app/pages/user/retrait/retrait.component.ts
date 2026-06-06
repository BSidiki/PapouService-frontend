import { AuthService } from './../../../services/auth.service';
import { RetraitService } from '../../../services/retrait.service';
import { ErrorService } from '../../../services/error.service';
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AnnoncesPublicComponent } from '../../annonces/annonces-public.component';
import { MatchsComponent } from '../../matchs/matchs.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { firstValueFrom } from 'rxjs';
import { PlatformRef } from '../../../models';
import { PLATFORM_CAISSES, buildCaisseKey } from '../../../config/platform-caisses';

type Opt = { label: string; value: string };

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
export class RetraitComponent implements OnDestroy {
  form: {
    numeroEnvoyant: string;
    pays: string;
    indicatif: string;
    optionRetrait: 'O' | 'M' | 'W' | 'S' | 'C' | '';
    codeRetrait: string;
    optionDeTransaction: '1XBET' | 'BETWINNER' | 'MELBET' | '888STARZ' | '';
  } = {
    numeroEnvoyant: '',
    pays: '',
    indicatif: '',
    optionRetrait: '',
    codeRetrait: '',
    optionDeTransaction: ''
  };

  caisseChoisie = '';

  file: File | null = null;
  showConfirm = false;
  userId = 0;
  userInfo = '';
  isGuestMode = false;
  guestNom = '';
  guestPrenom = '';
  submitting = false;
  filePreview: string | null = null;
  showGuestNameFields = false;
  showCountdown = false;
  countdownSeconds = 180;
  private countdownInterval: any = null;

  get countdownDisplay(): string {
    const m = Math.floor(this.countdownSeconds / 60);
    const s = this.countdownSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  transactionOptionsDisponibles: Opt[] = [];

  /** Caisses par plateforme — chargées depuis la config centralisée */
  readonly platformCaisses = PLATFORM_CAISSES;

  paysOptions = [
    { nom: 'Burkina Faso', indicatif: '+226' },
    { nom: "Côte d'Ivoire", indicatif: '+225' },
    { nom: 'Togo', indicatif: '+228' },
    { nom: 'Bénin', indicatif: '+229' },
    { nom: 'Mali', indicatif: '+223' },
    { nom: 'Niger', indicatif: '+227' }
  ];

  constructor(
    private auth: AuthService,
    private retraitService: RetraitService,
    private errorService: ErrorService
  ) {
    const allPlatforms: Opt[] = [
      { label: '1XBET',     value: '1XBET' },
      { label: 'BETWINNER', value: 'BETWINNER' },
      { label: 'MELBET',    value: 'MELBET' },
      { label: '888STARZ',  value: '888STARZ' }
    ];

    const user = this.auth.getUser();
    if (!user) {
      this.isGuestMode = true;
      this.transactionOptionsDisponibles = allPlatforms;
      return;
    }
    this.userId = user.idUtilisateur;
    this.userInfo = `${user.prenomUtilisateur || ''} ${user.nomUtilisateur || ''}`.trim();
    this.transactionOptionsDisponibles = allPlatforms;
  }

  getCaissesForPlatform(): PlatformRef[] {
    return this.platformCaisses[this.form.optionDeTransaction] ?? [];
  }

  onPlatformChange(): void {
    this.caisseChoisie = '';
  }

  buildCaisseKey(ref: PlatformRef): string {
    return buildCaisseKey(ref);
  }

  onFileSelected(event: any) {
    const f: File | undefined = event?.target?.files?.[0];
    if (!f) {
      this.file = null;
      this.filePreview = null;
      return;
    }

    if (!f.type.startsWith('image/')) {
      this.errorService.info('Veuillez choisir une image (PNG, JPG, JPEG, WebP).');
      event.target.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.errorService.info('Fichier trop volumineux (maximum 5 Mo).');
      event.target.value = '';
      return;
    }

    this.file = f;

    const reader = new FileReader();
    reader.onload = () => (this.filePreview = reader.result as string);
    reader.readAsDataURL(f);
  }

  onPaysChange() {
    const selected = this.paysOptions.find(p => p.nom === this.form.pays);
    this.form.indicatif = selected?.indicatif || '';
  }

  removeFile() {
    this.file = null;
    this.filePreview = null;
  }

  requestSubmit(): void {
    const err = this.validate();
    if (err) {
      this.errorService.info(err);
      return;
    }
    this.showConfirm = true;
  }

  cancelConfirm(): void {
    this.showConfirm = false;
  }

  private validate(): string | null {
    if (!this.form.pays) return 'Veuillez sélectionner un pays.';
    if (!this.form.indicatif) return "L\'indicatif n\'est pas défini.";
    if (!this.form.numeroEnvoyant || this.form.numeroEnvoyant.replace(/\D/g, '').length < 8) {
      return 'Numéro de téléphone incomplet.';
    }
    if (!this.form.optionDeTransaction) return 'Veuillez choisir une plateforme.';
    if (!this.caisseChoisie) return 'Veuillez choisir une caisse.';
    if (!this.form.optionRetrait) return 'Veuillez choisir une option de retrait.';
    if (!this.form.codeRetrait && !this.file) return 'Veuillez fournir le code de retrait ou une capture d\'écran.';
    return null;
  }

  async submitRetrait() {
    const err = this.validate();
    if (err) {
      this.errorService.info(err);
      return;
    }

    this.submitting = true;

    try {
      const numeroComplet = `${this.form.indicatif}${this.form.numeroEnvoyant}`;
      const fd = new FormData();

      fd.append('pays', this.form.pays);
      fd.append('optionRetrait', this.form.optionRetrait);
      fd.append('optionDeTransaction', this.form.optionDeTransaction);
      fd.append('dateRetrait', new Date().toISOString());
      // Encode la caisse dans codeRetrait (champ existant supporté par le backend)
      const baseCode = this.form.codeRetrait?.trim() ?? '';
      const encodedCode = baseCode
        ? `${baseCode}||REF||${this.caisseChoisie}`
        : `||REF||${this.caisseChoisie}`;
      fd.append('codeRetrait', encodedCode);
      if (this.file) fd.append('capture', this.file);

      if (this.isGuestMode) {
        fd.append('numeroInvite', numeroComplet);
        if (this.guestNom.trim()) fd.append('nomInvite', this.guestNom.trim());
        if (this.guestPrenom.trim()) fd.append('prenomInvite', this.guestPrenom.trim());
        await firstValueFrom(this.retraitService.createInvite(fd));
      } else {
        fd.append('numeroEnvoyant', numeroComplet);
        await firstValueFrom(this.retraitService.create(this.userId, fd));
      }

      this.errorService.success('Retrait soumis avec succès !');
      this.showConfirm = false;
      this.resetForm();
      if (this.isGuestMode) { this.startCountdown(); }
    } catch (error: any) {
      this.errorService.handle(error, 'retrait');
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
      optionDeTransaction: ''
    };
    this.caisseChoisie = '';
    this.file = null;
    this.filePreview = null;
    this.guestNom = '';
    this.guestPrenom = '';
    ['file-camera', 'file-gallery'].forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = '';
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
      S: 'assets/images/SankMoney.png',
      C: 'assets/images/CarteBancaire.png'
    };
    return logos[option] || '';
  }

  isSubmitDisabled(): boolean {
    const base = !this.form.pays
      || !this.form.numeroEnvoyant
      || !this.form.indicatif
      || !this.form.optionDeTransaction
      || !this.caisseChoisie
      || !this.form.optionRetrait
      || (!this.form.codeRetrait && !this.file)
      || this.submitting;

    return base || (!this.isGuestMode && !this.userId);
  }

  private startCountdown() {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); }
    this.countdownSeconds = 180;
    this.showCountdown = true;
    this.countdownInterval = setInterval(() => {
      if (this.countdownSeconds > 0) {
        this.countdownSeconds--;
      } else {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); }
  }
}
